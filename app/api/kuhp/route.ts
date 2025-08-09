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
        const { embedding } = await embed({ model: google.textEmbeddingModel("text-embedding-004"), value: query });
        const denseResults = await index.query({ vector: embedding, topK: type === 'pro' ? 5 : 10, includeMetadata: true });

        const isPhrase = query.trim().includes(' ');
        const esQuery = { query: { [isPhrase ? 'match_phrase' : 'match']: { content: query } }, size: type === 'pro' ? 500 : 10 };

        let sparseResults: any[] = [];
        try {
            const esRes = await axios.post("https://search.litsindonesia.com/kuhp_merged/_search", esQuery);
            sparseResults = esRes.data.hits.hits;
        } catch (err) { console.error("[DEBUG] Elasticsearch query failed:", err); }

        // Combine and create a unique context for the LLM
        const contextForLlm = [
            ...denseResults.matches.map(m => ({ id: m.id, content: m.metadata?.content || '' })),
            ...sparseResults.map(h => ({ id: h._source.pasal, content: `${h._source.pasal}: ${h._source.content}` }))
        ];
        const uniqueContext = Array.from(new Map(contextForLlm.map(item => [item.id, item])).values());
        const contextString = uniqueContext.map(c => `ID: ${c.id}\nContent: ${c.content}\n---`).join('\n\n');

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
1.  **CEK PERMINTAAN LANGSUNG (PALING PENTING!)**: Pertama, periksa apakah pengguna meminta isi pasal tertentu secara langsung. Ini bisa untuk satu atau LEBIH pasal (contoh: "jelaskan pasal 480 dan 481", "isi KUHP nomor 5 dan 10").
    * **JIKA YA**: Setel \`is_direct_request\` ke \`true\`. Ekstrak SEMUA nomor pasal yang diminta dan letakkan dalam format 'Pasal [nomor]' di array \`direct_pasal_ids\`. Biarkan \`articles\` kosong. Buat ringkasan seperti "Tentu, berikut adalah isi dari pasal yang Anda minta:".
    * **JIKA TIDAK**: Lanjutkan ke alur kerja normal. Setel \`is_direct_request\` ke \`false\` dan \`direct_pasal_ids\` biarkan kosong.
2.  **Alur Kerja Normal (Untuk Pertanyaan Natural)**:
    * **IDENTIFIKASI PASAL RELEVAN**: Dari konteks, pilih semua pasal yang paling penting dan relevan yang menjawab pertanyaan pengguna. Masukkan ID-nya ke \`articles\`. Jika tidak ada yang relevan sama sekali, kembalikan array \`articles\` yang kosong.
    * **BUAT RINGKASAN KOMPREHENSIF**: Tuliskan ringkasan jawaban yang lengkap, jelas, dan langsung dengan bahasa sederhana. Jelaskan konsep hukumnya dan sebutkan secara eksplisit pasal-pasal dari array \`articles\` yang menjadi dasar jawaban Anda. Jika \`articles\` kosong, jelaskan bahwa tidak ditemukan pasal yang sesuai.
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
            // Your original grounding logic for 'pro'
            const llmArticleIds = new Set(llmResponse.articles.map(a => a.id));
            const sparseArticles = sparseResults.map(h => ({ id: h._source.pasal, score: h._score }));
            const totalRelevantCount = new Set(sparseArticles.map(a => a.id)).size;
            const prioritizedArticles = sparseArticles.sort((a, b) => {
                const aIsLlmChoice = llmArticleIds.has(a.id);
                const bIsLlmChoice = llmArticleIds.has(b.id);
                if (aIsLlmChoice && !bIsLlmChoice) return -1;
                if (!aIsLlmChoice && bIsLlmChoice) return 1;
                return (b.score ?? 0) - (a.score ?? 0);
            });
            const combinedIds = prioritizedArticles.map(a => a.id);

            let articlesForResponse: z.infer<typeof finalResponseSchema>['articles'] = [];
            if (combinedIds.length > 0) {
                const fetchResponse = await index.fetch(combinedIds);
                const fetchedRecords = fetchResponse.records ?? {};
                const sparseScoreMap = new Map(prioritizedArticles.map(p => [p.id, p.score]));
                articlesForResponse = combinedIds.map(id => {
                    const vec = fetchedRecords[id];
                    if (!vec) return null;
                    return { id: vec.id, content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.', penjelasan: vec.metadata?.penjelasan as string ?? '', score: sparseScoreMap.get(id) ?? 0 };
                }).filter((article): article is Exclude<typeof article, null> => article !== null);
            }
            const finalResponse = { articles: articlesForResponse, summary: llmResponse.summary, totalRelevant: totalRelevantCount };
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