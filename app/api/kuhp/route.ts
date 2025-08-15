import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateObject } from 'ai';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import https from 'https';

// Allow responses to take up to 60 seconds
export const maxDuration = 60;

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
}

// ========== SCHEMAS (REVISED) ==========

// --- Internal Schema for the LLM ---
// This single schema now supports both modes and multiple direct article requests.
const llmResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal yang relevan, format 'Pasal [nomor]'."),
    })).describe("Daftar pasal yang relevan dengan pertanyaan konseptual pengguna."),
    summary: z.string().describe("Jawaban ringkas dan langsung untuk pertanyaan pengguna."),
    is_irrelevant: z.boolean().describe("Setel ke true HANYA jika pertanyaan sama sekali tidak berhubungan dengan hukum."),
    is_direct_request: z.boolean().describe("Setel ke true jika pengguna secara spesifik meminta isi dari satu atau lebih pasal."),
    direct_pasal_ids: z.array(z.string()).optional().describe("Jika is_direct_request true, isi dengan SEMUA ID pasal yang diminta. Contoh: ['Pasal 5', 'Pasal 10'].")
});

// Final response schema matching the frontend's expectation
const finalResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string(),
        content: z.string(),
        penjelasan: z.string().optional(),
        score: z.number().optional().describe("The relevance score from the search."),
    })),
    summary: z.string(),
    totalRelevant: z.number().optional().describe("The total count of unique relevant articles found from dense and sparse searches."),
});


// ========== MAIN POST HANDLER (REVISED) ==========

