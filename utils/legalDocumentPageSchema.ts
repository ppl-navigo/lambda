import { z } from "zod";

export const legalDocumentPageSchema = z.object({
    // Document generation status markers
    status: z.object({
        marker: z.enum(["SOS", "MID", "EOS"]).describe("Status marker: Start of Stream (SOS), Middle of Stream (MID), or End of Stream (EOS)"),
        continuationToken: z.string().optional().describe("Token to continue generation if output was truncated"),
        completionStatus: z.number().min(0).max(100).describe("Percentage of completion for current page"),
        isComplete: z.boolean().describe("Whether this page generation is complete"),
        remainingElements: z.array(z.string()).optional().describe("Elements that still need to be generated")
    }).describe("Document generation status and continuation information"),

    // Document metadata (for context)
    metadata: z.object({
        title: z.string().describe("The title of the legal document"),
        documentType: z.string().describe("Type of legal document (e.g., MOU, Agreement, Contract)"),
        date: z.string().describe("Date of document creation"),
    }).describe("Document metadata and control information"),

    // Current page information
    currentPage: z.object({
        pageType: z.enum([
            "cover",
            "pembukaan", // Indonesian preamble section
            "isi", // Main content
            "penutup", // Closing section
            "signature",
            "lampiran" // Attachments
        ]).describe("Type of page according to Indonesian document conventions"),
        header: z.string().describe("Page header text"),
        elements: z.array(z.object({
            type: z.enum([
                "judul", // Document title (ONLY for cover page)
                "pembukaan", // Preamble
                "konsideran", // Considerations (Menimbang)
                "dasar_hukum", // Legal basis (Mengingat)
                "pasal", // Article
                "ayat", // Paragraph within article
                "blok_tanda_tangan", // Signature block
            ]).describe("Type of content element in Indonesian document format"),

            // Element identification and numbering
            id: z.string().describe("Element identifier (e.g., 'Pasal 3', 'Ayat 2.1')"),
            number: z.string().describe("Element number or reference (e.g., '1.', 'a.', 'i.')"),

            // Element content
            title: z.string().describe("Title or heading of the element"),
            content: z.string().describe("Content text with markdown formatting"),

            // For lists and clauses
            items: z.array(z.object({
                number: z.string().describe("Item number or reference (e.g., '1.', 'a.', 'i.')"),
                content: z.string().describe("Item content text")
            })).optional().describe("List items or clauses"),

            // For signature blocks
            signatureInfo: z.object({
                partyIndex: z.number().describe("Reference to party index who signs"),
                title: z.string().describe("Title for signature block (e.g., 'PIHAK PERTAMA')"),
                name: z.string().describe("Name to appear under signature line"),
                position: z.string().describe("Position to appear under name"),
                place: z.string().describe("Place of signing (e.g., 'Jakarta')"),
                date: z.string().describe("Date of signing in Indonesian format (e.g., '5 Juni 2024')"),
                stampDuty: z.boolean().describe("Whether to include stamp duty (materai) indication"),
                stampDutyValue: z.string().describe("Value of the stamp duty (e.g., 'Rp10.000')")
            }).optional().describe("Signature block information with Indonesian formalities"),
        })).describe("Content elements on the page")
            // Add validation to ensure "judul" only appears on cover pages
            .refine(elements => {
                // Only allow "judul" element in "cover" page type
                const pageType = z.enum(["cover", "pembukaan", "isi", "penutup", "signature", "lampiran"]);
                const parentPageType = pageType._type;

                if (parentPageType !== "cover") {
                    return elements.every(element => element.type !== "judul");
                }
                return true;
            }, {
                message: "The 'judul' element type can only be used on cover pages"
            }),
    }).describe("The current page being generated"),

    // Navigation context
    navigation: z.object({
        currentDocumentSummary: z.string().describe("Brief summary of the current document"),
        previousPageSummary: z.string().describe("Brief summary of previous page content"),
        nextPageHint: z.string().describe("Hint for what should be on the next page"),
        continuationElement: z.string().describe("ID of element that continues from previous page"),
        isLastPage: z.boolean().describe("Indicates if this is the final page")
    }).describe("Navigation and context information for iterative generation"),

    // Document formalities
    formalities: z.object({
        tempatPenandatanganan: z.string().optional().describe("Tempat dokumen ditandatangani"),
        tanggalPenandatanganan: z.string().optional().describe("Tanggal dokumen ditandatangani"),
        materai: z.boolean().default(true).describe("Penggunaan materai pada dokumen"),
        nilaiMaterai: z.string().default("Rp10.000").describe("Nilai materai yang digunakan"),
    }).describe("Formalitas dokumen sesuai ketentuan Indonesia"),
});

// Add custom validator function for document structure
export const validateDocumentStructure = (document: any): boolean => {
    // Validate that "judul" elements only appear on cover pages
    const nonCoverPagesWithJudul = document.pages?.filter(
        (page: any) => page.pageType !== "cover" && page.elements?.some(
            (element: any) => element.type === "judul"
        )
    );

    if (nonCoverPagesWithJudul?.length > 0) {
        console.error("Document structure error: 'judul' elements found on non-cover pages");
        return false;
    }

    // Validate proper introduction format without document numbers
    const introductionPages = document.pages?.filter(
        (page: any) => page.pageType === "pembukaan"
    );

    if (introductionPages?.length > 0) {
        // Check for proper introduction format
        const hasProperFormat = introductionPages.every((page: any) => {
            // Logic to verify introduction format
            const pembukaan = page.elements?.find(
                (element: any) => element.type === "pembukaan"
            );

            return pembukaan && !pembukaan.content.includes("Nomor:");
        });

        if (!hasProperFormat) {
            console.error("Document structure error: Introduction format is incorrect");
            return false;
        }
    }

    return true;
};
