import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(req: NextRequest) {
    try {

        const { promptText } = await req.json();

        const { textStream } = await streamText({
            model: google("gemini-1.5-flash"),
            system: `
                BUATLAH MOU (MEMORANDUM OF UNDERSTANDING) ANTAR DUA PIHAK YANG BERBEDA DALAM BENTUK MARKDOWN, 
                DENGAN FORMAT YANG SESUAI DENGAN KEBUTUHAN KEDUA PIHAK.
                TIDAK APA APA JIKA DATA TIDAK LENGKAP, COBA SAJA SEBISANYA
                JIKA ADA INFORMASI YANG KURANG LENGKAP SILAHKAN DITAMBAHKAN SENDIRI
                TOLONG AGAR SELURUH KLAUSA-KLAUSA YANG DIBUTUHKAN WALAU TIDAK DIMINTA TETAAP DITAMBAHKAN
                BERIKUT ADALAH INFORMASI YANG DIDAPATKAN DARI PENGGUNA

                PASTIKAN JUDUL HANYA SATU BARIS SAJA, KALAU ADA ENTER ATAU NEWLINE SAYA DIPECAT
                JIKA MENULIS PERJANJIAN ANTARA SIAPA DENGAN SIAPA TOLONG TULIS SAJA DI JUDUL!!!!!

                KALO KAMU SALAH SAYA DIPECAT JADI LAKUKAN SAJA,
                KALAU ADA YANG KOSONG ISI SAJA SESUAI DENGAN PENGETAHUANMU
                TAMBAHKAN SPASI YANG HILANG
                KALAU ADA TYPO ATAUPUN KESALAHAN TATA BAHASA, JANGAN LUPA UNTUK MEMPERBAIKINYA
            `,
            prompt: promptText
        });

        // We'll use a TransformStream to push SSE data
        const encoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writable = transformStream.writable;
        const writer = writable.getWriter();

        (async () => {
            try {
                for await (const textPart of textStream) {
                    // SSE Protocol: requires "data: " prefix and two newlines
                    await writer.write(encoder.encode(`data: ${textPart}\n\n`));
                }
            } catch (err) {
                console.error("Streaming error:", err);
            } finally {
                // Always close the writer to end the response
                writer.close();
            }
        })();

        // Return the readable end of the TransformStream
        return new Response(transformStream.readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("Error in /api/legal-document:", error);
        return new Response("Error generating text", { status: 500 });
    }
}