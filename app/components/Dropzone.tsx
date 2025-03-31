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

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Reset error message
      setFileError("");

      // If no files are accepted, exit
      if (acceptedFiles.length === 0 && fileRejections.length === 0) return;

      // Handle file rejections for non-PDF files or large files
      if (fileRejections.length > 0) {
        const rejectedFile = fileRejections[0].file;

        // Check if the file is not a PDF
        if (rejectedFile.type !== "application/pdf") {
          setFileError("Only PDF files are allowed");
        }

        // Check if the file size is larger than 10MB
        if (rejectedFile.size > 10 * 1024 * 1024) {
          setFileError((prevError) => `${prevError ? prevError + " and " : ""}File size cannot be larger than 10MB`);
        }

        return; // Stop further execution for rejections
      }

      // If file is valid, set it
      const file = acceptedFiles[0];

      // Additional size check in case the file passed type check
      if (file.size > 10 * 1024 * 1024) {
        setFileError("File size cannot be larger than 10MB");
        return;
      }

      // If file is valid, set it
      setSelectedFile(file);
    },
    []
  );

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
  
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      if (data.url) {
        setPdfUrl(data.url); // The uploaded PDF's URL
      } else {
        throw new Error("Upload failed");
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

        {/* Dropzone or File Info */}
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

      {/* Display error message if the file is not valid */}
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