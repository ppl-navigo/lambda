"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { useMouStore } from "@/app/store/useMouStore";

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<StreamerProps> = ({ pdfUrl }) => {
  const { pagesContent } = useMouStore(); 
  const [editedPdfUrl, setEditedPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEdited, setShowEdited] = useState(false);
  const iframeSrcRef = useRef<string>(pdfUrl);

  const handleGenerateEditedPdf = async () => {
    setLoading(true);
    setShowEdited(false); // Optional: hide while loading

    try {
      const response = await axios.post("/api/mou-revision", {
        pdfUrl,
        pagesContent,
      });

      if (response.status === 200) {
        const newUrl = response.data.editedPdfUrl;

        // 🔄 Only update if URL has changed
        if (newUrl !== iframeSrcRef.current) {
          iframeSrcRef.current = newUrl;
          setEditedPdfUrl(newUrl);
          setShowEdited(true);
        } else {
          // Same URL, just switch back to view
          setShowEdited(true);
        }
      }
    } catch (error) {
      console.error("❌ Error generating edited PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentPdfUrl = showEdited && editedPdfUrl ? editedPdfUrl : pdfUrl;

  return (
    <div className="h-full w-full bg-gray-900 border-l border-gray-700 transition-all duration-300 flex flex-col">
      {/* 🔹 Navbar-like buttons with separator */}
      <div className="flex w-full border-b border-gray-700">
        {/* Left Button - Original PDF */}
        <Button
          className={`flex-1 px-4 py-2 bg-black text-white ${!showEdited ? "bg-gray-800" : "bg-gray-600"}`}
          onClick={() => setShowEdited(false)}
        >
          Original PDF
        </Button>

        {/* Divider Line */}
        <div className="border-l border-gray-700 h-full"></div>

        {/* Right Button - Edited PDF */}
        <Button
          className={`flex-1 px-4 py-2 bg-black text-white ${showEdited ? "bg-gray-800" : "bg-gray-600"}`}
          onClick={handleGenerateEditedPdf}
          disabled={loading}
        >
          {loading ? "Processing..." : editedPdfUrl ? "Edited PDF" : "Generate Edited PDF"}
        </Button>
      </div>

      {/* 🔹 Tampilkan PDF (original atau hasil revisi) */}
      <iframe
        key={currentPdfUrl} // force refresh only when URL truly changes
        src={currentPdfUrl}
        className="w-full h-full"
        title="PDF Viewer"
      ></iframe>
    </div>
  );
};


export default Streamer;
