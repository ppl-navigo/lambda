"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Pencil, Save } from "lucide-react"; // Add RefreshCcw icon
import { useMouStore } from "@/app/store/useMouStore";
import MarkdownRenderer from "../utils/markdownRenderer";
import { TextStreamer } from "../utils/textStreamer";

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<StreamerProps> = ({ pdfUrl }) => {
  const { pagesContent, updatePageContent } = useMouStore(); // Subscribe to pagesContent and its version
  const [revisedText, setRevisedText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEdited, setShowEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerateEditedText = async () => {
    console.log("Generating handling generated edited text...");
    // Hanya generate jika belum ada revised text
    if (!revisedText) {
      setLoading(true);
      try {
        const fullText = pagesContent
          .map((page) => `---PAGE_START_${page.sectionNumber}---\n${page.content}`)
          .join("\n");
        
        TextStreamer.simulateStream(fullText, 100, 100, (chunk) => {
          setRevisedText((prev) => prev + chunk);
        });
      } finally {
        setLoading(false);
      }
    }
    setShowEdited(true);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [revisedText, isEditing]);

  useEffect(() => {
    if (showEdited && !loading && !isEditing) {
      console.log("Updating revised text...");
      const newText = pagesContent
        .map(p => `---PAGE_START_${p.sectionNumber}---\n${p.content}`)
        .join('\n');
      setRevisedText(newText);
    }
  }, [pagesContent, showEdited, loading, isEditing]);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Saving: parse revisedText and update the store
      const updatedSections = revisedText
        .split(/---PAGE_START_(\d+)---/)
        .filter((_, i) => i > 0) // remove any junk before the first marker
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
          {loading ? "Processing..." : "Revised Document" }
        </Button>
      </div>

      {/* Floating Buttons */}
      {showEdited && (
        <div className="fixed bottom-[10px] right-[0px] z-50 flex justify-end w-full pr-6">
          <div className="flex ml-auto space-x-2">

            {/* Edit/Save Button - Only shown if revisedText exists */}
            {revisedText && useMouStore.getState().riskyClauses.length > 0 && (
              <Button
                data-testid="edit-toggle-button"
                onClick={handleToggleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md p-2"
                size="icon"
              >
                {isEditing ? <Save className="w-5 h-5" data-testid="save-icon" /> : <Pencil className="w-5 h-5" data-testid="pencil-icon" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content Viewer */}
      <div className="flex-1 overflow-auto p-4">
        {!showEdited ? (
          <iframe src={pdfUrl} className="w-full h-full border rounded" title="Original PDF" />
        ) : revisedText && useMouStore.getState().riskyClauses.length > 0 ? (
          <div className="space-y-4">
            {!isEditing ? (
              <>
                <MarkdownRenderer text={revisedText} />
                {/* Add a gap at the end of the revised text */}
                <div className="h-8" />
              </>
            ) : (
              <>
                {revisedText
                  .split(/---PAGE_START_(\d+)---/)
                  .filter((_, i) => i > 0)
                  .reduce<JSX.Element[]>((acc, curr, idx, arr) => {
                    if (idx % 2 === 0) {
                      const sectionNumber = parseInt(curr);
                      const content = arr[idx + 1]?.trim() ?? "";

                      acc.push(
                        <div key={`edit-page-${sectionNumber}`} className="mb-6">
                          <div className="text-sm text-blue-400 font-semibold mb-2">
                            Page {sectionNumber}
                          </div>
                          <Textarea
                            className="w-full font-sans text-white bg-transparent border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 p-2 leading-relaxed whitespace-pre-wrap"
                            value={content}
                            onChange={(e) => {
                              const updated = revisedText
                                .split(/---PAGE_START_(\d+)---/)
                                .filter((_, i) => i > 0)
                                .reduce((textAcc, val, i, arr) => {
                                  if (i % 2 === 0) {
                                    const pageNum = val;
                                    const contentValue =
                                      parseInt(pageNum) === sectionNumber
                                        ? e.target.value
                                        : arr[i + 1] ?? "";
                                    return (
                                      textAcc +
                                      `---PAGE_START_${pageNum}---\n` +
                                      contentValue.trim() +
                                      "\n"
                                    );
                                  }
                                  return textAcc;
                                }, "");

                              setRevisedText(updated.trim());
                            }}
                            rows={Math.max(3, content.split("\n").length)}
                          />
                        </div>
                      );
                    }
                    return acc;
                  }, [])}
              </>
            )}
          </div>
        ) : loading ? (
          <p className="text-gray-400 animate-pulse">Generating revised text...</p>
        ) : pagesContent.length === 0 ? (
          <p className="text-yellow-400">No content loaded yet.</p>
        ) : useMouStore.getState().riskyClauses.length === 0 ? (
          <p className="text-green-400">No risky clauses found. This document may not need any revisions.</p>
        ) : (
          <p className="text-yellow-400">No content loaded yet.</p>
        )}   
      </div>
    </div>
  );
};

export default Streamer;