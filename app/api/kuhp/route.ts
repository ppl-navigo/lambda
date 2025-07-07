import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateText } from 'ai'; // Changed generateObject to generateText
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
        id: z.string().describe("Nomor pasal, e.g., 'Pasal 476'"),
        content: z.string().describe("Isi mentah dari pasal tersebut."),
        penjelasan: z.string().describe("Penjelasan resmi dari pasal tersebut.").optional(),
    })),
    summary: z.string().describe("Ringkasan jawaban yang jelas untuk pengguna."),
});

// Zod Schema for the intermediate LLM selection step
const llmSelectionSchema = z.object({
    relevant_articles: z.array(z.object({
        id: z.string().describe("ID pasal yang paling relevan dari konteks, format 'Pasal [nomor]'."),
    })).describe("Array berisi 1-3 ID pasal yang paling relevan. HARUS KOSONG jika pertanyaan tidak relevan."),
    summary: z.string().describe("Ringkasan jawaban untuk pengguna berdasarkan pasal yang dipilih. Jika tidak relevan, berikan pesan penolakan."),
    is_direct_query: z.boolean().describe("Bernilai true HANYA jika pengguna bertanya spesifik tentang nomor pasal."),
});


export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

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
            index.query({
                vector: embedding,
                topK: 5,
                includeMetadata: true,
            }),
            (async () => {
                try {
                    const esQueryRes = await axios.post("[https://search.litsindonesia.com/kuhp_bm25/_search](https://search.litsindonesia.com/kuhp_bm25/_search)", {
                        size: 5,
                        query: { match: { content: query } }
                    });
                    return esQueryRes.data.hits.hits;
                } catch (err) {
                    console.error("Elasticsearch query failed:", err);
                    return [];
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
        const contextString = JSON.stringify([...pineconeContext, ...elasticContext], null, 2);

        // --- Step 3: LLM Re-ranking and Selection (Indonesian Prompt) ---
        const selectionPrompt = `
# PERAN & TUJUAN
Anda adalah asisten hukum AI ahli dalam Kitab Undang-Undang Hukum Pidana (KUHP) Indonesia (UU Nomor 1 Tahun 2023). Tugas Anda adalah menganalisis hasil pencarian, mengidentifikasi pasal yang paling relevan, dan memberikan ringkasan yang akurat kepada pengguna.

# INSTRUKSI
1.  **Analisis Konteks**: Tinjau \`KONTEKS_GABUNGAN\` yang berisi pasal-pasal dari pencarian.
2.  **Identifikasi Relevansi**: Tentukan 1 hingga 3 pasal dari konteks yang PALING TEPAT menjawab \`PERTANYAAN_PENGGUNA\`.
3.  **Tangani Pertanyaan Langsung**: Jika pengguna bertanya spesifik nomor pasal (misal: "isi pasal 2", "pasal 362 tentang apa"), ini adalah **pertanyaan langsung**.
    * Atur \`is_direct_query\` menjadi \`true\`.
    * Pilihan utama Anda untuk \`relevant_articles\` HARUS ID pasal yang diminta. ABAIKAN konteks jika tidak memuat pasal yang diminta. Pilih hanya SATU pasal.
4.  **Tangani Pertanyaan Tidak Relevan**: Jika pertanyaan sama sekali tidak berhubungan dengan hukum pidana Indonesia (misal: "apa cuaca hari ini?"), atau JIKA TIDAK ADA pasal dalam konteks yang relevan:
    * Kembalikan array kosong untuk \`relevant_articles\`.
    * Tulis ringkasan sopan yang menjelaskan Anda hanya bisa menjawab pertanyaan seputar KUHP.
5.  **Buat Ringkasan**: Buat \`summary\` yang ringkas dan bermanfaat, menjawab langsung pertanyaan pengguna berdasarkan pasal yang Anda pilih.
6.  **SANGAT PENTING: FORMAT OUTPUT JSON**:
    * Output Anda HARUS berupa satu objek JSON yang valid dan tidak ada teks lain di luar JSON.
    * Struktur JSON harus SAMA PERSIS seperti skema di bawah ini. JANGAN mengubah nama field atau struktur.

# FORMAT OUTPUT JSON (WAJIB DIIKUTI)
\`\`\`json
{
  "relevant_articles": [
    {
      "id": "Pasal [nomor]"
    }
  ],
  "summary": "Ringkasan jawaban Anda di sini.",
  "is_direct_query": false
}
\`\`\`

# KONTEKS_GABUNGAN
${contextString}

# PERTANYAAN_PENGGUNA
"${query}"
`;

        // --- NEW: Step 3.1: Generate Raw Text from LLM ---
        const { text: rawLLMText } = await generateText({
            model: google("gemini-1.5-flash-latest"),
            prompt: selectionPrompt,
        });

        // --- NEW: Step 3.2: Sanitize and Parse LLM Response ---
        let llmSelectionObject;
        try {
            // Remove markdown fences and trim whitespace for safety
            const sanitizedText = rawLLMText
                .replace(/^```json\s*/, '')
                .replace(/\s*```$/, '')
                .trim();
            
            const parsedJson = JSON.parse(sanitizedText);
            // Validate the parsed JSON against our Zod schema
            llmSelectionObject = llmSelectionSchema.parse(parsedJson);
        } catch (parseError) {
            console.error("Failed to parse or validate LLM JSON response:", parseError);
            console.error("Raw LLM Text was:", rawLLMText);
            return NextResponse.json(
                { error: 'Gagal memproses respons dari AI. Format JSON tidak valid.' },
                { status: 502 } // 502 Bad Gateway is appropriate here
            );
        }
        
        const { relevant_articles, summary } = llmSelectionObject;

        // --- Step 4: Handle Irrelevant/No-Result Case ---
        if (!relevant_articles || relevant_articles.length === 0) {
            return NextResponse.json({
                articles: [],
                summary: summary || "Maaf, saya tidak dapat menemukan informasi yang relevan. Saya hanya bisa menjawab pertanyaan seputar KUHP.",
                _raw_llm_response: llmSelectionObject // For debugging
            });
        }

        // --- Step 5: Final Authoritative Fetch from Pinecone ---
        const finalArticleIDs = relevant_articles.map(article => article.id);
        
        const finalResults = await index.query({
            vector: embedding,
            topK: 3,
            filter: { "pasal": { "$in": finalArticleIDs } },
            includeMetadata: true,
        });
        
        // --- Step 6: Assemble the Final Response for the Frontend ---
        const finalArticles = finalResults.matches.map(match => ({
            id: (match.metadata?.pasal as string || '').replace(/ Undang-Undang Nomor 1 Tahun 2023/i, "").trim(),
            content: match.metadata?.content as string || '',
            penjelasan: match.metadata?.penjelasan as string || '',
        }));

        if (finalArticles.length === 0) {
            return NextResponse.json({
                articles: [],
                summary: summary,
                _raw_llm_response: llmSelectionObject
            });
        }

        const finalResponse: z.infer<typeof finalResponseSchema> = {
            articles: finalArticles,
            summary: summary,
        };

        return NextResponse.json({
            ...finalResponse,
            _raw_llm_response: llmSelectionObject // Include for debugging
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json(
            { error: 'An internal server error occurred.', details: errorMessage },
            { status: 500 }
        );
    }
}
