"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "../../components/ui/button";

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<StreamerProps> = ({ pdfUrl }) => {
  const [editedPdfUrl, setEditedPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEdited, setShowEdited] = useState(false);

  // 🔹 Fungsi untuk meminta revisi dari API
  const handleGenerateEditedPdf = async () => {
    if (editedPdfUrl) {
      // Jika sudah ada hasil revisi, langsung tampilkan
      setShowEdited(true);
      return;
    }

    setLoading(true);
    try {
      // 🔹 Kirim permintaan revisi ke API (hanya mengirim link PDF)
      const response = await axios.post("/api/mou-revision", {
        pdfUrl, // Kirim link PDF, bukan file
      });

      if (response.status === 200) {
        const revisedPdfUrl = response.data.editedPdfUrl; // Ambil link PDF hasil revisi
        setEditedPdfUrl(revisedPdfUrl);
        setShowEdited(true);
      }
    } catch (error) {
      console.error("❌ Error generating edited PDF:", error);
    } finally {
      setLoading(false);
    }
  };

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
        src={showEdited && editedPdfUrl ? editedPdfUrl : pdfUrl}
        className="w-full h-full"
        title="PDF Viewer"
      ></iframe>
    </div>
  );
};

export default Streamer;
