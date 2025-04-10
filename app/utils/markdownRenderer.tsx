import React from "react";

const renderCustomMarkdown = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    if (line.trim() === "") {
      return <br key={index} />;
    }
    
    // Handle PAGE_START marker
    const pageStartMatch = line.match(/^---PAGE_START_(\d+)---$/);
    if (pageStartMatch) {
      const pageNumber = pageStartMatch[1];
      return (
        <div
          key={`page-header-${index}`}
          className="text-lg font-semibold text-blue-400 border-b border-gray-600 mb-4 mt-8 pb-1"
        >
          Page {pageNumber}
        </div>
      );
    }
    
    let processedLine = line.replace(/^#+\s*/, "");

    const processLine = (input: string): JSX.Element[] => {
      const parts: JSX.Element[] = [];
      let remaining = input;

      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /_(.*?)_/g;

      [boldRegex, italicRegex].forEach((regex, i) => {
        let match;
        while ((match = regex.exec(remaining)) !== null) {
          const before = remaining.slice(0, match.index);
          const matchedText = match[1];

          if (before) {
            parts.push(<span key={`plain-${index}-${parts.length}`}>{before}</span>);
          }

          parts.push(
            i === 0 ? (
              <strong key={`bold-${index}-${parts.length}`} className="font-bold">
                {matchedText}
              </strong>
            ) : (
              <em key={`italic-${index}-${parts.length}`} className="italic">
                {matchedText}
              </em>
            )
          );

          remaining = remaining.slice(match.index + match[0].length);
        }
      });

      if (remaining) {
        parts.push(<span key={`plain-${index}-${parts.length}`}>{remaining}</span>);
      }

      return parts;
    };

    const processedParts = processLine(processedLine);

    return (
      <p key={index} className="mb-2 whitespace-pre-wrap">
        {processedParts}
      </p>
    );
  });
};

export default function MarkdownRenderer({ text }: { text: string }) {
  return <div className="prose prose-invert max-w-none whitespace-pre-wrap">{renderCustomMarkdown(text)}</div>;
}