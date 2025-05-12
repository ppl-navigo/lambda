import { NextRequest } from "next/server";
import { jsPDF } from "jspdf";
import { z } from 'zod';

export const maxDuration = 60;

// Define schema for PDF export request validation
const pdfExportSchema = z.object({
    pages: z.array(z.object({
        status: z.object({
            marker: z.enum(["SOS", "MID", "EOS"]).optional(),
            completionStatus: z.number().optional(),
            isComplete: z.boolean().optional()
        }).optional(),
        metadata: z.object({
            title: z.string().optional(),
            documentType: z.string().optional(),
            reference: z.string().optional(),
            date: z.string().optional(),
            version: z.string().optional(),
            language: z.string().optional(),
            jurisdiction: z.string().optional(),
            confidentialityLevel: z.string().optional()
        }).optional(),
        parties: z.array(z.object({
            type: z.string().optional(),
            name: z.string().optional(),
            legalForm: z.string().optional(),
            address: z.string().optional()
        })).optional(),
        currentPage: z.object({
            pageType: z.string().optional(),
            header: z.string().optional(),
            footer: z.string().optional(),
            elements: z.array(z.any()).optional()
        }).optional()
    })).min(1),
    metadata: z.object({
        title: z.string().optional(),
        documentType: z.string().optional(),
        reference: z.string().optional(),
        date: z.string().optional(),
        version: z.string().optional(),
        language: z.string().optional(),
        jurisdiction: z.string().optional(),
        confidentialityLevel: z.string().optional()
    }).optional()
});

