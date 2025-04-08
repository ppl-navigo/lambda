"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Pencil, Save } from "lucide-react"; // 🧠 Import ikon dari lucide

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<StreamerProps> = ({ pdfUrl }) => {
  const [revisedText, setRevisedText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEdited, setShowEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerateEditedText = async () => {
    if (revisedText) {
      setShowEdited(true);
      return;
    }

    setLoading(true);
    setRevisedText("");

    try {
      const response = await fetch("/api/mou-revision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl }),
      });

      if (!response.body) throw new Error("No response body");

      setShowEdited(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setRevisedText((prev) => prev + chunk);
      }

      console.log("✅ Full Revised Text:", fullText.substring(0, 1000));
    } catch (error) {
      console.error("❌ Error generating revised text:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [revisedText, isEditing]);

  const handleToggleEdit = () => {
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
          {loading ? "Processing..." : revisedText ? "Revised Text" : "Generate Revised Text"}
        </Button>
      </div>

      {/* Floating Edit/Save Button */}
      {showEdited && revisedText && (
        <div className="fixed bottom-[10px] right-[20px] z-50">
          <Button
            onClick={handleToggleEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md p-2"
            size="icon"
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* Content Viewer */}
      <div className="flex-1 overflow-auto p-4">
        {!showEdited ? (
          <iframe src={pdfUrl} className="w-full h-full border rounded" title="Original PDF" />
        ) : revisedText ? (
          <div className="space-y-4">
            {!isEditing ? (
              <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                <ReactMarkdown>{revisedText}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                className="w-full font-sans text-white bg-transparent border-none shadow-none resize-none focus:outline-none focus:ring-0 p-0 leading-relaxed whitespace-pre-wrap"
                value={revisedText}
                onChange={(e) => setRevisedText(e.target.value)}
                rows={1}
              />
            )}
          </div>
        ) : loading ? (
          <p className="text-gray-400 animate-pulse">Generating revised text...</p>
        ) : (
            <p className="text-red-500">There was an error generating the revised text.</p>
        )}
      </div>
    </div>
  );
};

export default Streamer;