export async function POST(req: Request) {
    try {
        const { messages, type = 'public' } = await req.json();

        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');
        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const query = filteredMessages[filteredMessages.length - 1]?.content || '';
        if (!query) {
            return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
        }

        console.log(`[DEBUG] Received query: "${query}" for type: "${type}"`);

        // --- 1. Hybrid Retrieval Step (Common for both modes) ---
        let denseResults: { matches: any[] } = { matches: [] }; // Default value
        try {
            const { embedding } = await embed({ model: google.textEmbeddingModel("text-embedding-004"), value: query });
            denseResults = await index.query({ vector: embedding, topK: 10, includeMetadata: true });
        } catch (err) {
            console.warn("[WARN] Pinecone query failed, proceeding with sparse search results only.", err);
        }
        
        // Truncate content for cleaner logs
        const truncatedDense = denseResults.matches.map(m => ({
            ...m,
            metadata: {
                ...m.metadata,
                content: typeof m.metadata?.content === 'string'
                    ? `${m.metadata.content.substring(0, 100)}...`
                    : String(m.metadata?.content)
            }
        }));
        console.log('[DEBUG] Dense search results:', JSON.stringify(truncatedDense, null, 2));


        const esQuery = { query: { match: { content: query } }, size: 10 };

        let sparseResults: any[] = [];
        try {
            // This agent is needed to bypass SSL verification, like curl's -k flag
            const httpsAgent = new https.Agent({
              rejectUnauthorized: false,
            });

            const esRes = await axios.post(
              "https://nozomi.proxy.rlwy.net:44468/kuhp_merged/_search", // Your new Railway Proxy URL
              esQuery, 
              {
                timeout: 5000,
                // Add authentication with your username and password
                auth: {
                  username: "elastic",
                  password: "MySecureP@ssw0rd!2025" // Use the password from your successful curl command
                },
                httpsAgent, // Use the agent to handle the proxy's SSL
              }
            );
            sparseResults = esRes.data.hits.hits;
        } catch (err) { console.error("[DEBUG] Elasticsearch query failed:", err); }
        // Truncate content for cleaner logs
        const truncatedSparse = sparseResults.map(h => ({ ...h, _source: { ...h._source, content: `${h._source?.content?.substring(0, 100)}...` } }));
        console.log('[DEBUG] Sparse search results:', JSON.stringify(truncatedSparse, null, 2));

        // Combine and create a unique context for the LLM
        const sparseForLlm = sparseResults.slice(0, 10);
        const contextForLlm = [
            ...denseResults.matches.map(m => ({ id: m.id, content: m.metadata?.content || '' })),
            ...sparseForLlm.map(h => ({ id: h._source.pasal, content: `${h._source.pasal}: ${h._source.content}` }))
        ];
        const uniqueContext = Array.from(new Map(contextForLlm.map(item => [item.id, item])).values());
        // Truncate content for cleaner logs
        const truncatedUniqueContext = uniqueContext.map(item => ({
            ...item,
            content: `${String(item.content).substring(0, 150)}...`
        }));
        console.log('[DEBUG] Combined and unique context for LLM:', JSON.stringify(truncatedUniqueContext, null, 2));

        const contextString = uniqueContext.map(c => `ID: ${c.id}\nContent: ${c.content}\n---`).join('\n\n');
        
        // If both Pinecone and Elasticsearch return no results, return a specific message early.
        if (uniqueContext.length === 0) {
            console.log("[DEBUG] No context found from any retrieval source. Returning early.");
            return NextResponse.json({
                articles: [],
                summary: "Maaf, terjadi kendala saat mencari data atau tidak ada pasal yang relevan dengan pencarian Anda. Mohon coba lagi dengan kata kunci yang berbeda."
            });
        }
        // --- 2. LLM Processing Step (Select prompt based on type) ---
        const proSystemPrompt = `
# PERAN & TUJUAN
Anda adalah Asisten Hukum AI yang ahli dalam UU No. 1 Tahun 2023. Tugas Anda adalah menganalisis pertanyaan pengguna dan konteks untuk memberikan jawaban yang akurat.
# ALUR KERJA
1.  **CEK PERMINTAAN LANGSUNG (PALING PENTING!)**: Pertama, periksa apakah pengguna meminta isi pasal tertentu secara langsung. Permintaan ini bisa untuk satu atau LEBIH pasal (contoh: "jelaskan pasal 480 dan 481", "isi KUHP nomor 5 dan 10").
    * **JIKA YA**: Setel \`is_direct_request\` ke \`true\`. Ekstrak SEMUA nomor pasal yang diminta dan letakkan dalam format 'Pasal [nomor]' di array \`direct_pasal_ids\`. **ABAIKAN KONTEKS PENCARIAN**. Biarkan \`articles\` kosong. Buat ringkasan umum seperti "Berikut adalah isi dari pasal yang Anda minta."
    * **JIKA TIDAK**: Lanjutkan ke alur kerja normal. Setel \`is_direct_request\` ke \`false\` dan \`direct_pasal_ids\` biarkan kosong.
2.  **Alur Kerja Normal (Untuk Pertanyaan Konsep Umum)**:
    * \`Identifikasi Pasal Relevan (LOGIKA BERTINGKAT)\`:
        1.  **Prioritas #1: Kecocokan Kata Kunci Langsung (Literal Match)**: Periksa apakah kata kunci dari pertanyaan pengguna muncul **persis sama** di dalam \`content\` dari konteks. Jika ya, **WAJIB masukkan ID pasal tersebut** ke \`articles\`.
        2.  **Prioritas #2: Kecocokan Konseptual (Conceptual Match)**: Setelah itu, cari pasal yang relevan secara **konsep**.
        3.  **Aturan Final**: Gabungkan hasil, maksimal 5 pasal. **JANGAN PERNAH MENGEMBALIKAN ARRAY \`articles\` YANG KOSONG** jika ada konteks yang relevan.
    * **Cek Relevansi**: Setel \`is_irrelevant\` ke \`true\` HANYA JIKA pertanyaan DAN konteks sama sekali tidak berhubungan dengan hukum.
    * **Buat Ringkasan**: Buat ringkasan HANYA berdasarkan pasal-pasal di array \`articles\`.
# ATURAN KETAT
- **Prioritaskan Permintaan Langsung**.
- **Output WAJIB JSON**.
- **ID Pasal**: Format "Pasal [nomor]".
- **Maksimal 5 Pasal**: Untuk alur kerja normal.
- **KONSISTENSI WAJIB**: Pasal yang disebut di \`summary\` WAJIB ada di \`articles\`.
# CONTOH & FORMAT OUTPUT
---
**Contoh 1: Pertanyaan Konseptual Umum**
Pertanyaan Pengguna: "hukuman menyebar berita bohong"
Output JSON: { "articles": [{ "id": "Pasal 263" }, { "id": "Pasal 264" }], "summary": "Menyebarkan berita bohong dapat dikenai sanksi...", "is_irrelevant": false, "is_direct_request": false, "direct_pasal_ids": [] }
---
**Contoh 2: Permintaan Beberapa Pasal Langsung**
Pertanyaan Pengguna: "apa isi pasal 378 dan pasal 480"
Output JSON: { "articles": [], "summary": "Berikut adalah isi dari pasal yang Anda minta.", "is_irrelevant": false, "is_direct_request": true, "direct_pasal_ids": ["Pasal 378", "Pasal 480"] }
---
# KONTEKS PENCARIAN
${contextString}
# TUGAS ANDA
Berdasarkan pertanyaan pengguna di bawah dan konteks di atas, hasilkan objek JSON.
Pertanyaan Pengguna: "${query}"`;

        const publicSystemPrompt = `
# PERAN & TUJUAN
Anda adalah Asisten Hukum AI yang ramah dan ahli dalam KUHP (UU No. 1 Tahun 2023) untuk masyarakat umum.
# ALUR KERJA
1.  **Analisis Jenis Pertanyaan (PALING PENTING!)**:
    * **Apakah ini Permintaan Langsung?** Cek apakah pengguna meminta pasal **spesifik dengan menyebutkan NOMORnya**. Contoh: "jelaskan pasal 480", "isi KUHP 5 dan 10". JIKA YA, setel \`is_direct_request\` ke \`true\`, ekstrak nomornya ke \`direct_pasal_ids\`, dan gunakan ringkasan "Tentu, berikut adalah isi dari pasal yang Anda minta:".
    * **Apakah ini Pertanyaan Konseptual?** Jika pengguna bertanya tentang sebuah topik tanpa menyebut nomor pasal (contoh: "hukuman pencurian", "apa itu makar?"), ini **BUKAN** permintaan langsung. JIKA YA, setel \`is_direct_request\` ke \`false\` dan lanjutkan ke Alur Kerja Normal.
2.  **Alur Kerja Normal (Untuk Pertanyaan Natural)**:
    * **IDENTIFIKASI PASAL RELEVAN**: Dari KONTEKS PENCARIAN, pilih 3-5 pasal yang paling relevan. **ANDA WAJIB MEMASUKKAN ID PASAL-PASAL INI** ke dalam array \`articles\`. Jangan biarkan array ini kosong jika Anda menemukan konteks yang relevan.
    * **BUAT RINGKASAN KONSEP**: Berdasarkan pasal yang Anda pilih di \`articles\`, tulis ringkasan yang menjelaskan konsep hukumnya dalam bahasa sederhana. **WAJIB sebutkan secara eksplisit nomor pasal** tersebut di dalam ringkasan Anda (contoh: "Menurut Pasal 476, ...").
    * **CEK RELEVANSI**: Setel \`is_irrelevant\` ke \`true\` HANYA JIKA pertanyaan sama sekali tidak berhubungan dengan hukum.
# ATURAN KETAT
- **Prioritaskan Permintaan Langsung**.
- **JAWABAN LANGSUNG & JELAS**: Selalu berikan jawaban tuntas.
- **KONSISTENSI WAJIB**: Pasal yang disebut di \`summary\` WAJIB ada di \`articles\`.
# CONTOH & FORMAT OUTPUT
---
**Contoh 1: Pertanyaan Natural**
Pertanyaan Pengguna: "apa hukuman mencuri ayam"
Output JSON: { "articles": [{ "id": "Pasal 362" }], "summary": "Mencuri ayam, sama seperti pencurian lainnya, diatur dalam Pasal 362 KUHP tentang Pencurian...", "is_irrelevant": false, "is_direct_request": false, "direct_pasal_ids": [] }
---
**Contoh 2: Permintaan Beberapa Pasal Langsung**
Pertanyaan Pengguna: "isi pasal 5 dan 10"
Output JSON: { "articles": [], "summary": "Tentu, berikut adalah isi dari pasal yang Anda minta:", "is_irrelevant": false, "is_direct_request": true, "direct_pasal_ids": ["Pasal 5", "Pasal 10"] }
---
# KONTEKS PENCARIAN
${contextString}
# TUGAS ANDA
Berdasarkan pertanyaan pengguna di bawah dan konteks di atas, hasilkan objek JSON.
Pertanyaan Pengguna: "${query}"`;


        const { object: llmResponse } = await generateObject({
            model: google("gemini-2.0-flash"), // Per your instruction to use the same model
            prompt: type === 'pro' ? proSystemPrompt : publicSystemPrompt,
            schema: llmResponseSchema,
        });

        console.log(`[DEBUG] LLM Response (${type}):`, llmResponse);

        // --- 3. Response Handling (Common for both modes) ---

        // a) Direct Request Handling (Now handles multiple IDs)
        if (llmResponse.is_direct_request && llmResponse.direct_pasal_ids && llmResponse.direct_pasal_ids.length > 0) {
            console.log(`[DEBUG] Query identified as a direct request for: ${llmResponse.direct_pasal_ids.join(', ')}`);
            const fetchResponse = await index.fetch(llmResponse.direct_pasal_ids);
            const articlesForResponse = Object.values(fetchResponse.records ?? {}).map(vec => ({
                id: vec.id,
                content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
                penjelasan: vec.metadata?.penjelasan as string ?? '',
            }));
            const finalResponse = { articles: articlesForResponse, summary: llmResponse.summary };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // b) Irrelevancy Handling
        if (llmResponse.is_irrelevant) {
            console.log("[DEBUG] Query identified as irrelevant.");
            const irrelevantResponse = { articles: [], summary: "Maaf, saya hanya dapat menjawab pertanyaan yang berkaitan dengan Kitab Undang-Undang Hukum Pidana (UU No. 1 Tahun 2023)." };
            return NextResponse.json(irrelevantResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // --- 4. Final Grounding & Formatting ---
        if (type === 'pro') {
            // Pro Flow: Combine LLM selection with a new, more precise "exact match" search.
            console.log('[DEBUG] Starting PRO flow: Combining LLM selection with a new exact match search.');

            // a) Get the article IDs selected by the LLM from the initial context.
            const llmArticleIds = llmResponse.articles.map(a => a.id);
            console.log(`[DEBUG] PRO LLM selected IDs:`, llmArticleIds);

            // b) Perform a second, more precise "exact match" (match_phrase) search on Elasticsearch.
            const exactMatchEsQuery = { query: { match_phrase: { content: query } }, size: 100 };
            let exactMatchResults: any[] = [];
            try {
                const httpsAgent = new https.Agent({ rejectUnauthorized: false });
                const esRes = await axios.post(
                    "https://nozomi.proxy.rlwy.net:44468/kuhp_merged/_search",
                    exactMatchEsQuery,
                    {
                        timeout: 5000,
                        auth: { username: "elastic", password: "MySecureP@ssw0rd!2025" },
                        httpsAgent,
                    }
                );
                exactMatchResults = esRes.data.hits.hits;
                console.log(`[DEBUG] PRO Exact match search found ${exactMatchResults.length} results.`);
            } catch (err) {
                console.error("[DEBUG] PRO flow Elasticsearch exact match query failed:", err);
            }
            const exactMatchIds = exactMatchResults.map(h => h._source.pasal);

            // c) Combine IDs from the LLM selection and the exact match search, ensuring they are unique.
            const combinedIds = [...new Set([...llmArticleIds, ...exactMatchIds])];
            console.log(`[DEBUG] PRO Combined unique IDs for fetching:`, combinedIds);

            // d) Fetch the full data for the combined article IDs.
            let articlesForResponse: z.infer<typeof finalResponseSchema>['articles'] = [];
            if (combinedIds.length > 0) {
                const fetchResponse = await index.fetch(combinedIds);
                const fetchedRecords = fetchResponse.records ?? {};

                // Create a map of scores from the exact match results to add them to the final output
                const exactMatchScoreMap = new Map(exactMatchResults.map(h => [h._source.pasal, h._score]));

                articlesForResponse = combinedIds.map(id => {
                    const vec = fetchedRecords[id];
                    if (!vec) return null;
                    return {
                        id: vec.id,
                        content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
                        penjelasan: vec.metadata?.penjelasan as string ?? '',
                        score: exactMatchScoreMap.get(id) // Assign score if it came from the exact match search
                    };
                }).filter((article): article is Exclude<typeof article, null> => article !== null);
            }

            // e) Assemble the final response.
            const finalResponse = { articles: articlesForResponse, summary: llmResponse.summary, totalRelevant: combinedIds.length };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });

        } else { // 'public' flow
            const articleIds = llmResponse.articles.map(a => a.id);
            let articlesForResponse: z.infer<typeof finalResponseSchema>['articles'] = [];

            if (articleIds.length > 0) {
                const fetchResponse = await index.fetch(articleIds);
                const fetchedRecords = fetchResponse.records ?? {};
                articlesForResponse = articleIds.map(id => {
                    const vec = fetchedRecords[id];
                    if (!vec) return null;
                    return { id: vec.id, content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.', penjelasan: vec.metadata?.penjelasan as string ?? '' };
                }).filter((article): article is Exclude<typeof article, null> => article !== null);
            }
            const finalResponse = { articles: articlesForResponse, summary: llmResponse.summary };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }
    } catch (error) {
        console.error('[FATAL] Error processing request:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}