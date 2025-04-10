import { NextRequest, NextResponse } from "next/server";
import { useMouStore } from "@/app/store/useMouStore"; // Import the store

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl } = await req.json();
    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing pdfUrl" }, { status: 400 });
    }

    console.log("📥 Using pre-processed content from Zustand store for:", pdfUrl);

    // Retrieve the processed content from Zustand store
    const pagesContent = useMouStore.getState().pagesContent;
    console.log(pagesContent)
    if (!pagesContent || pagesContent.length === 0) {
      return NextResponse.json(
        { error: "No pre-processed content found in Zustand store" },
        { status: 404 }
      );
    }

    console.log(`📝 Retrieved ${pagesContent.length} pages of pre-processed content.`);

    // Combine all pages into a single string with newlines between pages
    const fullText = pagesContent.map((page) => page.content).join("\n\n");

    // Return the combined text as a plain text response
    return new NextResponse(fullText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("❌ Error in mou-revision API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}