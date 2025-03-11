"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import ReactMarkdown from "react-markdown";

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

interface Risk {
  clause: string;
  risky_text: string;
  reason: string;
}

const RiskItem: React.FC<{ risk: Risk }> = ({ risk }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => setExpanded((prev) => !prev);

  return (
    <div className="mb-4 border-b border-gray-700 pb-2">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={toggleExpand}
      >
        <h3 className="text-lg font-semibold">📌 {risk.clause}</h3>
        <button className="text-sm text-blue-400 focus:outline-none">
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 text-sm">
          <p>
            <strong>🔍 Risky Text:</strong> {risk.risky_text}
          </p>
          <p className="mt-1">
            <strong>⚠️ Reason:</strong> {risk.reason}
          </p>
        </div>
      )}
    </div>
  );
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ pdfUrl }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pdfUrl) {
      analyzeDocument(pdfUrl);
    }
  }, [pdfUrl]);

  const analyzeDocument = async (fileUrl: string) => {
    setLoading(true);
    setError("");
    setRisks([]);

    try {
      let filename = fileUrl.split("/stream/")[1];
      console.log("🔍 Original filename from pdfUrl:", filename);

      // Ensure correct file path format
      filename = filename.replace("/^uploads\\/uploads\\//", "uploads/");
      console.log("🔍 Fixed filename:", filename);

      // Download file from backend
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/download/${filename}`, {
        responseType: "blob",
      });

      // Create FormData to send file to the analyze API.
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([await response.data.arrayBuffer()], {
          type: "application/pdf",
        }),
        filename.split("/").pop() // Only file name
      );

      console.log("🚀 Sending file to /analyze/ API:", filename.split("/").pop());

      const analyzeResponse = await axios.post("${process.env.NEXT_PUBLIC_API_URL}/analyze/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Analysis response:", analyzeResponse.data);

      if (Array.isArray(analyzeResponse.data.risks)) {
        const risksData: Risk[] = analyzeResponse.data.risks.map((risk: any) => ({
          clause: cleanText(risk.clause),
          risky_text: cleanText(risk.risky_text),
          reason: cleanText(risk.reason),
        }));

        setRisks(risksData);
      } else {
        setError("⚠️ Unexpected response format.");
      }
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      setError("❌ Failed to analyze document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cleanText = (text: string) => {
    return text.replace(/\*\*/g, "").replace(/\n\s*\n/g, "\n").trim();
  };

  return (
    <div className="bg-[#1A1A1A] text-white p-4 rounded-md h-screen w-1/2 overflow-y-auto">
      {loading && (
        <div className="flex items-center justify-center h-full" data-testid="spinner">
          <FaSpinner className="text-4xl animate-spin" />
        </div>
      )}
      {error && <p>{error}</p>}
      {!loading && !error && risks.length === 0 && <p>No risks found.</p>}
      {!loading &&
        risks.map((risk, index) => <RiskItem key={index} risk={risk} />)}
    </div>
  );
};

export default MarkdownViewer;
