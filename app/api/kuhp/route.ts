import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Izinkan respons hingga 60 detik
export const maxDuration = 60;

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, xyz")
    return response
}


// Skema Zod yang disesuaikan kembali dengan struktur content/sections/penjelasan
const docSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal dengan format 'Pasal [nomor] Undang-Undang Nomor 1 Tahun 2023'"),
        content: z.string().describe("Bunyi pasal (preamble/pembukaan) sebelum daftar ayat. Jika tidak ada, biarkan string kosong.").optional(),
        sections: z.array(z.string()).describe("Daftar ayat-ayat yang ada dalam pasal tersebut. Harus persis seperti di UU.").optional().default([]),
        penjelasan: z.string().describe("Penjelasan resmi dari pasal tersebut.").optional(),
    })),
    summary: z.string().describe("Ringkasan yang menjawab pertanyaan pengguna, WAJIB menyertakan disclaimer dan pertanyaan lanjutan."),
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // --- FIX: Saring pesan untuk menghapus yang kontennya kosong ---
        // Ini mencegah error 'contents.parts must not be empty'
        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');

        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const query = filteredMessages[filteredMessages.length - 1]?.content || '';
        if (!query) {
            return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
        }

        const { embedding } = await embed({
            model: google.textEmbeddingModel("text-embedding-004"),
            value: query,
        });

        const articles = await index.query({
            vector: embedding as any,
            topK: 10, // Mengambil 10 hasil teratas untuk konteks yang lebih kaya
            includeMetadata: true,
        });

        // Pra-pemrosesan konteks untuk keterbacaan yang lebih baik di dalam prompt
        const contextString = articles.matches.map(match => {
            const metadata = match.metadata as { content?: string; penjelasan?: string; } || {};
            const content = metadata.content || 'No content available';
            const penjelasan = metadata.penjelasan || 'No explanation available';
            return `ID: ${match.id}\nContent: ${content}\nPenjelasan: ${penjelasan}`;
        }).join('\n---\n');

        // --- PROMPT ENGINEERING YANG DISEMPURNAKAN ---
        const systemPrompt = `
# Peran & Tujuan (Role & Goal)
Anda adalah asisten hukum AI yang merupakan seorang ahli absolut dalam Kitab Undang-Undang Hukum Pidana (KUHP) Indonesia, yang diatur dalam Undang-Undang Nomor 1 Tahun 2023. Tujuan utama Anda adalah untuk SELALU memberikan jawaban yang substantif dan akurat atas pertanyaan hukum pengguna.

# Prinsip Utama Jawaban (Main Answering Principle)
1.  **JAWABAN ADALAH PRIORITAS UTAMA**: Tugas terpenting Anda adalah menjawab pertanyaan pengguna. Jangan pernah mengembalikan jawaban kosong atau mengatakan Anda tidak dapat menemukan informasinya.
2.  **KONTEKS ADALAH ALAT BANTU, BUKAN BATASAN**: Konteks yang disediakan dari database adalah alat untuk membantu Anda, tetapi pengetahuan internal Anda yang luas tentang hukum Indonesia adalah sumber daya utama Anda.
3.  **KEWAJIBAN MENJAWAB**: Jika konteks yang diberikan tidak relevan, tidak lengkap, atau kosong, ANDA WAJIB MENGGUNAKAN PENGETAHUAN INTERNAL ANDA untuk menyusun jawaban. Jangan menyebutkan bahwa konteks tidak membantu atau tidak ditemukan. Bertindaklah seolah-olah Anda menjawab dari ingatan ahli Anda.

# Alur Berpikir (Chain of Thought)
1.  **Analisis Pertanyaan**: Pahami dengan saksama apa yang ditanyakan oleh pengguna (misalnya, "pembunuhan", "penipuan").
2.  **Tinjau Konteks**: Periksa dokumen yang diambil dari database (\`KONTEKS AKTUAL\`).
3.  **Evaluasi Konteks & Ambil Keputusan (CRITICAL STEP)**:
    * **Jika relevan**: Gunakan konteks tersebut sebagai dasar utama untuk menyusun jawaban.
    * **Jika TIDAK relevan atau kosong**: Abaikan konteks sepenuhnya. Segera beralih ke pengetahuan internal Anda untuk menemukan pasal yang paling relevan dengan pertanyaan pengguna.
4.  **Ekstraksi atau Formulasi Jawaban**:
    * (Dari Konteks): Ekstrak \`id\`, \`content\`, \`sections\`, dan \`penjelasan\`.
    * (Dari Pengetahuan Internal): Formulasikan konten pasal, ayat, dan penjelasan berdasarkan pengetahuan Anda tentang UU Nomor 1 Tahun 2023. Anda harus mengetahui pasal-pasal kunci seperti pembunuhan, pencurian, dll.
5.  **Sintesis Ringkasan**: Buat ringkasan (\`summary\`) yang koheren dan mematuhi semua \`Aturan Respon\`.
6.  **Finalisasi JSON**: Pastikan seluruh output JSON sesuai dengan skema yang ditetapkan.

# Aturan Respon (Response Rules)
1.  **Nama Undang-Undang**: Selalu gunakan sebutan "Undang-Undang Nomor 1 Tahun 2023" atau "UU Nomor 1 Tahun 2023". JANGAN PERNAH menggunakan istilah "KUHP".
2.  **Konten Pasal**: Isi \`content\` dan \`sections\` harus akurat dan sesuai dengan bunyi pasal.
3.  **Struktur Ringkasan**: \`summary\` harus selalu berisi:
    * Jawaban langsung terhadap pertanyaan pengguna.
    * Sanksi pidana yang relevan.
    SELESAI, JANGAN BERIKAN PERNTANYAAN LEBIH LANJUT ATAU PENJELASAN TAMBAHAN. PENJELASAN SESINGKAT MUNGKIN DALAM 1 PARAGRAF SAJA JIKA MUAT.
   
# KONTEKS AKTUAL (Actual Context)
Berikut adalah pasal-pasal yang relevan dari hasil pencarian:
${contextString}

# TUGAS ANDA (Your Task)
Berdasarkan pertanyaan terakhir dari pengguna dan konteks di atas, hasilkan objek JSON yang sesuai dengan skema dan semua aturan yang telah dijelaskan. INGAT: JIKA KONTEKS TIDAK RELEVAN, GUNAKAN PENGETAHUAN INTERNAL ANDA UNTUK MENJAWAB.
Pertanyaan Pengguna: "${query}"
`;

        const result = await generateObject({
            model: google("gemini-1.5-flash"),
            system: systemPrompt,
            messages: filteredMessages, // Gunakan pesan yang sudah disaring
            schema: docSchema,
        });

        return NextResponse.json(
            result.object, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            }
        }
        );

    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}
