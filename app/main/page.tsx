"use client";
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { legalDocumentPageSchema } from '../api/v2/generate/route';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// CSS styles for our components
const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    heading: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '24px',
    },
    formContainer: {
        marginBottom: '32px',
    },
    textarea: {
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minHeight: '150px',
        marginBottom: '16px',
    },
    button: {
        backgroundColor: '#0070f3',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    exportButton: {
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
        marginLeft: '16px',
    },
    exportButtonDisabled: {
        backgroundColor: '#94a3b8',
        cursor: 'not-allowed',
    },
    buttonContainer: {
        display: 'flex',
        marginBottom: '16px',
    },
    errorBox: {
        padding: '16px',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        borderRadius: '4px',
        marginBottom: '32px',
    },
    documentContainer: {
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        padding: '24px',
        backgroundColor: 'white',
    },
    documentHeading: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '16px',
    },
    pageContainer: {
        marginBottom: '32px',
        padding: '16px',
    },
    statusHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '16px',
    },
    badge: {
        padding: '4px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
    },
    badgeSOS: {
        backgroundColor: '#10b981',
    },
    badgeMID: {
        backgroundColor: '#3b82f6',
    },
    badgeEOS: {
        backgroundColor: '#ef4444',
    },
    pageStatus: {
        fontSize: '14px',
        color: '#6b7280',
    },
    headerText: {
        textAlign: 'center' as const,
        fontWeight: 'bold',
        marginBottom: '16px',
    },
    element: {
        marginBottom: '16px',
    },
    elementTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '8px',
    },
    footerText: {
        textAlign: 'center' as const,
        marginTop: '32px',
        paddingTop: '8px',
        borderTop: '1px solid #e5e5e5',
        fontSize: '14px',
        color: '#6b7280',
    },
    divider: {
        margin: '24px 0',
        border: 'none',
        borderTop: '1px solid #e5e5e5',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        margin: '32px 0',
        flexDirection: 'column' as const,
        alignItems: 'center',
    },
    spinner: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        borderLeftColor: '#0070f3',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px',
    },
};

