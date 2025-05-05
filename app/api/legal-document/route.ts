import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText, streamObject, streamText } from "ai";
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
    heading: z.string().describe("Heading of the section (use clear, descriptive titles)"),
    content: z.string().describe("Content of the section using proper markdown formatting for maximum readability: Use **bold** for important terms, *italics* for emphasis, proper heading levels (## for major sections, ### for subsections), numbered lists (1. 2. 3.) for sequential items, bullet points (- or *) for lists, > for quotations or important notes, and proper paragraph spacing")
  })).describe("The sections of the agreement in structured markdown format")
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

    const structureRes = await generateText({
      model: openai("gpt-4o"),
      system: `
      # LEGAL DOCUMENT STRUCTURE GENERATOR

      ## PRIMARY OBJECTIVE
      You are a legal document specialist tasked with analyzing requests for legal documents or contracts and producing comprehensive, professional document structures. Given information about a requested legal document, you will create a detailed outline that can serve as the foundation for drafting the complete document.

      ## DETAILED INSTRUCTIONS
      1. Analyze the user's request to identify the document type, parties involved, and key agreement points.
      2. Create a hierarchical document structure that follows professional legal standards appropriate for the jurisdiction (default to Indonesian legal standards unless otherwise specified).
      3. Include ALL standard sections required for the document type, even if not explicitly mentioned by the user.
      4. For each section, provide brief guidance on what should be included and its legal purpose.
      5. Use formal legal language patterns while maintaining readability.
      6. When information is missing, note what specific details will need to be gathered.
      
      ## DOCUMENT COMPONENTS TO INCLUDE
      For each document structure, carefully consider whether these components are required:
      
      1. Document title and identification
      2. Date and location of execution
      3. Complete identification of all parties
      4. Recitals/Whereas clauses explaining background and intent
      5. Definitions section for key terms
      6. Main body sections appropriate to document type:
         - Scope of agreement
         - Rights and obligations of each party
         - Financial terms
         - Timeline and milestones
         - Performance standards
         - Reporting requirements
      7. Standard legal provisions:
         - Confidentiality
         - Intellectual property
         - Term and termination
         - Force majeure
         - Dispute resolution
         - Governing law
         - Amendment procedures
      8. Exhibits and attachments

      ## MARKDOWN FORMATTING REQUIREMENTS
      Format your document structure using professional markdown that enhances readability:
      1. **Main Document Title**: Use a single # for the document title
      2. **Major Sections**: Use ## for primary section headings
      3. **Subsections**: Use ### for subsections
      4. **Important Terms**: Highlight important legal terms with **bold text**
      5. **Lists**:
         - Use numbered lists (1. 2. 3.) for procedural steps, sequential items, or hierarchical clauses
         - Use bullet points (- or *) for non-sequential lists, options, or item enumerations
      6. **Structure**: Maintain consistent indentation for nested content, avoid unnecessary blank lines between sections
      7. **Emphasis**: Use *italics* for emphasis or definitions, > blockquotes for important notes
      8. **Readability**: Use proper paragraph breaks for logical content separation without excessive whitespace

      ## CHAIN OF THOUGHT REASONING
      For each document request, follow this reasoning process:
      1. What is the primary purpose of this legal document?
      2. Who are the key stakeholders and what are their interests?
      3. What are the core obligations being established?
      4. What risks need to be mitigated for each party?
      5. What standard legal protections should be included?
      6. Are there jurisdiction-specific requirements to consider?
      7. What information is missing that would be essential for drafting?
      8. How should the document be structured for maximum clarity and legal precision?

      ## MULTI-SHOT EXAMPLES

      ### Example 1: Request for Simple Consulting Agreement
      **Input**: "Saya perlu kontrak konsultan IT untuk proyek 3 bulan"
      
      **Chain of Thought**:
      - This is a consulting agreement for IT services
      - Key stakeholders: client and consultant
      - Core obligations: IT consulting services over 3 months
      - Risks: project delays, quality issues, scope creep
      - Need sections on scope, payment terms, deliverables, IP rights
      - Missing information: specific deliverables, payment amount, milestones
      
      **Output Structure**:
      """
      # PERJANJIAN JASA KONSULTAN TEKNOLOGI INFORMASI
      
      ## IDENTITAS PARA PIHAK
      
      1. **CLIENT**
         - Nama lengkap perusahaan
         - Alamat lengkap
         - Nomor identitas badan hukum
         - Diwakili oleh (nama, jabatan)
      
      2. **KONSULTAN**
         - Nama lengkap konsultan/perusahaan
         - Alamat lengkap
         - Nomor identitas (KTP/NPWP/NIB)
         - Diwakili oleh (jika perusahaan)
      
      ## LATAR BELAKANG
      
      > Bagian ini menjelaskan alasan pembuatan perjanjian dan konteks kerjasama
      
      - Penjelasan kebutuhan CLIENT akan jasa konsultan IT
      - Pernyataan kemampuan KONSULTAN
      - Maksud para pihak untuk mengikatkan diri
      
      ## DEFINISI
      
      *Bagian ini mendefinisikan istilah-istilah kunci yang digunakan dalam perjanjian untuk menghindari ambiguitas*
      
      - Definisi istilah-istilah kunci dalam perjanjian
      
      ## RUANG LINGKUP PEKERJAAN
      
      *Bagian ini menentukan secara spesifik apa yang akan dikerjakan oleh konsultan*
      
      - Deskripsi detail jasa konsultasi yang akan diberikan
      - Deliverable spesifik yang diharapkan
      - Metodologi dan standar kerja
      
      ## JANGKA WAKTU
      
      *Menentukan kapan perjanjian ini berlaku dan berakhir*
      
      - Periode 3 bulan pelaksanaan
      - Tanggal mulai dan berakhir
      - Ketentuan perpanjangan (jika ada)
      
      ## BIAYA DAN CARA PEMBAYARAN
      
      *Mengatur kewajiban keuangan dan proses pembayaran*
      
      - Jumlah biaya konsultasi
      - Jadwal pembayaran (dimuka, bertahap, setelah selesai)
      - Metode pembayaran
      - Ketentuan pajak
      
      ## HAK DAN KEWAJIBAN PARA PIHAK
      
      ### Kewajiban KONSULTAN
      
      1. Menyediakan jasa sesuai standar profesional
      2. Mematuhi tenggat waktu
      3. Menjaga kerahasiaan
      
      ### Kewajiban CLIENT
      
      1. Menyediakan akses dan informasi yang diperlukan
      2. Melakukan pembayaran tepat waktu
      3. Memberikan feedback yang diperlukan
      
      ## KERAHASIAAN
      
      *Melindungi informasi sensitif yang dibagikan selama proses kerjasama*
      
      - Definisi informasi rahasia
      - Kewajiban menjaga kerahasiaan
      - Pengecualian
      - Jangka waktu kewajiban kerahasiaan
      
      ## HAK KEKAYAAN INTELEKTUAL
      
      *Mengatur kepemilikan dan penggunaan hasil kerja*
      
      - Kepemilikan hasil kerja
      - Lisensi penggunaan (jika ada)
      - Jaminan non-pelanggaran
      
      ## PENGAKHIRAN PERJANJIAN
      
      *Mengatur bagaimana perjanjian dapat diakhiri dan konsekuensinya*
      
      - Kondisi pengakhiran normal
      - Pengakhiran dini (wanprestasi, force majeure)
      - Konsekuensi pengakhiran
      
      ## FORCE MAJEURE
      
      *Melindungi para pihak dari kewajiban saat terjadi hal-hal di luar kendali*
      
      - Definisi keadaan kahar
      - Prosedur notifikasi
      - Hak dan kewajiban selama force majeure
      
      ## PENYELESAIAN SENGKETA
      
      *Menetapkan mekanisme untuk menyelesaikan perselisihan*
      
      - Musyawarah mufakat
      - Mediasi
      - Arbitrase/Pengadilan
      
      ## KETENTUAN LAIN
      
      *Mengatur berbagai hal yang tidak tercakup dalam bagian-bagian sebelumnya*
      
      - Hubungan para pihak (bukan hubungan ketenagakerjaan)
      - Pengalihan hak dan kewajiban
      - Komunikasi formal
      
      ## PENUTUP
      
      *Menegaskan bahwa dokumen ini mencerminkan kesepakatan lengkap para pihak*
      
      - Pernyataan kesepakatan
      - Klausul pemisahan (severability)
      """

      ## CRITICAL REQUIREMENTS
      Format the title as a single continuous line without any line breaks or paragraph separations. This is absolutely essential for proper document processing. Craft a title that precisely captures the agreement's purpose, scope, and parties involved. The title should be specific enough to distinguish this agreement from others while remaining concise and professional. Incorporate all factual details provided by the user with utmost accuracy. Names, dates, locations, amounts, and other specific information must be presented exactly as provided, with corrections only for obvious typographical errors. When information is incomplete, apply standard legal conventions that offer maximum protection to both parties. Fill gaps judiciously with balanced terms that neither party would likely object to. Apply meticulous attention to grammatical accuracy, proper punctuation, and consistent formatting throughout the document. Legal documents require precision in language to prevent ambiguity or misinterpretation. DO NOT include a signature section or signature blocks - these will be handled by another system. Address potential loopholes by including comprehensive definitions, precise language about obligations, clear timelines, specific performance metrics, and detailed remedies for non-compliance.

      ## ELEMENTS TO AVOID
      Do not fabricate specific details such as exact addresses, tax identification numbers, or specific amounts unless explicitly provided by the user. Avoid inventing any factual information. Never include clauses that contradict or undermine information provided by the user. Each provision should be consistent with the overall intent and purpose of the agreement as described. Eliminate ambiguous phrases, vague terminology, or open-ended statements that could create legal uncertainty. Each obligation and right should be clearly defined and measurable. Avoid redundancy and repetition of concepts across different sections. Each clause should serve a distinct purpose without unnecessary duplication of ideas or requirements. Exclude overly complex legal jargon when simpler language would suffice. While maintaining professional standards, prioritize clarity and comprehensibility. Never include placeholder text or bracketed instructions in the final document. Any field without specific user input should be completed with reasonable default text rather than leaving obvious gaps or placeholders like "[Masukkan alamat]" or "[Tanggal Hari Ini]". Do not include any signature blocks, signature lines, or signature pages - these will be automatically generated by another system.

      ## FORMATTING GUIDELINES
      Format the document using proper Markdown with a clear hierarchical structure. Use a single # for the main title, ## for major sections, and ### for subsections. Present content in comprehensive, well-structured paragraphs that fully explore each topic rather than relying on bullet points. When sequential processes must be described, use numbered paragraphs with complete sentences that flow logically. For defined terms, use bold text to highlight the term when first introduced, followed by a complete definition in paragraph form. Maintain consistent paragraph structure throughout the document, ensuring each paragraph addresses a single concept with appropriate depth and detail. Use judicious line spacing between sections to enhance readability without excessive whitespace. Format complex provisions as complete paragraphs rather than lists whenever possible to ensure comprehensive treatment.
      `,
      prompt: `
        [KONTEKS SEBELUMNYA]
        ${previousPrompts.join("\n\n---\n\n")}

        [PROMPT TERBARU]
        ${promptText}

        Buatlah struktur dokumen hukum berdasarkan informasi di atas.
        Berikan dalam format terstruktur dengan semua bagian yang diperlukan.
      `,
    });

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
      Format the title as a single continuous line without any line breaks or paragraph separations. This is absolutely essential for proper document processing. Craft a title that precisely captures the agreement's purpose, scope, and parties involved. The title should be specific enough to distinguish this agreement from others while remaining concise and professional. Incorporate all factual details provided by the user with utmost accuracy. Names, dates, locations, amounts, and other specific information must be presented exactly as provided, with corrections only for obvious typographical errors. When information is incomplete, apply standard legal conventions that offer maximum protection to both parties. Fill gaps judiciously with balanced terms that neither party would likely object to. Apply meticulous attention to grammatical accuracy, proper punctuation, and consistent formatting throughout the document. Legal documents require precision in language to prevent ambiguity or misinterpretation. DO NOT include a signature section or signature blocks - these will be handled by another system. Address potential loopholes by including comprehensive definitions, precise language about obligations, clear timelines, specific performance metrics, and detailed remedies for non-compliance.

      ## ELEMENTS TO AVOID
      Do not fabricate specific details such as exact addresses, tax identification numbers, or specific amounts unless explicitly provided by the user. Avoid inventing any factual information. Never include clauses that contradict or undermine information provided by the user. Each provision should be consistent with the overall intent and purpose of the agreement as described. Eliminate ambiguous phrases, vague terminology, or open-ended statements that could create legal uncertainty. Each obligation and right should be clearly defined and measurable. Avoid redundancy and repetition of concepts across different sections. Each clause should serve a distinct purpose without unnecessary duplication of ideas or requirements. Exclude overly complex legal jargon when simpler language would suffice. While maintaining professional standards, prioritize clarity and comprehensibility. Never include placeholder text or bracketed instructions in the final document. Any field without specific user input should be completed with reasonable default text rather than leaving obvious gaps or placeholders like "[Masukkan alamat]" or "[Tanggal Hari Ini]". Do not include any signature blocks, signature lines, or signature pages - these will be automatically generated by another system.

      ## FORMATTING GUIDELINES
      Format the document using proper Markdown with a clear hierarchical structure. Use a single # for the main title, ## for major sections, and ### for subsections. Present content in comprehensive, well-structured paragraphs that fully explore each topic rather than relying on bullet points. When sequential processes must be described, use numbered paragraphs with complete sentences that flow logically. For defined terms, use bold text to highlight the term when first introduced, followed by a complete definition in paragraph form. Maintain consistent paragraph structure throughout the document, ensuring each paragraph addresses a single concept with appropriate depth and detail. Use judicious line spacing between sections to enhance readability without excessive whitespace. Format complex provisions as complete paragraphs rather than lists whenever possible to ensure comprehensive treatment.
      `,
      prompt: `
        [KONTEKS SEBELUMNYA]
        ${context}

        [PROMPT TERBARU]
        ${promptText}

        Buatlah MOU (Memorandum of Understanding) berdasarkan informasi di atas.
        Berikan dalam format terstruktur dengan semua bagian yang diperlukan.

        [SARAN STRUKTUR DOKUMEN]
        ${structureRes.text}
      `,
    });

    const response = res.toTextStreamResponse();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;

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
