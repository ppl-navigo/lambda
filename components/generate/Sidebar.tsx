"use client";

import { useState } from "react";
import { Document } from "./DocumentObject";
import { FaDownload } from "react-icons/fa";
import { Toaster } from "react-hot-toast";

interface SidebarProps {
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  viewedDocumentString: string | null;
  setViewedDocumentString: React.Dispatch<React.SetStateAction<string | null>>;
  documents?: Document[];
  onDownload?: (document: Document) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarVisible,
  setIsSidebarVisible,
  viewedDocumentString,
  setViewedDocumentString,
  documents = [],
  onDownload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter documents based on search query
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`w-[300px] bg-[#1F1F1F] h-full transition-all duration-300 ease-in-out ${
        isSidebarVisible ? "" : "-translate-x-full"
      }`}
    >
      <Toaster position="top-right" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">History</h2>
          <button
            onClick={() => setIsSidebarVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 mb-4 bg-[#2D2D2D] text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <div className="space-y-2">
          {filteredDocs.map((doc, index) => (
            <div
              key={index}
              className={`p-3 rounded cursor-pointer flex justify-between items-center ${
                doc.content === viewedDocumentString
                  ? "bg-[#3D3D3D]"
                  : "hover:bg-[#2D2D2D]"
              }`}
              onClick={() => setViewedDocumentString(doc.content)}
            >
              <div>
                <h3 className="text-white font-medium truncate max-w-[200px]">
                  {doc.title}
                </h3>
                <p className="text-sm text-gray-400">{doc.time}</p>
              </div>
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc);
                  }}
                  className="p-2 hover:bg-[#4D4D4D] rounded-full transition-colors"
                  title="Download document"
                >
                  <FaDownload className="text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
