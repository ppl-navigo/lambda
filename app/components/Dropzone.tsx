"use client"; // Required for event handling in Next.js App Router

import { useState } from "react";
import { FiUpload } from "react-icons/fi";

const Dropzone = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get selected file

    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Only PDF files are allowed.");
        setSelectedFile(null);
      }
    }
  };

  return (
    <div
      className="w-3/4 h-96 border-2 border-dashed border-gray-500 flex flex-col items-center justify-center rounded-md cursor-pointer"
      onClick={() => document.getElementById("fileInput")?.click()}
    >
      {/* Updated aria-label & added data-testid */}
      <input
        type="file"
        id="fileInput"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Upload File" // This is the correct label
        data-testid="fileInput"  // Added for test queries
      />
      <FiUpload className="text-3xl text-gray-400" />
      
      {selectedFile ? (
        <p className="text-white mt-2">📄 {selectedFile.name}</p>
      ) : (
        <p className="text-white mt-2">Mulai Analisis Dokumen Anda</p>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default Dropzone;