import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateObject } from 'ai';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Allow responses to take up to 60 seconds
export const maxDuration = 60;

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
}

// Zod Schema for the final response structure expected by the frontend
const finalResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal dengan format 'Pasal [nomor]'"),
        content: z.string().describe("Isi mentah dari pasal tersebut, harus persis seperti di UU."),
        penjelasan: z.string().describe("Penjelasan resmi dari pasal tersebut.").optional(),
    })).describe("Daftar pasal yang paling relevan, maksimal 3."),
    summary: z.string().describe("Ringkasan jawaban yang jelas untuk pengguna, termasuk sanksi jika relevan."),
});

// Zod Schema for the intermediate LLM selection step
const llmSelectionSchema = z.object({
    relevant_articles: z.array(z.object({
        id: z.string().describe("The exact ID of the most relevant article, e.g., 'Pasal 2' or 'Pasal 362'."),
        reason: z.string().describe("A brief reason why this article was chosen.")
    })).describe("An array of the top 1-3 most relevant article IDs from the context. If the query is irrelevant, this should be an empty array."),
    summary: z.string().describe("A comprehensive summary answering the user's question based on the selected relevant articles. If the query is irrelevant, state that you cannot answer questions on that topic."),
    is_direct_query: z.boolean().describe("Set to true ONLY if the user explicitly asks for a specific article number (e.g., 'isi pasal 5')."),
});


export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // --- Filter out empty messages to prevent errors ---
        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');
        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const query = filteredMessages[filteredMessages.length - 1].content;

        // --- Generate embedding once for reuse ---
        const { embedding } = await embed({
            model: google.textEmbeddingModel("text-embedding-004"),
            value: query,
        });
        
        // --- Step 1: Hybrid Search (Dense + Sparse) in Parallel ---
        const [denseResults, sparseResults] = await Promise.all([
            // Dense search with Pinecone
            (async () => {
                return index.query({
                    vector: embedding,
                    topK: 5,
                    includeMetadata: true,
                });
            })(),
            // Sparse search with Elasticsearch
            (async () => {
                try {
                    const esQueryRes = await axios.post("https://search.litsindonesia.com/kuhp_bm25/_search", {
                        size: 5,
                        query: {
                            match: {
                                content: query
                            }
                        }
                    });
                    return esQueryRes.data.hits.hits;
                } catch (err) {
                    console.error("Elasticsearch query failed:", err);
                    return []; // Return empty array on failure
                }
            })()
        ]);

        // --- Step 2: Prepare Combined Context for LLM ---
        const pineconeContext = denseResults.matches.map(match => ({
            id: match.metadata?.pasal || 'Unknown ID',
            content: match.metadata?.content || '',
            score: match.score,
            source: 'dense'
        }));

        const elasticContext = sparseResults.map((hit: any) => ({
            id: hit._source.pasal,
            content: hit._source.content,
            score: hit._score,
            source: 'sparse'
        }));

        const combinedContext = [...pineconeContext, ...elasticContext];
        const contextString = JSON.stringify(combinedContext, null, 2);

        // --- Step 3: LLM Re-ranking and Selection ---
        const selectionPrompt = `
# ROLE & GOAL
You are a highly intelligent legal AI assistant specializing in Indonesia's UU Nomor 1 Tahun 2023 (KUHP). Your goal is to analyze search results, identify the most relevant legal article(s), and provide a clear, accurate summary for the user.

# INSTRUCTIONS
1.  **Analyze Context**: Review the \`COMBINED_CONTEXT\` which contains articles from both vector (dense) and keyword (sparse) searches.
2.  **Identify Relevance**: Determine the top 1-3 articles from the context that BEST answer the \`USER_QUERY\`. Pay close attention to the query's specific keywords and intent.
3.  **Handle Direct Queries**: If the \`USER_QUERY\` explicitly asks for a specific article number (e.g., "isi pasal 2", "pasal 362 tentang apa"), this is a **direct query**.
    * Set \`is_direct_query\` to \`true\`.
    * Your primary choice for \`relevant_articles\` MUST be that specific article ID. IGNORE the context if it doesn't contain the requested article.
4.  **Handle Irrelevant Queries**: If the \`USER_QUERY\` is unrelated to Indonesian law (e.g., "what is the weather?", "who is the president?"), or if NONE of the context articles are relevant:
    * Return an empty array for \`relevant_articles\`.
    * Write a polite summary explaining that you can only answer questions about the Indonesian Criminal Code.
5.  **Generate Summary**: Create a concise, helpful \`summary\` that directly answers the user's question, based on the article(s) you selected.
6.  **Output Format**: You MUST return a single, valid JSON object matching the required schema. DO NOT add any other text or markdown.

# COMBINED CONTEXT
${contextString}

# USER QUERY
"${query}"
`;

        const llmSelection = await generateObject({
            model: google("gemini-2.0-flash"),
            prompt: selectionPrompt,
            schema: llmSelectionSchema,
        });

        const { relevant_articles, summary } = llmSelection.object;

        // --- Step 4: Handle Irrelevant/No-Result Case ---
        if (!relevant_articles || relevant_articles.length === 0) {
            return NextResponse.json({
                articles: [],
                summary: summary || "Maaf, saya tidak dapat menemukan informasi yang relevan dengan pertanyaan Anda. Saya hanya dapat menjawab pertanyaan seputar Kitab Undang-Undang Hukum Pidana (KUHP) Indonesia."
            }, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // --- Step 5: Final Authoritative Fetch from Pinecone ---
        const finalArticleIDs = relevant_articles.map(article => article.id);
        
        // Fetching full data using the IDs identified by the LLM
        // We query with a metadata filter to get the exact articles.
        const finalResults = await index.query({
            vector: embedding,
            topK: 3, // Fetch up to 3 articles
            filter: {
                "pasal": { "$in": finalArticleIDs }
            },
            includeMetadata: true,
        });
        
        // --- Step 6: Assemble the Final Response for the Frontend ---
        const finalArticles = finalResults.matches.map(match => ({
            id: (match.metadata?.pasal as string || '').replace(/ Undang-Undang Nomor 1 Tahun 2023/i, "").trim(),
            content: match.metadata?.content as string || '',
            penjelasan: match.metadata?.penjelasan as string || '',
        }));

        const finalResponse: z.infer<typeof finalResponseSchema> = {
            articles: finalArticles,
            summary: summary,
        };

        return NextResponse.json(finalResponse, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);
        // Provide a structured error response
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json(
            { error: 'An internal server error occurred.', details: errorMessage },
            { status: 500 }
        );
    }
}
