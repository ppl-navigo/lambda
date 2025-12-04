import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { search, searchExact } from '@/app/lib/search-service';

// Allow responses to take up to 60 seconds
export const maxDuration = 60;

// ========== SCHEMAS ==========

const llmResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal yang relevan, format 'Pasal [nomor]'."),
    })).describe("Daftar pasal yang relevan dengan pertanyaan konseptual pengguna."),
    summary: z.string().describe("Jawaban ringkas dan langsung untuk pertanyaan pengguna."),
    is_irrelevant: z.boolean().describe("Setel ke true HANYA jika pertanyaan sama sekali tidak berhubungan dengan hukum."),
    is_direct_request: z.boolean().describe("Setel ke true jika pengguna secara spesifik meminta isi dari satu atau lebih pasal."),
    direct_pasal_ids: z.array(z.string()).optional().describe("Jika is_direct_request true, isi dengan SEMUA ID pasal yang diminta. Contoh: ['Pasal 5', 'Pasal 10'].")
});

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

// ========== SHARED HANDLER ==========

export async function handleLegalRequest(req: Request, type: 'kuhp' | 'kuhap') {
    try {
        const { messages, type: mode = 'public' } = await req.json();

        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');
        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const query = filteredMessages[filteredMessages.length - 1]?.content || '';
        if (!query) {
            return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
        }

        console.log(`[DEBUG] Received query: "${query}" for mode: "${mode}" type: "${type}"`);

        // --- 1. Hybrid Retrieval Step ---
        let denseResults: { matches: any[] } = { matches: [] };

        // Determine namespace: KUHP uses default (''), KUHAP uses 'KUHAP'
        const namespace = type === 'kuhp' ? '' : type.toUpperCase();

        try {
            const { embedding } = await embed({ model: google.textEmbeddingModel("text-embedding-004"), value: query });
            denseResults = await index.namespace(namespace).query({ vector: embedding, topK: 10, includeMetadata: true });
        } catch (err) {
            console.warn("[WARN] Pinecone query failed, proceeding with sparse search results only.", err);
        }

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


        let sparseResults: any[] = [];
        try {
            sparseResults = search(query, type, 10);
        } catch (err) { console.error("[DEBUG] Minisearch query failed:", err); }

        const truncatedSparse = sparseResults.map(h => ({ ...h, content: `${h.content?.substring(0, 100)}...` }));
        console.log('[DEBUG] Sparse search results:', JSON.stringify(truncatedSparse, null, 2));

        // Combine context
        const sparseForLlm = sparseResults.slice(0, 10);
        const contextForLlm = [
            ...denseResults.matches.map(m => ({ id: m.id, content: m.metadata?.content || '' })),
            ...sparseForLlm.map(h => ({ id: h.id, content: `${h.id}: ${h.content}` }))
        ];
        const uniqueContext = Array.from(new Map(contextForLlm.map(item => [item.id, item])).values());

        const truncatedUniqueContext = uniqueContext.map(item => ({
            ...item,
            content: `${String(item.content).substring(0, 150)}...`
        }));
        console.log('[DEBUG] Combined and unique context for LLM:', JSON.stringify(truncatedUniqueContext, null, 2));

        const contextString = uniqueContext.map(c => `ID: ${c.id}\nContent: ${c.content}\n---`).join('\n\n');

        if (uniqueContext.length === 0) {
            console.log("[DEBUG] No context found. Returning early.");
            return NextResponse.json({
                articles: [],
                summary: `Maaf, tidak ditemukan data yang relevan dalam ${type.toUpperCase()}.`
            });
        }

        // --- 2. LLM Processing Step ---
        const lawName = type === 'kuhp' ? 'UU No. 1 Tahun 2023 (KUHP)' : 'KUHAP';

        const proSystemPrompt = `
# PERAN & TUJUAN
Anda adalah Asisten Hukum AI yang ahli dalam ${lawName}. Tugas Anda adalah menganalisis pertanyaan pengguna dan konteks untuk memberikan jawaban yang akurat.
# ALUR KERJA
1.  **CEK PERMINTAAN LANGSUNG**:
    * **JIKA YA**: Setel \`is_direct_request\` ke \`true\`. Ekstrak SEMUA nomor pasal (misal: "Pasal 1", "Pasal 123") ke dalam array \`direct_pasal_ids\` MESKIPUN teks pasal tersebut TIDAK ADA dalam KONTEKS. Sistem akan mengambilnya secara otomatis.
    * **JIKA TIDAK**: Setel \`is_direct_request\` ke \`false\`.
2.  **Alur Kerja Normal**:
    * \`Identifikasi Pasal Relevan\`: Cari kecocokan literal dan konseptual. Maksimal 5 pasal.
    * **Cek Relevansi**: Setel \`is_irrelevant\` ke \`true\` HANYA JIKA pertanyaan tidak relevan.
    * **Buat Ringkasan**: Jelaskan berdasarkan pasal yang dipilih.
# ATURAN KETAT
- **Prioritaskan Permintaan Langsung**.
- **Output WAJIB JSON**.
- **ID Pasal**: Format "Pasal [nomor]".
- **KONSISTENSI WAJIB**: Pasal yang disebut di \`summary\` WAJIB ada di \`articles\`.
# KONTEKS PENCARIAN
${contextString}
# TUGAS ANDA
Berdasarkan pertanyaan pengguna di bawah dan konteks di atas, hasilkan objek JSON.
Pertanyaan Pengguna: "${query}"`;

        const publicSystemPrompt = `
# PERAN & TUJUAN
Anda adalah Asisten Hukum AI yang ramah dan ahli dalam ${lawName} untuk masyarakat umum.
# ALUR KERJA
1.  **Analisis Jenis Pertanyaan**:
    * **Permintaan Langsung?** Jika ya, setel \`is_direct_request\` ke \`true\` dan ekstrak nomor pasal ke \`direct_pasal_ids\` MESKIPUN tidak ada dalam KONTEKS. Sistem akan mencarinya.
    * **Pertanyaan Konseptual?** Jika ya, setel \`is_direct_request\` ke \`false\`.
2.  **Alur Kerja Normal**:
    * **IDENTIFIKASI PASAL RELEVAN**: Pilih 3-5 pasal paling relevan dari KONTEKS.
    * **BUAT RINGKASAN KONSEP**: Jelaskan dalam bahasa sederhana.
    * **CEK RELEVANSI**: Setel \`is_irrelevant\` ke \`true\` jika tidak relevan.
# ATURAN KETAT
- **Prioritaskan Permintaan Langsung**.
- **JAWABAN LANGSUNG & JELAS**.
- **KONSISTENSI WAJIB**.
# KONTEKS PENCARIAN
${contextString}
# TUGAS ANDA
Berdasarkan pertanyaan pengguna di bawah dan konteks di atas, hasilkan objek JSON.
Pertanyaan Pengguna: "${query}"`;

        const { object: llmResponse } = await generateObject({
            model: google("gemini-2.0-flash"),
            prompt: mode === 'pro' ? proSystemPrompt : publicSystemPrompt,
            schema: llmResponseSchema,
        });

        console.log(`[DEBUG] LLM Response (${mode}):`, llmResponse);

        // --- 3. Response Handling ---

        // a) Direct Request Handling
        if (llmResponse.is_direct_request && llmResponse.direct_pasal_ids && llmResponse.direct_pasal_ids.length > 0) {
            console.log(`[DEBUG] Direct request for: ${llmResponse.direct_pasal_ids.join(', ')}`);
            // Namespace is already defined above
            const fetchResponse = await index.namespace(namespace).fetch(llmResponse.direct_pasal_ids);
            const articlesForResponse = Object.values(fetchResponse.records ?? {}).map(vec => ({
                id: vec.id,
                content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
                penjelasan: vec.metadata?.penjelasan as string ?? '',
            }));

            // Override summary if articles are found, as LLM might have said "not found" due to missing context
            let summary = llmResponse.summary;
            if (articlesForResponse.length > 0) {
                summary = `Berikut adalah isi ${articlesForResponse.map(a => a.id).join(', ')}:`;
            }

            const finalResponse = { articles: articlesForResponse, summary };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // b) Irrelevancy Handling
        if (llmResponse.is_irrelevant) {
            console.log("[DEBUG] Query irrelevant.");
            const irrelevantResponse = { articles: [], summary: `Maaf, saya hanya dapat menjawab pertanyaan yang berkaitan dengan ${lawName}.` };
            return NextResponse.json(irrelevantResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // --- 4. Final Grounding & Formatting ---
        if (mode === 'pro') {
            console.log('[DEBUG] Starting PRO flow');
            const llmArticleIds = llmResponse.articles.map(a => a.id);

            let exactMatchResults: any[] = [];
            try {
                exactMatchResults = searchExact(query, type, 100);
            } catch (err) {
                console.error("[DEBUG] PRO flow Minisearch exact match query failed:", err);
            }
            const exactMatchIds = exactMatchResults.map(h => h.id);

            const combinedIds = [...new Set([...llmArticleIds, ...exactMatchIds])];

            let articlesForResponse: z.infer<typeof finalResponseSchema>['articles'] = [];
            if (combinedIds.length > 0) {
                // Namespace is already defined above
                const fetchResponse = await index.namespace(namespace).fetch(combinedIds);
                const fetchedRecords = fetchResponse.records ?? {};
                const exactMatchScoreMap = new Map(exactMatchResults.map(h => [h.id, h.score]));

                articlesForResponse = combinedIds.map(id => {
                    const vec = fetchedRecords[id];
                    if (!vec) return null;
                    return {
                        id: vec.id,
                        content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
                        penjelasan: vec.metadata?.penjelasan as string ?? '',
                        score: exactMatchScoreMap.get(id)
                    };
                }).filter((article): article is Exclude<typeof article, null> => article !== null);
            }

            const finalResponse = { articles: articlesForResponse, summary: llmResponse.summary, totalRelevant: combinedIds.length };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });

        } else { // 'public' flow
            const articleIds = llmResponse.articles.map(a => a.id);
            let articlesForResponse: z.infer<typeof finalResponseSchema>['articles'] = [];

            if (articleIds.length > 0) {
                // Namespace is already defined above
                const fetchResponse = await index.namespace(namespace).fetch(articleIds);
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
