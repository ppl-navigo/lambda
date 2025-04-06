import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PDFDocument, StandardFonts, PDFFont } from "pdf-lib";
import FormData from "form-data";

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, pagesContent } = await req.json();
    
    console.log("📥 Received pages from frontend:", pagesContent.length);

    if (!pdfUrl || !pagesContent || !Array.isArray(pagesContent)) {
      return NextResponse.json({ error: "Missing pdfUrl or pagesContent" }, { status: 400 });
    }

    // Combine all pages' content into one full doc
    const fullText = pagesContent
      .sort((a, b) => a.sectionNumber - b.sectionNumber)
      .map(p => p.content.trim())
      .join("\n\n");

    // 🔄 Convert to PDF
    const revisedPdfBuffer = await convertTextToPdf(fullText);

    // 🔼 Upload PDF
    const revisedPdfUrl = await uploadRevisedPdf(revisedPdfBuffer);

    return NextResponse.json({ editedPdfUrl: revisedPdfUrl });

  } catch (error) {
    console.error("❌ Error in mou-revision API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 🔄 **Convert text to PDF**
export async function convertTextToPdf(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maxWidth = 500;
  const lineHeight = 20;
  let fontSize = 12;
  let x = 50;
  let y = 750;

  let page = pdfDoc.addPage([600, 800]);

  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      y -= lineHeight;
      continue;
    }

    let font: PDFFont = fontRegular;
    let size = fontSize;
    let content = trimmed;

    // 🔹 Check for markdown headers
    if (trimmed.startsWith("###")) {
      font = fontBold;
      size = 14;
      content = trimmed.replace(/^###\s*/, "");
      y -= 10;
    } else if (trimmed.startsWith("##")) {
      font = fontBold;
      size = 16;
      content = trimmed.replace(/^##\s*/, "");
      y -= 14;
    } else if (trimmed.startsWith("#")) {
      font = fontBold;
      size = 20;
      content = trimmed.replace(/^#\s*/, "");
      y -= 18;
    }

    const words = content.split(" ");
    let currentLine: { text: string; bold: boolean }[] = [];

    for (let word of words) {
      const isBold = /^\*\*(.+)\*\*$/.test(word) || word.startsWith("**") || word.endsWith("**");
      const cleanedWord = word.replace(/^\*\*/, "").replace(/\*\*$/, "");

      currentLine.push({ text: cleanedWord, bold: isBold });

      // Calculate width of line
      const lineWidth = currentLine.reduce((acc, chunk) => {
        const useFont = chunk.bold ? fontBold : font;
        return acc + useFont.widthOfTextAtSize(chunk.text + " ", size);
      }, 0);

      if (lineWidth > maxWidth) {
        x = 50;
        for (const chunk of currentLine) {
          const useFont = chunk.bold ? fontBold : font;
          page.drawText(chunk.text + " ", { x, y, font: useFont, size });
          x += useFont.widthOfTextAtSize(chunk.text + " ", size);
        }

        y -= lineHeight;
        currentLine = [];

        if (y < 50) {
          page = pdfDoc.addPage([600, 800]);
          y = 750;
        }
      }
    }

    // Draw remaining line
    if (currentLine.length > 0) {
      x = 50;
      for (const chunk of currentLine) {
        const useFont = chunk.bold ? fontBold : font;
        page.drawText(chunk.text + " ", { x, y, font: useFont, size });
        x += useFont.widthOfTextAtSize(chunk.text + " ", size);
      }
      y -= lineHeight;
    }

    // New page if space is running out
    if (y < 50) {
      page = pdfDoc.addPage([600, 800]);
      y = 750;
    }

    y -= 4; // Additional spacing between paragraphs
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