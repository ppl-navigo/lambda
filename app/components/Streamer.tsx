"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Pencil, Save, Download } from "lucide-react";
import { useMouStore } from "@/app/store/useMouStore";
import ContentViewer from "./ContentViewer";
import { Document, Packer, Paragraph, TextRun } from "docx";

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<StreamerProps> = ({ pdfUrl }) => {
  const { pagesContent, updatePageContent } = useMouStore();
  const [revisedText, setRevisedText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEdited, setShowEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamCtrl = useRef<AbortController | null>(null);
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  /* ---------- start stream ---------- */
  const handleGenerateEditedText = async () => {
    if (streamCtrl.current) return;              // already running
    setShowEdited(true);

    setLoading(true);
    try {
      const fullText = pagesContent
        .map(p => `---PAGE_START_${p.sectionNumber}---\n${p.content}`)
        .join("\n");

      /* create a fresh controller for this run */
      const ctrl = new AbortController();
      streamCtrl.current = ctrl;

      setRevisedText("");                        // clear before streaming
      const { TextStreamer } = await import("../utils/textStreamer");

      TextStreamer.simulateStream(
        fullText,
        100,
        100,
        chunk => {
          if (!ctrl.signal.aborted) {
            setRevisedText(prev => prev + chunk);
          }
        }
      );
    } catch (error) {
      setRevisedText("No content loaded yet");
      setLoading(false);
      streamCtrl.current = null;
    } finally {
      setLoading(false);
      streamCtrl.current = null;
    }
  };

  const handleDownload = async () => {
    if (selectedPages.length === 0) return;
  
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt
            },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 28,
              bold: true,
              color: "000000",
            },
            paragraph: {
              spacing: { before: 400, after: 200 },
              alignment: "CENTER",
            },
          },
          {
            id: "Clause",
            name: "Clause Style",
            basedOn: "Normal",
            run: {
              size: 24,
            },
            paragraph: {
              indent: { firstLine: 400 },
              spacing: { before: 150, after: 150 },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              },
            },
          },
          children: pagesContent
            .filter((page) => selectedPages.includes(page.sectionNumber))
            .flatMap((page) => {
              const contentLines = page.content.split("\n");
              return contentLines.map((line) => {
                // Handle empty lines
                if (line.trim() === "") return new Paragraph({ children: [] });
  
                // Handle main title
                if (line.startsWith("# ")) {
                  return new Paragraph({
                    text: line.replace("# ", ""),
                    style: "Heading1",
                    border: { bottom: { style: "single", size: 8, color: "000000" } },
                  });
                }
  
                // Handle section headers
                if (line.startsWith("## ")) {
                  return new Paragraph({
                    text: line.replace("## ", ""),
                    bold: true,
                    underline: {},
                    spacing: { before: 300, after: 150 },
                  });
                }
  
                // Handle bold text with **
                const boldRegex = /\*\*(.*?)\*\*/g;
                const textRuns: TextRun[] = [];
                let lastIndex = 0;
                let match;
  
                while ((match = boldRegex.exec(line)) !== null) {
                  // Add text before bold
                  if (match.index > lastIndex) {
                    textRuns.push(
                      new TextRun({ text: line.substring(lastIndex, match.index) })
                    );
                  }
  
                  // Add bold text
                  textRuns.push(
                    new TextRun({
                      text: match[1],
                      bold: true,
                    })
                  );
  
                  lastIndex = match.index + match[0].length;
                }
  
                // Add remaining text
                if (lastIndex < line.length) {
                  textRuns.push(new TextRun({ text: line.substring(lastIndex) }));
                }
  
                // Handle bullet points
                if (line.startsWith("* ")) {
                  return new Paragraph({
                    children: textRuns,
                    bullet: { level: 0 },
                    spacing: { before: 100, after: 100 },
                  });
                }
  
                // Handle clauses starting dengan 'Bahwa'
                if (line.startsWith("Bahwa ")) {
                  return new Paragraph({
                    children: textRuns,
                    style: "Clause",
                  });
                }
  
                // Handle address lines
                if (line.match(/(Alamat|Nama|Jabatan) :/)) {
                  return new Paragraph({
                    children: textRuns,
                    indent: { left: 400 },
                    spacing: { before: 50, after: 50 },
                  });
                }
  
                // Default paragraph
                return new Paragraph({
                  children: textRuns,
                  spacing: { before: 100, after: 100 },
                });
              });
            }),
        },
      ],
    });
  
    // Generate Blob and trigger download
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Revised Document - ${new Date().toISOString().split("T")[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Reset selection
    setShowPageSelection(false);
    setSelectedPages([]);
  };

  const handlePageSelect = (pageNumber: number) => {
    setSelectedPages(prev =>
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber]
    );
  };

  const selectAllPages = () => {
    setSelectedPages(pagesContent.map(p => p.sectionNumber));
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [revisedText, isEditing]);

  /* ---------- stop the stream whenever we rebuild text ---------- */
  useEffect(() => {
    if (showEdited && !isEditing) {
      // 1. cancel old stream
      streamCtrl.current?.abort();
      streamCtrl.current = null;

      // 2. rebuild from fresh pagesContent
      const newText = pagesContent
        .map(p => `---PAGE_START_${p.sectionNumber}---\n${p.content}`)
        .join("\n");
      setRevisedText(newText);
    }
  }, [pagesContent, showEdited, loading, isEditing]);

  /* ---------- also abort on unmount ---------- */
  useEffect(() => () => streamCtrl.current?.abort(), []);

  const handleToggleEdit = () => {
    if (isEditing) {
      const updatedSections = revisedText
        .split(/---PAGE_START_(\d+)---/)
        .filter((_, i) => i > 0)
        .reduce<{ sectionNumber: number; content: string }[]>((acc, curr, idx, arr) => {
          if (idx % 2 === 0) {
            const sectionNumber = parseInt(curr);
            const content = arr[idx + 1]?.trim() ?? "";
            acc.push({ sectionNumber, content: content });
          }
          return acc;
        }, []);
      updatedSections.forEach(({ sectionNumber, content }) => {
        updatePageContent(sectionNumber, content);
      });
    }
    setIsEditing((prev) => !prev);
  };

  const riskyClausesLength = useMouStore.getState().riskyClauses.length;

  return (
    <div className="h-full w-full bg-gray-900 border-l border-gray-700 transition-all duration-300 flex flex-col relative">
      {/* Topbar */}
      <div className="flex w-full border-b border-gray-700">
        <Button
          className={`flex-1 px-4 py-2 bg-black text-white ${!showEdited ? "bg-gray-800" : "bg-gray-600"}`}
          onClick={() => setShowEdited(false)}
        >
          Original PDF
        </Button>
        <div className="border-l border-gray-700 h-full"></div>
        <Button
          className={`flex-1 px-4 py-2 bg-black text-white ${showEdited ? "bg-gray-800" : "bg-gray-600"}`}
          onClick={handleGenerateEditedText}
          disabled={loading}
        >
          {loading ? "Processing..." : "Revised Document"}
        </Button>
      </div>

      {/* Floating Buttons */}
      {showEdited && (
        <div className="fixed bottom-[10px] right-8 z-50 flex justify-end w-full pr-6">
          <div className="flex ml-auto space-x-2">
            {revisedText && riskyClausesLength > 0 && (
              <>
                <Button
                  data-testid="edit-toggle-button"
                  onClick={handleToggleEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md p-2"
                  size="icon"
                >
                  {isEditing ? (
                    <Save className="w-5 h-5" data-testid="save-icon" />
                  ) : (
                    <Pencil className="w-5 h-5" data-testid="pencil-icon" />
                  )}
                </Button>
                <Button
                  onClick={() => setShowPageSelection(true)}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md p-2"
                  size="icon"
                  data-testid="download-button"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Page Selection Modal */}
      {showPageSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-white mb-4">Select Pages to Download</h3>
            <div className="max-h-96 overflow-y-auto mb-4">
              {pagesContent.map(page => (
                <label key={page.sectionNumber} className="flex items-center space-x-2 mb-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.sectionNumber)}
                    onChange={() => handlePageSelect(page.sectionNumber)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span>Page {page.sectionNumber}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between mb-4">
              <Button
                onClick={selectAllPages}
                className="bg-gray-600 hover:bg-gray-700 text-sm"
              >
                Select All
              </Button>
              <Button
                onClick={deselectAllPages}
                className="bg-gray-600 hover:bg-gray-700 text-sm"
              >
                Deselect All
              </Button>
            </div>
            <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setShowPageSelection(true)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md p-2"
              size="icon"
              aria-label="download-button"
            >
              <Download className="w-5 h-5" />
            </Button>
              <Button
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-700"
                disabled={selectedPages.length === 0}
              >
                Download ({selectedPages.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Viewer as component */}
      <div className="flex-1 overflow-auto p-4">
      <ContentViewer
        mode={showEdited ? "revised" : "original"}
        pdfUrl={pdfUrl}
        revisedText={revisedText}
        isEditing={isEditing}
        setRevisedText={setRevisedText}
        loading={loading}
        pagesContent={pagesContent}
        riskyClausesLength={riskyClausesLength}
      />
      </div>
    </div>
  );
};

export default Streamer;