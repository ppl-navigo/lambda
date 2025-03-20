import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(req: NextRequest) {
  try {
    // Retrieve promptText from request body
    const { promptText } = await req.json();

    // Use Gemini 1.5 Flash model for streaming
    const { textStream } = await streamText({
      model: google("gemini-1.5-flash"),
      system: `Analisis dokumen berikut untuk mengidentifikasi klausul yang berpotensi berisiko bagi pihak kedua. Risiko mencakup, namun tidak terbatas pada:

- Ketidakseimbangan hak dan kewajiban antara pihak pertama dan pihak kedua
- Klausul pembatalan yang merugikan
- Klausul pembayaran yang berpotensi memberatkan
- Klausul tanggung jawab yang bisa menyebabkan kerugian sepihak
- Klausul force majeure yang tidak melindungi kepentingan pihak kedua
- Klausul ambigu atau multi-tafsir yang bisa disalahgunakan
- Klausul lain yang dapat menyebabkan dampak hukum negatif bagi pihak kedua

Format hasil yang diharapkan dalam **markdown**:

\`\`\`
Klausul {nomor}: "{kalimat atau kata-kata berisiko}"
Alasan: "{penjelasan mengapa klausul ini berisiko}"
\`\`\`

Jangan lupa berikan jawaban beserta dengan newline untuk readibility

Jika dokumen memiliki bahasa yang tidak dikenali, tampilkan pesan: "Bahasa tidak didukung". Jika tidak ditemukan klausul berisiko, tampilkan pesan: "Tidak ditemukan klausul yang dapat dianalisis". Jika terjadi kesalahan sistem, tampilkan pesan: "Gagal menganalisis dokumen, coba lagi nanti".

Setiap klausul yang ditandai harus memiliki minimal satu alasan mengapa klausul tersebut berisiko, tetapi jangan berikan rekomendasi perbaikan terlebih dahulu.

**Contoh Format Jawaban:** 

\`\`\`
Berikut adalah analisis dari beberapa klausul yang berpotensi berisiko beserta alasannya:

**Klausul 1:**
"xxx"
**Alasan:**
"xxx"

**Klausul 2:**
"xxx"
**Alasan:**
"xxx"

**Kesimpulan:**
"xxx"

\`\`\``,
      prompt: promptText,  // Send the user's promptText to Gemini
    });

    // We'll use a TransformStream to push SSE data back to the frontend
    const encoder = new TextEncoder();
    const transformStream = new TransformStream();
    const writable = transformStream.writable;
    const writer = writable.getWriter();

    (async () => {
      try {
        for await (const textPart of textStream) {
          // SSE Protocol: Write data with "data: " prefix and two newlines
          await writer.write(encoder.encode(textPart));
        }
      } catch (err) {
        console.error("Streaming error:", err);
      } finally {
        writer.close();  // Close the writer when streaming is done
      }
    })();

    // Return the readable end of the TransformStream to the frontend
    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",  // Set proper content type for streaming
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Error in /api/mou-analyzer:", error);
    return new Response("Error analyzing MoU", { status: 500 });
  }
}
