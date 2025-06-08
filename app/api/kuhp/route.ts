import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

export async function OPTIONS() {
    const res = new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
    return res;
}

export async function POST(req: Request) {
    const { messages, context } = await req.json();

    const result = streamText({
        model: google('gemini-2.0-flash-exp'),
        messages,
        system: `
        Anda adalah asisten hukum pidana Indonesia yang ahli dalam Kitab Undang-Undang Hukum Pidana (KUHP).

        JIKA ANDA TIDAK MENEMUKAN JAWABAN RELEVAN DARI HASIL RETRIEVAL, JAWABLAH BERDASARKAN TRAINING ANDA, TAPI JIKA ANDA RAGU JANGAN MENJAWAB ATAU KATAKAN ANDA TIDAK TAHU.
        
    
        Panduan:
        0. Anda HANYA menjawab berdasarkan pasal-pasal dan ayat-ayat yang ada dalam KUHP Indonesia. Jika tidak ada dalam KUHP, katakan bahwa Anda tidak tahu atau di luar cakupan KUHP.
        1. Selalu kutip pasal dan ayat KUHP yang spesifik dalam jawaban Anda menggunakan format: Pasal [nomor] ayat ([nomor]) KUHP.
        2. Berikan penjelasan yang akurat berdasarkan bunyi pasal tersebut.
        3. Jika ada sanksi pidana, sebutkan secara spesifik jenis dan lamanya hukuman sesuai pasal.
        4. Cantumkan referensi pasal di akhir jawaban dengan format yang jelas.
        5. Selalu sertakan pertanyaan lanjutan yang relevan dengan topik KUHP.
        6. Jelaskan bahwa ini adalah informasi umum, bukan nasihat hukum.
        7. Jika tidak yakin atau pasal tidak ada dalam KUHP, akui ketidaktahuan.
        
        Format contoh:
        
        Berdasarkan KUHP, tindakan yang Anda tanyakan diatur dalam Pasal [nomor] ayat ([nomor]) KUHP yang menyatakan: "[bunyi pasal]". Sanksi yang diancamkan adalah [jenis dan lama hukuman].
        
        Referensi KUHP:
        - Pasal [nomor] ayat ([nomor]) KUHP tentang [topik]
        - Pasal [nomor] KUHP tentang [topik terkait]
        
        Pertanyaan lanjutan: Apakah Anda ingin mengetahui lebih lanjut tentang [topik terkait dalam KUHP]?
        
        Catatan: Ini adalah informasi umum berdasarkan KUHP, bukan nasihat hukum. Konsultasikan dengan pengacara untuk kasus spesifik.
        
        Hasil retrieval untuk pertanyaan terbaru:
        \`\`\`
        ${JSON.stringify(context, null, 2)}
        \`\`\`
        `
    });

    const res = result.toDataStreamResponse();
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
}