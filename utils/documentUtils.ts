/**
 * Utility functions for document processing and handling
 */

/**
 * Formats a date string into Indonesian format (day Month year)
 */
export function formatIndonesianDate(dateStr: string): string {
    if (!dateStr) return '';

    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = getIndonesianMonth(date.getMonth());
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch (e) {
        return dateStr;
    }
}

/**
 * Returns the Indonesian name for the given month index (0-11)
 */
export function getIndonesianMonth(monthIndex: number): string {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[monthIndex];
}

/**
 * Extracts and combines metadata from multiple document pages
 */
export function combineDocumentMetadata(pages: any[]): any {
    return pages.reduce((acc, page) => {
        if (page.metadata) {
            // Merge with preference to non-empty values
            const merged = { ...acc };

            for (const [key, value] of Object.entries(page.metadata)) {
                if (value && (!merged[key] || merged[key] === '')) {
                    merged[key] = value;
                }
            }

            return merged;
        }
        return acc;
    }, {});
}

/**
 * Creates a sanitized filename from document title
 */
export function createDocumentFilename(title: string | undefined): string {
    const baseTitle = title || 'legal-document';
    const sanitized = baseTitle
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .substring(0, 50);

    return `${sanitized}_${new Date().toISOString().slice(0, 10)}.pdf`;
}

/**
 * Process markdown text for PDF rendering
 */
export function processMarkdownForPdf(markdown: string): string {
    if (!markdown) return '';

    return markdown
        // Remove markdown headings
        .replace(/#{1,6}\s*(.*?)$/gm, '$1')
        // Remove bold/italic
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        // Remove links
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Process lists
        .replace(/^[\*\-\+]\s+/gm, '• ');
}

/**
 * Extract all parties from document pages
 */
export function extractPartiesFromPages(pages: any[]): any[] {
    const uniqueParties: any[] = [];
    const partyNames = new Set<string>();

    for (const page of pages) {
        if (page.parties && Array.isArray(page.parties)) {
            for (const party of page.parties) {
                if (party.name && !partyNames.has(party.name)) {
                    partyNames.add(party.name);
                    uniqueParties.push(party);
                }
            }
        }
    }

    return uniqueParties;
}

/**
 * Extracts the document reference number from metadata or generates one
 */
export function getDocumentReference(metadata: any): string {
    if (metadata?.reference) return metadata.reference;

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    return `DOC/${year}/${month}/${randomNum}`;
}

/**
 * Gets the document type in a standardized format
 */
export function getDocumentType(metadata: any): string {
    if (!metadata?.documentType) return 'Dokumen Legal';

    // Standard document type prefixes
    const stdTypes = ['perjanjian', 'mou', 'surat', 'akta', 'kontrak'];
    const lcDocType = metadata.documentType.toLowerCase();

    // If the document type already starts with a standard prefix, return as is
    for (const prefix of stdTypes) {
        if (lcDocType.startsWith(prefix)) {
            return metadata.documentType;
        }
    }

    // Otherwise, add a default prefix
    return `Perjanjian ${metadata.documentType}`;
}
