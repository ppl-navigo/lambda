import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

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

export async function POST(req: NextRequest) {
  try {
    // Retrieve promptText from request body
    const { promptText, systemPrompt } = await req.json();

    // Use Gemini 1.5 Flash model for streaming
    const { textStream } = await streamText({
      model: google("gemini-1.5-flash"),
      system: systemPrompt, // Use the dynamic system prompt
      prompt: promptText,   // Send the user's promptText to Gemini
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    console.error("Error in /api/mou-analyzer:", error);
    return new Response("Error analyzing MoU", { status: 500 });
  }
}