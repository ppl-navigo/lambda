import React from "react";

const renderCustomMarkdown = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    if (line.trim() === "") {
      return <br key={`empty-line-${line}-${index}`} />;
    }
    
    const pageStartRegex = /^---PAGE_START_(\d+)---$/;
    const pageStartMatch = pageStartRegex.exec(line);
    if (pageStartMatch) {
      const pageNumber = pageStartMatch[1];
      return (
        <div
          key={`page-header-${pageNumber}`}
          className="text-lg font-semibold text-blue-400 border-b border-gray-600 mb-4 mt-8 pb-1"
        >
          Page {pageNumber}
        </div>
      );
    }
    
    // Remove quotes and trim line
    let remaining = line.replace(/"/g, "").trim();
    remaining = remaining.replace(/^#+\s*/, "");

    const processLine = (input: string): JSX.Element[] => {
      const parts: JSX.Element[] = [];
      const highlightRegex = /<highlight>(.*?)<\/highlight>/g;

      let lastIndex = 0;
      let match;

      while ((match = highlightRegex.exec(input)) !== null) {
        const before = input.slice(lastIndex, match.index);
        if (before) {
          parts.push(...processBoldItalic(before, index));
        }

        const highlightedText = match[1];
        parts.push(
          <span key={`highlight-${index}-${parts.length}`} className="text-red-500 font-bold">
            {highlightedText}
          </span>
        );

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < input.length) {
        parts.push(...processBoldItalic(input.slice(lastIndex), index));
      }

      return parts;
    };

    const processBoldItalic = (input: string, index: number): JSX.Element[] => {
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

    const processedParts = processLine(remaining);

    return (
      <p key={`line-${index}-${line}`} className="mb-2 whitespace-pre-wrap">
        {processedParts}
      </p>
    );
  });
};

export default function MarkdownRenderer({ text }: { readonly text: string }) {
  const trimmedText = text.trim();
  return <div className="prose prose-invert max-w-none whitespace-pre-wrap">{renderCustomMarkdown(trimmedText)}</div>;
}