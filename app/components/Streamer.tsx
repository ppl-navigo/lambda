"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Pencil, Save } from "lucide-react";
import { useMouStore } from "@/app/store/useMouStore";
import ContentViewer from "./ContentViewer";

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
  
  const handleGenerateEditedText = async () => {
    if (!revisedText) {
      setLoading(true);
      try {
        const fullText = pagesContent
          .map((page) => `---PAGE_START_${page.sectionNumber}---\n${page.content}`)
          .join("\n");
        // Simulate streaming and set revisedText
        // (Replace this with your real streamer)
        import("../utils/textStreamer").then(({ TextStreamer }) => {
          TextStreamer.simulateStream(fullText, 100, 100, (chunk: string) => {
            setRevisedText((prev) => prev + chunk);
          });
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
      const newText = pagesContent
        .map(p => `---PAGE_START_${p.sectionNumber}---\n${p.content}`)
        .join('\n');
      setRevisedText(newText);
    }
  }, [pagesContent, showEdited, loading, isEditing]);

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
        <div className="fixed bottom-[10px] right-[0px] z-50 flex justify-end w-full pr-6">
          <div className="flex ml-auto space-x-2">
            {revisedText && riskyClausesLength > 0 && (
              <Button
                data-testid="edit-toggle-button"
                onClick={handleToggleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md p-2"
                size="icon"
              >
                {isEditing
                  ? <Save className="w-5 h-5" data-testid="save-icon" />
                  : <Pencil className="w-5 h-5" data-testid="pencil-icon" />}
              </Button>
            )}
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