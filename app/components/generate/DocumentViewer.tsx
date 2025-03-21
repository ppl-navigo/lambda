"use client";

import React from "react";
import { MathpixMarkdown, MathpixLoader } from "mathpix-markdown-it"

interface DocumentViewerProps {
  viewedDocumentString: string | null;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  viewedDocumentString
}) => {
  return (
    <div className="w-full h-full bg-[#09090B] p-6 rounded-lg border border-[#27272A] flex flex-col">
      <div
        className="flex-grow border border-[#27272A] p-4 rounded-lg overflow-auto"
        data-testid="document-preview-container"
      >
        {viewedDocumentString ? (
          <MathpixLoader>
            <div className="whitespace-pre-wrap">
              <MathpixMarkdown text={viewedDocumentString} />
            </div>
          </MathpixLoader>
        ) : (
          <div className="text-center text-gray-500">
            No document selected. Please choose a document from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;