export default function Page() {
    const [prompt, setPrompt] = useState<string>('');
    const [previousState, setPreviousState] = useState<any>(null);
    const [generatedPages, setGeneratedPages] = useState<Array<any>>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [exportingPdf, setExportingPdf] = useState<boolean>(false);
    const [exportProgress, setExportProgress] = useState<string>('');

    const { object: documentObject, submit, isLoading, error: objectError } = useObject({
        api: `/api/new-generate`,
        schema: legalDocumentPageSchema
    });

    const bottomRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setError(null);

        try {
            await submit({
                promptText: prompt,
                previousState: previousState
            });
        } catch (err) {
            console.error("Error submitting prompt:", err);
            setError("Failed to generate document. Please try again.");
            setIsGenerating(false);
        }
    };

    const continueGeneration = async () => {
        if (!documentObject || isLoading) return;

        setPreviousState(documentObject);
        setGeneratedPages(prev => [...prev, documentObject]);

        if (documentObject.status?.marker !== "EOS") {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await submit({
                    promptText: "Please continue generating the next part of the document.",
                    previousState: documentObject
                });
            } catch (err) {
                console.error("Error continuing document generation:", err);
                setError("Failed to continue document generation. Please try again.");
                setIsGenerating(false);
            }
        } else {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (documentObject && !isLoading) {
            if (isGenerating && documentObject.status?.marker !== "EOS") {
                continueGeneration();
            } else if (documentObject.status?.marker === "EOS") {
                setGeneratedPages(prev => [...prev, documentObject]);
                setIsGenerating(false);
            }
        }
    }, [documentObject, isLoading]);

    useEffect(() => {
        if (bottomRef.current && isGenerating) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [generatedPages]);

    const handleExportPDF = async () => {
        if (generatedPages.length === 0) return;

        setExportingPdf(true);
        setExportProgress('Preparing document for export...');

        try {
            // Combine metadata from all pages for a more complete document
            const combinedMetadata = generatedPages.reduce((acc, page) => {
                if (page.metadata) {
                    // Merge with preference to later values for most properties
                    // except where earlier values might be more complete
                    return {
                        ...acc,
                        ...page.metadata,
                        // Keep the title from the first page if it exists
                        title: acc.title || page.metadata.title
                    };
                }
                return acc;
            }, {});

            setExportProgress('Generating PDF document...');

            const response = await fetch('/api/export-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pages: generatedPages,
                    metadata: combinedMetadata
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate PDF');
            }

            setExportProgress('Downloading document...');

            // Get the PDF as a blob
            const blob = await response.blob();

            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);

            // Generate filename based on document details
            const title = combinedMetadata.title || 'legal-document';
            const sanitizedTitle = title
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '_')
                .toLowerCase()
                .substring(0, 50);

            const filename = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setExportProgress('');
        } catch (err) {
            console.error('Error exporting to PDF:', err);
            setError(`Failed to export document as PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setExportingPdf(false);
        }
    };

    const renderDocumentElement = (element: any) => {
        switch (element.type) {
            case 'judul':
                return (
                    <div style={styles.element}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {element.content}
                        </ReactMarkdown>
                    </div>
                );

            case 'pasal':
                return (
                    <div style={styles.element}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                            {element.id || element.number} {element.title}
                        </h2>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{element.content}</ReactMarkdown>
                        {element.items && (
                            <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
                                {element.items.map((item: any, idx: number) => (
                                    <div key={idx} style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: "center" }}>
                                        <span style={{ fontWeight: 600 }}>{item.number} </span>
                                        <div>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'ayat':
                return (
                    <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
                        <div style={{ fontWeight: 'medium', marginBottom: '4px' }}>
                            {element.number} {element.title}
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{element.content}</ReactMarkdown>
                    </div>
                );

            case 'blok_tanda_tangan':
                return (
                    <div style={{ marginBottom: '16px', marginTop: '32px', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{element.title}</h3>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{element.content}</ReactMarkdown>
                        {element.signatureInfo && (
                            <div style={{ marginTop: '40px', marginBottom: '16px' }}>
                                <div>________________</div>
                                <div style={{ fontWeight: 'bold', marginTop: '16px' }}>{element.signatureInfo.name}</div>
                                <div>{element.signatureInfo.position}</div>
                                {element.signatureInfo.stampDuty && (
                                    <div style={{
                                        marginTop: '8px',
                                        display: 'inline-block',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                    }}>
                                        Materai {element.signatureInfo.stampDutyValue}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div style={styles.element}>
                        {element.title && <h3 style={styles.elementTitle}>{element.title}</h3>}
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{element.content}</ReactMarkdown>
                    </div>
                );
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Legal Document Generator</h1>

            <div style={styles.formContainer}>
                <form onSubmit={handleSubmit}>
                    <div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter details for your legal document..."
                            style={styles.textarea}
                            rows={6}
                            disabled={isGenerating || exportingPdf}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            type="submit"
                            style={{
                                ...styles.button,
                                ...(isGenerating || !prompt || exportingPdf ? styles.buttonDisabled : {})
                            }}
                            disabled={isGenerating || !prompt || exportingPdf}
                        >
                            {isLoading || isGenerating ? (isGenerating ? "Generating..." : "Submitting...") : "Generate Document"}
                        </button>

                        <button
                            type="button"
                            onClick={handleExportPDF}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                ...(exportingPdf || generatedPages.length === 0 ? {
                                    backgroundColor: '#94a3b8',
                                    cursor: 'not-allowed',
                                } : {})
                            }}
                            disabled={exportingPdf || generatedPages.length === 0}
                        >
                            {exportingPdf ? (
                                exportProgress || "Exporting..."
                            ) : "Export to PDF"}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div style={styles.errorBox}>
                    <p>{error}</p>
                </div>
            )}

            {generatedPages.length > 0 && (
                <div style={styles.documentContainer}>
                    <h2 style={styles.documentHeading}>Generated Document</h2>

                    {generatedPages.map((page, pageIndex) => (
                        <div
                            key={pageIndex}
                            style={{
                                ...styles.pageContainer,
                                backgroundColor: page.currentPage?.pageType === 'cover' ? '#f9fafb' : 'white'
                            }}
                        >
                            <div style={styles.statusHeader}>
                                <div
                                    style={{
                                        ...styles.badge,
                                        ...(page.status?.marker === "SOS" ? styles.badgeSOS :
                                            page.status?.marker === "EOS" ? styles.badgeEOS : styles.badgeMID)
                                    }}
                                >
                                    {page.status?.marker}
                                </div>
                                <div style={styles.pageStatus}>
                                    {page.currentPage?.pageType} - {page.status?.completionStatus}% complete
                                </div>
                            </div>

                            {page.currentPage?.header && (
                                <div style={styles.headerText}>
                                    <div>{page.currentPage.header}</div>
                                </div>
                            )}

                            {page.currentPage?.elements?.map((element: any, idx: number) => (
                                <div key={idx}>
                                    {renderDocumentElement(element)}
                                </div>
                            ))}

                            {page.currentPage?.footer && (
                                <div style={styles.footerText}>
                                    <div>{page.currentPage.footer}</div>
                                </div>
                            )}

                            <hr style={styles.divider} />
                        </div>
                    ))}
                </div>
            )}

            {isGenerating && (
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <div>Generating document...</div>
                </div>
            )}

            <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

            <div ref={bottomRef} />
        </div>
    );
}