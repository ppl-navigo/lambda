"use client";

import { useCallback, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import axios from "axios";
import { FiUpload, FiX } from "react-icons/fi";

interface DropzoneProps {
  setPdfUrl: (url: string) => void;
  isSidebarVisible: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ setPdfUrl, isSidebarVisible }) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // Jika tidak ada file yang diterima, keluar (branch ini juga diuji)
    if (acceptedFiles.length === 0) return;

    // Jika ada file rejection (misal bukan PDF), set error dan keluar
    if (fileRejections.length > 0) {
      setFileError("Only PDF files are allowed");
      return;
    }

    // Jika file valid (PDF), clear error dan set file
    setFileError("");
    const file = acceptedFiles[0];
    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200) {
        const uploadedPath = response.data.file_path;
        setPdfUrl(`http://127.0.0.1:8000/stream/${uploadedPath}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = () => {
    setSelectedFile(null);
    setFileError("");
  };

  return (
    <div className="flex flex-col items-center w-full p-4">
      {/* Outer Dropzone Container - Always Visible */}
      <div
        {...getRootProps()}
        className={`relative w-full mx-auto h-48 border-2 border-dashed border-gray-500 flex flex-col items-center justify-center rounded-md bg-gray-800 text-white p-6 transition-all duration-300
                   ${isSidebarVisible ? "sm:max-w-xl" : "sm:max-w-2xl lg:max-w-screen-lg"}`}
      >
        {/* Delete Button as X Icon (Shown Only When a File is Selected) */}
        {selectedFile && (
          <button
            onClick={handleDeleteFile}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            aria-label="close"
          >
            <FiX className="text-lg" />
          </button>
        )}

        {/* Dropzone atau File Info */}
        {!selectedFile ? (
          <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <input {...getInputProps()} />
            <FiUpload className="text-4xl text-gray-400" />
            {isDragActive ? (
              <p className="mt-2">Drop the PDF file here...</p>
            ) : (
              <p className="mt-2">📂 Drag & drop a PDF here, or click to select one</p>
            )}
          </div>
        ) : (
          <p data-testid="selected-file" className="text-white mt-2">
            📄 {selectedFile.name}
          </p>
        )}
      </div>

      {/* Tampilkan pesan error jika file tidak valid */}
      {fileError && <p className="text-red-500 mt-2">{fileError}</p>}

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-700"
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      )}
    </div>
  );
};

export default Dropzone;
