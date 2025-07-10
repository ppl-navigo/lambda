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

// Internal schema for the LLM's direct output
const llmResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal yang paling relevan, format 'Pasal [nomor]'. Contoh: 'Pasal 480'."),
    })).describe("Daftar pasal yang paling relevan dengan pertanyaan pengguna, maksimal 3."),
    summary: z.string().describe("Jawaban ringkas dan langsung untuk pertanyaan pengguna."),
    is_irrelevant: z.boolean().describe("Setel ke true HANYA jika pertanyaan pengguna sama sekali tidak berhubungan dengan hukum atau KUHP."),
    is_direct_request: z.boolean().describe("Setel ke true jika pengguna secara spesifik meminta isi dari satu pasal tertentu (contoh: 'isi pasal 123')."),
    direct_pasal_id: z.string().optional().describe("Jika is_direct_request adalah true, isi dengan ID pasal yang diminta, format 'Pasal [nomor]'.")
});


// Final response schema matching the frontend's expectation
const finalResponseSchema = z.object({
    articles: z.array(z.object({
        id: z.string(),
        content: z.string(),
        penjelasan: z.string().optional(),
    })),
    summary: z.string(),
});

// Utility function to sanitize LLM's JSON output
const sanitizeJsonString = (jsonString: string): string => {
    return jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
};


