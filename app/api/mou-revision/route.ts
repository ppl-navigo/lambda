import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

    // **Ekstraksi teks**
    const extractedText = await extractTextFromPdf(pdfBuffer);
    console.log("📝 Extracted Text:", extractedText.substring(0, 500));

    // **Revisi teks dengan Gemini melalui ai-sdk**
    const revisedText = await reviseText(extractedText);
    console.log("✍️ Revised Text:", revisedText.substring(0, 1000));

    // **Konversi hasil revisi ke PDF**
    const revisedPdfBuffer = await convertTextToPdf(revisedText);

    // **Unggah PDF revisi ke server**
    const revisedPdfUrl = await uploadRevisedPdf(revisedPdfBuffer);
    return NextResponse.json({ editedPdfUrl: revisedPdfUrl });
  } catch (error) {
    console.error("❌ Error in mou-revision API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ **Ekstrak teks dari PDF**
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append("file", pdfBuffer, { filename: "document.pdf", contentType: "application/pdf" });

  const extractResponse = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/extract_text/`,
    formData,
    { headers: formData.getHeaders() }
  );

  return extractResponse.data.extracted_text;
}

// ✅ **Revisi teks menggunakan ai-sdk**
async function reviseText(text: string): Promise<string> {
  const { textStream } = await streamText({
    model: google("gemini-1.5-flash"),
    system: "Lakukan revisi pada dokumen berikut dengan tetap mempertahankan format yang rapi dan profesional. Pastikan setiap paragraf dipisahkan oleh satu baris kosong (\n\n), dan setiap poin atau bagian memiliki pemisahan yang jelas. Jangan menghilangkan struktur asli dokumen, seperti judul, subjudul, dan pemisahan antara bagian. Pastikan kalimat tidak terlalu panjang agar tetap mudah dibaca dalam format PDF.",
    prompt: text,
  });

  let revisedText = "";
  for await (const chunk of textStream) {
    revisedText += chunk;
  }
  return revisedText;
}

async function wrapText(text: string, maxWidth: number, pdfDoc: PDFDocument): Promise<string[]> {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    
    const paragraphs = text.split("\n"); // Pisahkan berdasarkan newline
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (textWidth < maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }

        lines.push(currentLine);
        lines.push(""); // Tambahkan newline antar paragraf
    }

    return lines;
}

export async function convertTextToPdf(text: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const maxWidth = 500;
    const lineHeight = 20;
    let x = 50;
    let y = 750;

    let page = pdfDoc.addPage([600, 800]);
    const lines = await wrapText(text, maxWidth, pdfDoc);

    for (const line of lines) {
        if (y < 50) { // Jika y terlalu rendah, buat halaman baru
            page = pdfDoc.addPage([600, 800]);
            y = 750;
        }
        
        if (line === "") {
            y -= lineHeight; // Tambahkan spasi ekstra untuk newline
        } else {
            page.drawText(line, { x, y, font, size: fontSize });
            y -= lineHeight;
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

// ✅ **Unggah PDF hasil revisi ke server**
async function uploadRevisedPdf(pdfBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append("file", pdfBuffer, { filename: "revised_document.pdf", contentType: "application/pdf" });

  const uploadResponse = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/upload/`,
    formData,
    { headers: formData.getHeaders() }
  );

  if (uploadResponse.status === 200) {
    return `${process.env.NEXT_PUBLIC_API_URL}/stream/${uploadResponse.data.file_path}`;
  }

  throw new Error("Upload failed");
}