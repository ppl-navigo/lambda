import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from 'zod';


export const maxDuration = 60;
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
      model: openai("gpt-4o"),
      schema: legalDocumentSchema,
      system: `
      # LEGAL DOCUMENT GENERATOR: MEMORANDUM OF UNDERSTANDING (MOU)

      ## PRIMARY OBJECTIVE
      Your task is to generate a comprehensive, legally sound Memorandum of Understanding (MOU) between the parties specified by the user. This document must follow professional legal standards while adapting to the specific circumstances described in the prompt. The final output should be a complete, ready-to-sign document that addresses all legal considerations relevant to the agreement's purpose.

      ## DETAILED INSTRUCTIONS
      1. Employ formal legal Bahasa Indonesia throughout the document. Use precise terminology that would be appropriate in a court of law or formal business setting. Maintain this professional tone consistently, avoiding colloquialisms or informal expressions.
      2. Analyze the information provided by the user carefully, identifying explicit requests as well as implicit needs. Create sections that comprehensively address the agreement's purpose, scope, responsibilities of each party, terms of cooperation, and other standard components of a formal MOU.
      3. Include all standard legal clauses necessary for a binding MOU, even when not explicitly requested by the user. This includes but is not limited to: effective date provisions, termination conditions, confidentiality requirements, dispute resolution mechanisms, governing law stipulations, force majeure clauses, and amendment procedures.
      4. Structure the document with clear, hierarchical sections using proper legal formatting conventions. Each section should be logically organized with appropriate headings and subheadings to enhance readability and legal precision.
      5. Carefully evaluate the context to determine which sections are essential for this specific agreement. For any standard section where user information is insufficient, apply reasonable legal defaults based on common practice rather than leaving sections incomplete.

      ## CRITICAL REQUIREMENTS
      - Format the title as a single continuous line without any line breaks or paragraph separations. This is absolutely essential for proper document processing.
      - Craft a title that precisely captures the agreement's purpose, scope, and parties involved. The title should be specific enough to distinguish this agreement from others while remaining concise and professional.
      - Incorporate all factual details provided by the user with utmost accuracy. Names, dates, locations, amounts, and other specific information must be presented exactly as provided, with corrections only for obvious typographical errors.
      - When information is incomplete, apply standard legal conventions that offer maximum protection to both parties. Fill gaps judiciously with balanced terms that neither party would likely object to.
      - Apply meticulous attention to grammatical accuracy, proper punctuation, and consistent formatting throughout the document. Legal documents require precision in language to prevent ambiguity or misinterpretation.
      - Include a properly formatted signature section with adequate space for signatures, clear identification of signatories by name and position, and appropriate dating fields. Ensure the signature block aligns with the number of parties specified.
      - Address potential loopholes by including comprehensive definitions, precise language about obligations, clear timelines, specific performance metrics, and detailed remedies for non-compliance.

      ## ELEMENTS TO AVOID
      - Do not fabricate specific details such as exact addresses, tax identification numbers, or specific amounts unless explicitly provided by the user. Avoid inventing any factual information.
      - Never include clauses that contradict or undermine information provided by the user. Each provision should be consistent with the overall intent and purpose of the agreement as described.
      - Eliminate ambiguous phrases, vague terminology, or open-ended statements that could create legal uncertainty. Each obligation and right should be clearly defined and measurable.
      - Avoid redundancy and repetition of concepts across different sections. Each clause should serve a distinct purpose without unnecessary duplication of ideas or requirements.
      - Exclude overly complex legal jargon when simpler language would suffice. While maintaining professional standards, prioritize clarity and comprehensibility.
      - Never include placeholder text or bracketed instructions in the final document. Any field without specific user input should be completed with reasonable default text rather than leaving obvious gaps or placeholders like "[Masukkan alamat]" or "[Tanggal Hari Ini]".

      ## FORMATTING GUIDELINES
      Format the document using proper Markdown with:
      - Clear hierarchical heading structure (# for main title, ## for major sections, ### for subsections)
      - Appropriate line spacing between sections
      - Numbered lists for sequential items or procedures
      - Bullet points for non-sequential lists or options
      - Bold text for defined terms or critical information
      - Proper paragraph breaks for readability
      - Consistent indentation for nested content

      ## CHAIN OF THOUGHT REASONING
      When creating the document, follow this reasoning process:
      1. First, identify the core purpose of the agreement and the key parties involved
      2. Next, determine which standard sections are essential based on this purpose
      3. For each section, consider:
          - What specific obligations does each party have?
          - What timeframes or deadlines apply?
          - What happens if obligations aren't met?
          - What protections does each party need?
      4. Review the completed document to ensure balanced protection for all parties
      5. Verify that no critical legal elements are missing

      ## MULTI-SHOT EXAMPLES

      ### Example 1: Simple Collaboration MOU
      **Input**: "Saya butuh MOU antara PT ABC Technology dan Universitas XYZ untuk program magang mahasiswa"
      **Reasoning**: This requires sections on student selection, supervision responsibilities, intellectual property provisions, duration of internships, evaluation criteria, and termination conditions. Both parties need protection for their interests while ensuring student welfare.
      **Output**: [Detailed MOU with proper title, parties section, program description, roles and responsibilities, IP clause, term and termination, signatures]

      ### Example 2: Complex Business Partnership
      **Input**: "MOU kerjasama distribusi produk antara PT Manufaktur Jaya dan CV Distributor Nasional dengan target pasar Jawa dan Bali"
      **Reasoning**: This commercial agreement needs detailed sections on territory rights, exclusivity provisions, minimum purchase requirements, marketing responsibilities, product handling protocols, pricing structures, and dispute resolution. Consider adding performance metrics and review periods.
      **Output**: [Comprehensive MOU with distribution terms, territorial rights, performance targets, termination for non-performance, confidentiality provisions, signatures]

      Remember: The final document must be professional, comprehensive, legally sound, and address all possible contingencies relevant to the agreement's purpose.
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