export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Filter out empty messages to prevent errors
        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');
        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const query = filteredMessages[filteredMessages.length - 1]?.content || '';
        if (!query) {
            return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
        }

        console.log(`[DEBUG] Received query: "${query}"`);

        // --- 1. Hybrid Retrieval Step ---

        // a) Dense search (Pinecone)
        const { embedding } = await embed({
            model: google.textEmbeddingModel("text-embedding-004"),
            value: query,
        });

        const denseResults = await index.query({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
        });
        console.log(`[DEBUG] Pinecone (Dense) results fetched: ${denseResults.matches.length}`);


        // b) Sparse search (Elasticsearch)
        let sparseResults: any[] = [];
        try {
            const esRes = await axios.post("https://search.litsindonesia.com/kuhp_merged/_search", {
                query: { match: { content: query } },
                size: 5
            });
            sparseResults = esRes.data.hits.hits;
            console.log(`[DEBUG] Elasticsearch (Sparse) results fetched: ${sparseResults.length}`);
        } catch (err) {
            console.error("[DEBUG] Elasticsearch query failed:", err);
            // Continue without sparse results if it fails
        }

        // c) Combine and format context
        const combinedContext = [
            ...denseResults.matches.map(m => ({
                id: m.id,
                score: m.score,
                source: 'dense',
                content: m.metadata?.content || ''
            })),
            ...sparseResults.map(h => ({
                id: h._source.pasal,
                score: h._score,
                source: 'sparse',
                content: `${h._source.pasal}: ${h._source.content}`
            }))
        ];
        console.log(`[DEBUG] Combined context size: ${combinedContext.length}`);

        // --- START: ADD THIS BLOCK FOR DEBUGGING ---
        console.log("[DEBUG] Top Combined & Scored Results (Truncated):");
        console.log(
            combinedContext.slice(0, 10).map(c => ({
                id: c.id,
                score: c.score,
                source: c.source,
                content: typeof c.content === 'string' ? c.content.substring(0, 100) + '...' : ''
            }))
        );
        // --- END: ADD THIS BLOCK FOR DEBUGGING ---


        const contextString = combinedContext
            .map(c => `ID: ${c.id}\nContent: ${c.content}\n---`)
            .join('\n\n');

        // --- 2. LLM Processing Step ---
        const systemPrompt = `
# PERAN & TUJUAN
Anda adalah Asisten Hukum AI yang ahli dalam UU No. 1 Tahun 2023. Tugas Anda adalah menganalisis pertanyaan pengguna dan konteks untuk memberikan jawaban yang akurat.

# ALUR KERJA

1.  **CEK PERMINTAAN LANGSUNG (PALING PENTING!)**: Pertama, periksa apakah pengguna meminta isi pasal tertentu secara langsung. Permintaan ini bisa dalam berbagai format, contohnya: "jelaskan pasal 480", "apa isi pasal 378", "bunyi pasal 100", atau "isi KUHP nomor 5". Penting: Anggap frasa "KUHP nomor [X]" sama persis dengan "Pasal [X]".

    * **JIKA YA**: Setel \`is_direct_request\` ke \`true\`. Ekstrak nomor pasalnya dan letakkan dalam format 'Pasal [nomor]' di \`direct_pasal_id\`. **ABAIKAN KONTEKS PENCARIAN**. Biarkan \`articles\` kosong. Ini adalah prioritas utama Anda. Buat ringkasan umum seperti "Berikut adalah isi dari pasal yang Anda minta."
    * **JIKA TIDAK**: Lanjutkan ke alur kerja normal di bawah ini. Setel \`is_direct_request\` ke \`false\` dan \`direct_pasal_id\` biarkan kosong.

2.  **Alur Kerja Normal (Untuk Pertanyaan Konsep Umum)**:

    * **Evaluasi Konteks dan Pertanyaan**: Tinjau konteks dari \`DENSE\` & \`SPARSE\`. Pahami bahwa pertanyaan bisa berupa konsep umum ("hukuman untuk pencurian"), frasa kunci ("hukum penipuan"), atau bahkan satu kata ("penipuan").
    * **Identifikasi Pasal Relevan**: Dari konteks yang tersedia, pilih 1 hingga 3 ID pasal yang paling relevan dengan pertanyaan pengguna. Jika ada konteks yang relevan atau kata kata yang diminta pengguna terdapat kata yang sama di konteks, **Anda wajib** mengembalikan setidaknya satu pasal dalam array \`articles\`. Jangan biarkan array \`articles\` kosong jika ada konteks yang cocok.
    * **Cek Relevansi**: Setel \`is_irrelevant\` ke \`true\` HANYA JIKA pertanyaan pengguna ("siapa kamu", "resep makanan", atau pernyataan lain yang sangat tidak relevan) DAN konteks yang ditemukan atau kata yang terkandung sama sekali tidak ada hubungannya dengan hukum atau KUHP atau tidak terkandung sama sekali di konteks. Jika salah satu relevan, setel ke \`false\`. Ingat bahwa kamu harus 100% yakin bahwa tidak ada relevansi sama sekali, barulah boleh setel ke true
    * **Buat Ringkasan**: Buat ringkasan jawaban yang jelas dan langsung berdasarkan pasal-pasal relevan yang Anda temukan di konteks.

    
# ATURAN KETAT
-   Prioritaskan Permintaan Langsung**: Aturan untuk \`is_direct_request\` mengalahkan semua aturan lain.
-   **Output WAJIB JSON**: Selalu kembalikan objek JSON yang valid. Jangan tambahkan \`\`\`json atau teks lain di luar objek.
-   **ID Pasal**: \`id\` harus berupa string dengan format "Pasal [nomor]".
-   **Maksimal 3 Pasal**: Jangan pernah mengembalikan lebih dari 3 pasal dalam array \`articles\`.
-   **Fokus pada Relevansi**: Prioritaskan pasal yang paling menjawab pertanyaan. Jika ada satu pasal yang sangat relevan, cukup kembalikan satu itu saja.

# KONTEKS PENCARIAN
${contextString}

# TUGAS ANDA
Berdasarkan pertanyaan pengguna di bawah dan konteks di atas, hasilkan objek JSON.

Pertanyaan Pengguna: "${query}"
`;

        const { object: llmResponse } = await generateObject({
            model: google("gemini-2.0-flash"),
            prompt: systemPrompt,
            schema: llmResponseSchema,
        });

        console.log("[DEBUG] LLM Response:", llmResponse);

        // --- NEW: Direct Request Handling ---
        if (llmResponse.is_direct_request && llmResponse.direct_pasal_id) {
            console.log(`[DEBUG] Query identified as a direct request for: ${llmResponse.direct_pasal_id}`);
            // Override and force fetch the single, correct article
            const articleIds = [llmResponse.direct_pasal_id];
            const fetchResponse = await index.fetch(articleIds);
            const articlesForResponse = Object.values(fetchResponse.records ?? {}).map(vec => ({
                id: vec.id,
                content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
                penjelasan: vec.metadata?.penjelasan as string ?? '',
            }));
            const finalResponse = { articles: articlesForResponse, summary: "" };
            return NextResponse.json(finalResponse, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // --- 3. Irrelevancy Handling ---
        if (llmResponse.is_irrelevant) {
            console.log("[DEBUG] Query identified as irrelevant.");
            const irrelevantResponse = {
                articles: [],
                summary: "Maaf, saya hanya dapat menjawab pertanyaan yang berkaitan dengan Kitab Undang-Undang Hukum Pidana (UU No. 1 Tahun 2023). Silakan ajukan pertanyaan seputar hukum pidana di Indonesia."
            };
            return NextResponse.json(irrelevantResponse, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }


        // --- 4. Final Grounding & Formatting ---
        if (!llmResponse.articles || llmResponse.articles.length === 0) {
            console.log("[DEBUG] LLM did not return any relevant articles. Providing generic response.");
             const fallbackResponse = {
                articles: [],
                summary: "Maaf, saya tidak dapat menemukan pasal yang relevan dengan pertanyaan Anda saat ini. Mohon coba ajukan pertanyaan dengan lebih spesifik."
            };
            return NextResponse.json(fallbackResponse, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const articleIds = llmResponse.articles.map(a => a.id);
        console.log(`[DEBUG] IDs selected by LLM: ${articleIds.join(', ')}`);

        // Fetch full data from Pinecone for the final response to ensure accuracy
        const fetchResponse = await index.fetch(articleIds);
        const fetchedRecords = fetchResponse.records ?? {};

        const articlesForResponse = Object.values(fetchedRecords).map(vec => ({
            id: vec.id,
            content: vec.metadata?.content as string ?? 'Konten tidak ditemukan.',
            penjelasan: vec.metadata?.penjelasan as string ?? '',
        }));


        const finalResponse: z.infer<typeof finalResponseSchema> = {
            articles: articlesForResponse,
            summary: llmResponse.summary,
        };

        return NextResponse.json(finalResponse, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });

    } catch (error) {
        console.error('[FATAL] Error processing request:', error);
        return NextResponse.json(
            { error: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}