// Helper function to format date in Indonesian format
function formatIndonesianDate(dateStr: string): string {
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

// Helper function for Indonesian month names
function getIndonesianMonth(monthIndex: number): string {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[monthIndex];
}

// Process markdown for PDF rendering
function processMarkdown(text: string): string {
    if (!text) return "";

    return text
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
        // Simplify lists
        .replace(/^[\*\-\+]\s+/gm, '• ');
}

// Function to add text with proper wrapping
function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number, fontStyle: string = 'normal'): number {
    const cleanText = processMarkdown(text);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);

    const lines = doc.splitTextToSize(cleanText, maxWidth);
    let currentY = y;

    for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], x, currentY);
        currentY += fontSize / 2 + 2; // Line height
    }

    return currentY + 3; // Return the new Y position
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        const requestData = await req.json();

        // Validate the request data against our schema
        const validationResult = pdfExportSchema.safeParse(requestData);
        if (!validationResult.success) {
            console.error("Validation error:", validationResult.error);
            return new Response(JSON.stringify({
                error: "Invalid data format",
                details: validationResult.error.format()
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const { pages, metadata } = validationResult.data;

        // Combine metadata from request and pages
        const combinedMetadata = {
            ...(metadata || {}),
            ...pages.reduce((acc, page) => {
                if (page.metadata) {
                    return { ...acc, ...page.metadata };
                }
                return acc;
            }, {})
        };

        const documentTitle = combinedMetadata.title || 'Legal Document';
        const documentType = combinedMetadata.documentType || 'Agreement';
        const documentReference = combinedMetadata.reference || '';
        const documentDate = combinedMetadata.date ? formatIndonesianDate(combinedMetadata.date) : formatIndonesianDate(new Date().toISOString());

        // Create PDF document with enhanced settings
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            putOnlyUsedFonts: true,
            compress: true
        });

        // PDF layout constants
        const margin = 20;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const contentWidth = pageWidth - (margin * 2);

        // Set initial cursor position
        let y = margin;
        let pageNum = 1;

        // Add document header with proper company styling
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        const title = documentTitle;
        const titleWidth = doc.getStringUnitWidth(title) * 16 / doc.internal.scaleFactor;
        doc.text(title, (pageWidth - titleWidth) / 2, y);
        y += 10;

        // Add document type and reference
        if (documentType && documentType !== 'undefined') {
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            const typeText = documentType;
            const typeWidth = doc.getStringUnitWidth(typeText) * 12 / doc.internal.scaleFactor;
            doc.text(typeText, (pageWidth - typeWidth) / 2, y);
            y += 8;
        }

        if (documentReference && documentReference !== 'undefined') {
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const refText = `Nomor: ${documentReference}`;
            const refWidth = doc.getStringUnitWidth(refText) * 11 / doc.internal.scaleFactor;
            doc.text(refText, (pageWidth - refWidth) / 2, y);
            y += 8;
        }

        // Add date
        doc.setFontSize(11);
        const dateText = `Tanggal: ${documentDate}`;
        const dateWidth = doc.getStringUnitWidth(dateText) * 11 / doc.internal.scaleFactor;
        doc.text(dateText, (pageWidth - dateWidth) / 2, y);
        y += 10;

        // Add parties if available
        const parties: any[] = [];
        pages.forEach(page => {
            if (page.parties && Array.isArray(page.parties)) {
                page.parties.forEach(party => {
                    // Check if this party is already in our collection
                    if (!parties.find(p => p.name === party.name)) {
                        parties.push(party);
                    }
                });
            }
        });

        if (parties.length > 0) {
            y += 5;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            const partiesTitle = "ANTARA:";
            doc.text(partiesTitle, margin, y);
            y += 8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            parties.forEach((party, index) => {
                doc.setFont("helvetica", "bold");
                doc.text(`${party.type || (index === 0 ? "PIHAK PERTAMA" : "PIHAK KEDUA")}:`, margin, y);
                y += 6;

                doc.setFont("helvetica", "normal");
                if (party.name) {
                    doc.text(party.name, margin + 5, y);
                    y += 5;
                }
                if (party.legalForm) {
                    doc.text(`Bentuk Badan Hukum: ${party.legalForm}`, margin + 5, y);
                    y += 5;
                }
                if (party.address) {
                    doc.text(`Alamat: ${party.address}`, margin + 5, y);
                    y += 5;
                }

                y += 5; // Extra spacing between parties
            });
        }

        // Function to check and add new page if needed
        const checkAndAddNewPage = (requiredSpace = 20): boolean => {
            if (y + requiredSpace > pageHeight - margin) {
                doc.addPage();
                pageNum++;
                y = margin;

                // Add page number at the bottom
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text(`Halaman ${pageNum}`, pageWidth - margin - 15, pageHeight - margin);
                return true;
            }
            return false;
        };

        // Function to render a document element
        const renderElement = (element: any): void => {
            if (!element) return;

            checkAndAddNewPage();

            switch (element.type) {
                case 'judul':
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    const titleText = element.content || '';
                    const titleWidth = doc.getStringUnitWidth(titleText) * 16 / doc.internal.scaleFactor;
                    doc.text(titleText, (pageWidth - titleWidth) / 2, y);
                    y += 12;
                    break;

                case 'pasal':
                    checkAndAddNewPage(30);
                    doc.setFontSize(13);
                    doc.setFont("helvetica", "bold");
                    const pasalTitle = `${element.id || element.number || ''} ${element.title || ''}`.trim();
                    doc.text(pasalTitle, margin, y);
                    y += 8;

                    if (element.content) {
                        y = addWrappedText(doc, element.content, margin, y, contentWidth, 11);
                    }

                    // Process items if available
                    if (element.items && Array.isArray(element.items)) {
                        element.items.forEach((item: any) => {
                            const itemText = `${item.number || ''} ${item.content || ''}`.trim();
                            y = addWrappedText(doc, itemText, margin + 5, y, contentWidth - 10, 11);
                        });
                    }

                    y += 5;
                    break;

                case 'ayat':
                    checkAndAddNewPage(20);
                    const ayatText = `${element.number || ''} ${element.content || ''}`.trim();
                    y = addWrappedText(doc, ayatText, margin + 5, y, contentWidth - 10, 11);
                    y += 5;
                    break;

                case 'blok_tanda_tangan':
                    checkAndAddNewPage(60);
                    y += 10;

                    if (element.title) {
                        doc.setFontSize(12);
                        doc.setFont("helvetica", "bold");
                        const signTitleWidth = doc.getStringUnitWidth(element.title) * 12 / doc.internal.scaleFactor;
                        doc.text(element.title, (pageWidth - signTitleWidth) / 2, y);
                        y += 8;
                    }

                    if (element.content) {
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "normal");
                        const signContentWidth = doc.getStringUnitWidth(element.content) * 11 / doc.internal.scaleFactor;
                        doc.text(element.content, (pageWidth - signContentWidth) / 2, y);
                        y += 30; // Space for signature
                    }

                    // Draw signature line and box
                    if (element.signatureInfo) {
                        const signatureInfo = element.signatureInfo;
                        const signX = pageWidth / 2;

                        // Line
                        doc.line(signX - 30, y, signX + 30, y);
                        y += 5;

                        // Materai stamp indication if needed
                        if (signatureInfo.stampDuty) {
                            doc.setFontSize(9);
                            doc.setFont("helvetica", "italic");
                            const stampText = signatureInfo.stampDutyValue ?
                                `[Materai ${signatureInfo.stampDutyValue}]` : '[Materai]';
                            const stampWidth = doc.getStringUnitWidth(stampText) * 9 / doc.internal.scaleFactor;
                            doc.text(stampText, signX - (stampWidth / 2), y);
                            y += 5;
                        }

                        // Name and position
                        if (signatureInfo.name) {
                            doc.setFontSize(11);
                            doc.setFont("helvetica", "bold");
                            const nameWidth = doc.getStringUnitWidth(signatureInfo.name) * 11 / doc.internal.scaleFactor;
                            doc.text(signatureInfo.name, signX - (nameWidth / 2), y);
                            y += 5;
                        }

                        if (signatureInfo.position) {
                            doc.setFontSize(10);
                            doc.setFont("helvetica", "normal");
                            const posWidth = doc.getStringUnitWidth(signatureInfo.position) * 10 / doc.internal.scaleFactor;
                            doc.text(signatureInfo.position, signX - (posWidth / 2), y);
                            y += 10;
                        }
                    }

                    y += 15;
                    break;

                case 'pembukaan':
                case 'konsideran':
                case 'dasar_hukum':
                case 'nomor_dokumen':
                case 'butir':
                case 'daftar':
                case 'tabel':
                case 'referensi_lampiran':
                default:
                    if (element.title) {
                        doc.setFontSize(12);
                        doc.setFont("helvetica", "bold");
                        doc.text(element.title, margin, y);
                        y += 5;
                    }

                    if (element.content) {
                        y = addWrappedText(doc, element.content, margin, y, contentWidth, 11);
                    }

                    y += 5;
                    break;
            }
        };

        // Process each page
        for (const page of pages) {
            // Add page header if available
            if (page.currentPage?.header) {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                const headerWidth = doc.getStringUnitWidth(page.currentPage.header) * 12 / doc.internal.scaleFactor;
                doc.text(page.currentPage.header, (pageWidth - headerWidth) / 2, y);
                y += 8;
            }

            // Add page elements
            if (page.currentPage?.elements && Array.isArray(page.currentPage.elements)) {
                for (const element of page.currentPage.elements) {
                    renderElement(element);
                }
            }

            // Add page footer if available
            if (page.currentPage?.footer) {
                // Make sure we're at the bottom of the page
                const footerPosition = pageHeight - margin - 10;
                if (y < footerPosition) {
                    y = footerPosition;
                }

                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                const footerWidth = doc.getStringUnitWidth(page.currentPage.footer) * 10 / doc.internal.scaleFactor;
                doc.text(page.currentPage.footer, (pageWidth - footerWidth) / 2, y);
            }

            // Check if we need to add a page break
            if (page !== pages[pages.length - 1]) {
                doc.addPage();
                pageNum++;
                y = margin;
            }
        }

        // Add page numbers on all pages
        const totalPages = doc.internal.pages.length;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text(`Halaman ${i} dari ${totalPages}`, margin, pageHeight - margin);
        }

        // Get PDF as base64 string
        const pdfOutput = doc.output('arraybuffer');

        // Generate filename based on document details
        const sanitizedTitle = documentTitle
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_')
            .toLowerCase()
            .substring(0, 50);

        const filename = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;

        // Return the PDF
        return new Response(pdfOutput, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    } catch (error: any) {
        console.error("Error generating PDF:", error);

        return new Response(JSON.stringify({
            error: "Failed to generate PDF",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }
}
