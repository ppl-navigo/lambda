import React from "react";
import { Textarea } from "../../components/ui/textarea";
import MarkdownRenderer from "../utils/markdownRenderer";

// Replace showEdited with "mode"
interface ContentViewerProps {
  mode: "original" | "revised";
  pdfUrl: string;
  revisedText: string;
  isEditing: boolean;
  setRevisedText: (text: string) => void;
  loading: boolean;
  pagesContent: any[];
  riskyClausesLength: number;
}

const ContentViewer: React.FC<ContentViewerProps> = ({
  mode,
  pdfUrl,
  revisedText,
  isEditing,
  setRevisedText,
  loading,
  pagesContent,
  riskyClausesLength,
}) => {
  if (mode === "original") {
    return (
      <iframe
        src={pdfUrl}
        className="w-full h-full border rounded"
        title="Original PDF"
      />
    );
  } else if (mode === "revised" && revisedText && riskyClausesLength > 0) {
    return (
      <div className="space-y-4">
        {!isEditing ? (
          <>
            <MarkdownRenderer text={revisedText} />
            <div className="h-8" />
          </>
        ) : (
          <>
            {revisedText
              .split(/---PAGE_START_(\d+)---/)
              .filter((_, i) => i > 0)
              .reduce<JSX.Element[]>((acc, curr, idx, arr) => {
                if (idx % 2 === 0) {
                  const sectionNumber = parseInt(curr);
                  const content = arr[idx + 1]?.trim() ?? "";

                  acc.push(
                    <div key={`edit-page-${sectionNumber}`} className="mb-6">
                      <div className="text-sm text-blue-400 font-semibold mb-2">
                        Page {sectionNumber}
                      </div>
                      <Textarea
                        className="w-full font-sans text-white bg-transparent border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 p-2 leading-relaxed whitespace-pre-wrap"
                        value={content}
                        onChange={(e) => {
                          const updated = revisedText
                            .split(/---PAGE_START_(\d+)---/)
                            .filter((_, i) => i > 0)
                            .reduce((textAcc, val, i, arr) => {
                              if (i % 2 === 0) {
                                const pageNum = val;
                                const contentValue =
                                  parseInt(pageNum) === sectionNumber
                                    ? e.target.value
                                    : arr[i + 1] ?? "";
                                return (
                                  textAcc +
                                  `---PAGE_START_${pageNum}---\n` +
                                  contentValue.trim() +
                                  "\n"
                                );
                              }
                              return textAcc;
                            }, "");
                          setRevisedText(updated.trim());
                        }}
                        rows={Math.max(3, content.split("\n").length)}
                      />
                    </div>
                  );
                }
                return acc;
              }, [])}
          </>
        )}
      </div>
    );
  } else if (loading) {
    return (
      <p className="text-gray-400 animate-pulse">Generating revised text...</p>
    );
  } else if (pagesContent.length === 0) {
    return <p className="text-yellow-400">No content loaded yet.</p>;
  } else if (riskyClausesLength === 0) {
    return (
      <p className="text-green-400">
        No risky clauses found. This document may not need any revisions.
      </p>
    );
  } else {
    return <p className="text-yellow-400">No content loaded yet.</p>;
  }
};

export default ContentViewer;