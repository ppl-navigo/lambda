import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from 'zod';

// Array untuk menyimpan semua prompt sebelumnya
const previousPrompts: string[] = [];

// Define the schema for the legal document
const legalDocumentSchema = z.object({
  title: z.string().describe("The title of the legal document (MOU)"),
  parties: z.array(z.object({
    name: z.string().describe("Full name of the party's organization"),
    position: z.string().describe("Position or title of the party"),
    organization: z.string().describe("Organization or company name"),
    phone_number: z.string().describe("Party phone number"),
    address: z.string().describe("Complete address")
  })).describe("The parties involved in the agreement"),
  section: z.array(z.object({
    heading: z.string().describe("Heading of the section"),
    content: z.string().describe("Content of the section, use markdown!")
  })).describe("The sections of the agreement")
});

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
    const { promptText } = await req.json();

    // Check if the new prompt is the same as the previous one
    if (promptText === previousPrompts[previousPrompts.length - 1]) {
      return new Response(JSON.stringify({ error: "Duplicate prompt" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        },
      });
    }

    // Tambahkan prompt baru ke daftar konteks
    // previousPrompts.push(promptText);

    // Gabungkan semua prompt sebelumnya untuk dijadikan konteks
    const context = previousPrompts.join("\n\n---\n\n");

    const res = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: legalDocumentSchema,
      system: `
          # LEGAL DOCUMENT GENERATOR: MEMORANDUM OF UNDERSTANDING (MOU)

          ## TASK
          Generate a professionally formatted Memorandum of Understanding (MOU) between two parties in Markdown format. Do not put any empty field where the user has not provided any information. Use the information provided by the user to create a legally sound document.
          ## INSTRUCTIONS
          1. Use formal legal Bahasa Indonesia. Unless specified, assume the user is a legal professional.
          2. Create a formal MOU based on the information provided by the user.
          3. Include all standard clauses required for a legally sound MOU, even if not explicitly requested.
          4. Maintain professional legal language and formatting throughout the document.
          5. Structure the document with clear sections with given context. For the section with no clear values, don't generate for that section.

          ## REQUIREMENTS
          - Title must be on a single line with no line breaks (critical requirement).
          - Title should clearly state and represent the goal of the document.
          - Use factual information provided by the user whenever possible.
          - Only fill in missing information when necessary, using standard legal conventions.
          - Correct any typos or grammatical errors in the user's input.
          - Ensure proper spacing and formatting throughout the document.
          - Give sign section, with each parties names written under the sign area.

          ## AVOID
          - Do not invent elaborate fictional details.
          - Do not include clauses that contradict provided information.
          - Avoid ambiguous language that could create legal confusion.
          - Avoid repetitive or redundant statements.
          - Do not include disclaimers or unnecessary legal jargon.
          - Do not put some empty field where the user has not provided any information. e.g. DO NOT MAKE IT LIKE THIS [Masukkan alamat], or [Tanggal Hari Ini]

          ## FORMAT
          Use proper Markdown formatting with appropriate headers, lists, and spacing.
          Return a JSON object with the markdown content, document type, and parties involved.
      `,
      prompt: `
        [KONTEKS SEBELUMNYA]
        ${context}

        [PROMPT TERBARU]
        ${promptText}

        Buatlah MOU (Memorandum of Understanding) berdasarkan informasi di atas.
        Berikan dalam format terstruktur dengan semua bagian yang diperlukan.
      `,
    });

    const response = res.toTextStreamResponse();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;

    

    // We'll use a TransformStream to push SSE data
    // const encoder = new TextEncoder();
    // const transformStream = new TransformStream();
    // const writable = transformStream.writable;
    // const writer = writable.getWriter();

    // (async () => {
    //   try {
    //     for await (const partialObject of partialObjectStream) {
    //       // SSE Protocol: requires "data: " prefix and two newlines
    //       await writer.write(encoder.encode(`data: ${JSON.stringify(partialObject)}\n\n`));
    //     }
    //   } catch (err) {
    //     console.error("Streaming error:", err);
    //   } finally {
    //     // Always close the writer to end the response
    //     writer.close();
    //   }
    // })();

    // // Return the readable end of the TransformStream
    // return new Response(transformStream.readable, {
    //   headers: {
    //     "Content-Type": "text/event-stream",
    //     "Cache-Control": "no-cache",
    //     'Access-Control-Allow-Origin': '*',
    //     'Access-Control-Allow-Methods': 'POST, OPTIONS',
    //     'Access-Control-Allow-Headers': 'Content-Type',
    //     'Access-Control-Max-Age': '86400',
    //     Connection: "keep-alive",
    //   },
    // });
  } catch (error) {
    console.error("Error in /api/legal-document:", error);
    return new Response(JSON.stringify({ error: "Error generating legal document" }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
