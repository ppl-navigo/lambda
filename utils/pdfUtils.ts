/**
 * Utility functions for PDF generation and handling.
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
 * Extracts all parties information from document pages
 */
export function extractPartiesFromPages(pages: any[]): any[] {
    const parties: any[] = [];

    for (const page of pages) {
        if (page.parties && Array.isArray(page.parties)) {
            for (const party of page.parties) {
                // Check if this party is already in our list (by name)
                const existingParty = parties.find(p => p.name === party.name);
                if (!existingParty) {
                    parties.push(party);
                }
            }
        }
    }

    return parties;
}

/**
 * Creates a formatted title for the document based on metadata
 */
export function createFormattedTitle(metadata: any): string {
    let title = metadata?.title || 'Legal Document';

    if (metadata?.documentType && !title.includes(metadata.documentType)) {
        title = `${metadata.documentType}: ${title}`;
    }

    return title;
}

/**
 * Sanitizes text for PDF rendering (removes problematic characters)
 */
export function sanitizeTextForPdf(text: string): string {
    if (!text) return '';

    // Remove control characters that might cause PDF issues
    return text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Converts markdown text to plain text suitable for PDF
 */
export function markdownToPlainText(markdown: string): string {
    if (!markdown) return '';

    return markdown
        // Handle headers
        .replace(/#{1,6}\s+(.*?)$/gm, '$1')
        // Handle bold
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Handle italic
        .replace(/\*(.*?)\*/g, '$1')
        // Handle links
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Handle bullet lists
        .replace(/^\s*[-*+]\s+(.*?)$/gm, '• $1')
        // Handle numbered lists
        .replace(/^\s*\d+\.\s+(.*?)$/gm, '• $1')
        // Handle blockquotes
        .replace(/^\s*>\s+(.*?)$/gm, '$1')
        // Handle horizontal rules
        .replace(/^-{3,}|^\*{3,}|^_{3,}$/gm, '----------------------------');
}
