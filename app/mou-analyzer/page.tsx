"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Dropzone from "../components/Dropzone";
import Streamer from "../components/Streamer";
import MarkdownViewer from "../components/MarkdownViewer";

const MouAnalyzer = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  return (
    <div className="bg-black text-white h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Wrapper */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {isSidebarVisible && (
          <div className="h-full w-1/4">
            <Sidebar
              isSidebarVisible={isSidebarVisible}
              setIsSidebarVisible={setIsSidebarVisible}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          {!pdfUrl ? (
            <div className="flex flex-1 items-center justify-center">
              <Dropzone setPdfUrl={setPdfUrl} isSidebarVisible={isSidebarVisible} />
            </div>
          ) : (
            <div className="grid grid-cols-5 h-full overflow-hidden">
              <div className="col-span-3 overflow-y-auto transition-all duration-300">
                <MarkdownViewer pdfUrl={pdfUrl} />
              </div>
              <div className="col-span-2 overflow-y-auto">
                <Streamer pdfUrl={pdfUrl} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MouAnalyzer;
