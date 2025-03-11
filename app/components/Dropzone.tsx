"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { FiUpload } from "react-icons/fi";

interface DropzoneProps {
  setPdfUrl: (url: string) => void;
  isSidebarVisible: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ setPdfUrl, isSidebarVisible }) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    // Check file type. If not PDF, show warning.
    if (file.type !== "application/pdf") {
      setFileError("Only PDF files are allowed");
      return;
    }

    // If valid PDF, clear any previous error and set file.
    setFileError("");
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
      const response = await axios.post("${process.env.NEXT_PUBLIC_API_URL}/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200) {
        const uploadedPath = response.data.file_path;
        setPdfUrl(`${process.env.NEXT_PUBLIC_API_URL}/stream/${uploadedPath}`);
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
      {/* Show dropzone if no file is selected */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`w-full mx-auto h-48 border-2 border-dashed border-gray-500 flex flex-col items-center justify-center rounded-md cursor-pointer bg-gray-800 text-white p-6 transition-all duration-300
                     ${isSidebarVisible ? "sm:max-w-xl" : "sm:max-w-2xl lg:max-w-screen-lg"}`}
        >
          <input {...getInputProps()} />
          <FiUpload className="text-4xl text-gray-400" />
          {isDragActive ? (
            <p className="mt-2">Drop the PDF file here...</p>
          ) : (
            <p className="mt-2">
              📂 Drag & drop a PDF here, or click to select one
            </p>
          )}
        </div>
      )}

      {/* Display warning if file type is not PDF */}
      {fileError && <p className="text-red-500 mt-2">{fileError}</p>}

      {/* When a file is selected, display its name */}
      {selectedFile && (
        <p data-testid="selected-file" className="text-white mt-2">
          📄 {selectedFile.name}
        </p>
      )}

      {/* Delete file button */}
      {selectedFile && (
        <button
          onClick={handleDeleteFile}
          className="mt-2 px-4 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Delete File
        </button>
      )}

      {/* Upload button */}
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
