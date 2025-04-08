import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import FormData from "form-data";

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl } = await req.json();
    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing pdfUrl" }, { status: 400 });
    }

    console.log("📥 Downloading PDF from:", pdfUrl);
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data);

    // ✅ Ekstrak teks dari PDF
    const extractedText = await extractTextFromPdf(pdfBuffer);
    console.log("📝 Extracted Text:", extractedText.substring(0, 500));

    // ✅ Dapatkan stream dari Gemini
    const { textStream } = await streamText({
      model: google("gemini-1.5-flash"),
      system: `
        Lakukan revisi pada dokumen berikut agar lebih jelas, ringkas, dan profesional. Pertahankan struktur asli dokumen seperti judul, subjudul, poin-poin, dan numbering. Hindari kalimat yang terlalu panjang dan perbaiki jika ada kalimat tidak efektif atau membingungkan.

        Gunakan bahasa yang formal namun tidak terlalu kaku. Jangan ubah makna dari isi asli. Jika ada pengulangan atau informasi tidak penting, ringkaslah tanpa menghilangkan konteks penting.

        Format output harus:
        - Tiap paragraf dipisahkan oleh satu baris kosong (\\n\\n)
        - Poin-poin tetap rapi dan mudah dibaca
        - Judul/subjudul tetap ditandai dengan jelas

        Jangan tambahkan bagian atau komentar yang tidak diminta.
      `,
      prompt: extractedText,
    });

    // ✅ Stream teks langsung ke response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("❌ Error in mou-revision API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log("🔍 Sending PDF to extract_text endpoint...");

    const formData = new FormData();
    formData.append("file", pdfBuffer, {
      filename: "document.pdf",
      contentType: "application/pdf",
    });

    const extractResponse = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/extract_text/`,
      formData,
      { headers: formData.getHeaders() }
    );

    console.log("✅ Text extraction successful");

    const pagesText = extractResponse.data.pages_text;
    if (Array.isArray(pagesText)) {
      const mergedText = pagesText.join("\n\n");
      console.log("🧩 Merged text from pages, total length:", mergedText.length);
      return mergedText;
    }

    throw new Error("Unexpected response format from extract_text endpoint");

  } catch (err) {
    console.error("❌ Failed to extract text from PDF:", err);
    throw new Error("Text extraction failed");
  }
}
