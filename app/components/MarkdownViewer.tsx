"use client";

import { useState, useEffect } from "react";
import React from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { useCallback } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";


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

  return (
    <div className="mb-4 border-b border-gray-700 pb-2">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
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

// const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ pdfUrl }) => {
const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({ pdfUrl }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResponse, setAiResponse] = useState("The potential risky clauses are listed below:\n\n");

  const downloadFileAndExtractText = useCallback(async (fileUrl: string) => {
    try {
    
      let filename = "";
    
      filename = fileUrl.split("/stream/")[1];
      // Only call `replace` on something that definitely exists:
      filename = filename.replace("/^uploads\\/uploads\\//", "uploads/");
      
      console.log("📂 Extracted filename:", filename);

      // Download file from backend
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/download/${filename}`,
        { responseType: "blob" }
      );

      console.log("✅ File downloaded successfully");

      const fileBlob = await response.data.arrayBuffer();
      const fileExtension = filename.split(".").pop()?.toLowerCase();
      let extractedText = "";

      if (fileExtension === "pdf") {
        console.log("📄 Processing PDF file");
        const typedArray = new Uint8Array(fileBlob);
        console.log("📢 Before loading PDF...");

        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        console.log("📢 Loading PDF...");

        const pdf = await loadingTask.promise;
        console.log("✅ PDF Loaded Successfully!");
        console.log("📃 Total Pages:", pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          console.log(`📜 Page ${i} content items:`, content.items);
          extractedText += content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ") + "\n";

        }
      } else if (fileExtension === "docx") {
        console.log("📄 Processing DOCX file");
        const result = await mammoth.extractRawText({ arrayBuffer: fileBlob });
        extractedText = result.value;
      } else {
        throw new Error("Unsupported file format.");
      }

      console.log("📝 Extracted text:", extractedText.substring(0, 500)); // Log first 500 characters
      return extractedText;
    } catch (error) {
      console.error("❌ Error loading PDF:", error);
      setError("❌ Error extracting text from file.");
      return "";
    }
  }, []);


  const analyzeTextWithAI = useCallback(async (text: string) => {
    setLoading(true);
    setError("");
    setRisks([]);
    setAiResponse("");
  
    const MAX_RETRIES = 3;
    let accumulatedResponse = "";
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 AI Analysis Attempt ${attempt}...`);
  
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model: "qwen/qwen2.5-vl-72b-instruct:free",
            stream: true,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analisis dokumen berikut untuk mengidentifikasi klausul yang berpotensi berisiko bagi pihak kedua. Risiko mencakup, namun tidak terbatas pada:\n\n* Ketidakseimbangan hak dan kewajiban antara pihak pertama dan pihak kedua\n* Klausul pembatalan yang merugikan\n* Klausul pembayaran yang berpotensi memberatkan\n* Klausul tanggung jawab yang bisa menyebabkan kerugian sepihak\n* Klausul force majeure yang tidak melindungi kepentingan pihak kedua\n* Klausul ambigu atau multi-tafsir yang bisa disalahgunakan\n* Klausul lain yang dapat menyebabkan dampak hukum negatif bagi pihak kedua\n\nFormat hasil yang diharapkan:\nKlausul {nomor}: "{kalimat atau kata-kata berisiko}". Alasan: "{penjelasan mengapa klausul ini berisiko}".\n\nJika dokumen memiliki bahasa yang tidak dikenali, tampilkan pesan "Bahasa tidak didukung". Jika tidak ditemukan klausul berisiko, tampilkan pesan "Tidak ditemukan klausul yang dapat dianalisis". Jika terjadi kesalahan sistem, tampilkan pesan "Gagal menganalisis dokumen, coba lagi nanti".\n\nSetiap klausul yang ditandai harus memiliki minimal satu alasan mengapa klausul tersebut berisiko, tetapi jangan berikan rekomendasi perbaikan terlebih dahulu.\n\n${text}`
                  }
                ]
              }
            ]
          })
        });
  
        if (!response.body) throw new Error("No stream body received");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // Extract AI-generated text from streamed JSON
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(line.replace("data: ", ""));
                const contentDelta = jsonData?.choices?.[0]?.delta?.content || "";
                accumulatedResponse += contentDelta;
                setAiResponse(accumulatedResponse);
              } catch (error) {
                console.warn("⚠️ Failed to parse streamed data:", error);
              }
            }
          }
        }

        break;      
  
      } catch (error) {
        console.error(`❌ Error on attempt ${attempt}:`, error);
        if (attempt === MAX_RETRIES) {
          setError("❌ Gagal menganalisis dokumen: Tidak ada respons dari AI setelah beberapa kali percobaan.");
          setLoading(false);
          return;
        }
      }
    }
  
    if (!accumulatedResponse) {
      setError("❌ Gagal menganalisis dokumen: Tidak ada respons yang valid dari AI.");
      setLoading(false);
      return;
    }

    // 🔹 Parse AI Response into Risks
    const riskMatches = accumulatedResponse.matchAll(/Klausul\s+([\w\s().]+):\s*['\"]?(.*?)['\"]?\s*\.?\s*Alasan:\s*['\"]?(.*?)['\"]?(?:\n|$)/g);
    const extractedRisks: Risk[] = Array.from(riskMatches, (match: RegExpMatchArray) => ({
      clause: cleanText(`Klausul ${match[1]}`),
      risky_text: cleanText(match[2]),
      reason: cleanText(match[3]),
    }));
  
    console.log("⚠️ Extracted Risks:", extractedRisks);
  
    setRisks(extractedRisks.length ? extractedRisks : [{ 
      clause: "N/A", 
      risky_text: "Tidak ditemukan klausul berisiko", 
      reason: "Dokumen tampak aman" 
    }]);
  
    setLoading(false);
  }, []);
    
  const processDocument = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        if (!pdfUrl) {
          setLoading(false);
          return;
        }
        const extractedText = await downloadFileAndExtractText(pdfUrl);
        if (extractedText) await analyzeTextWithAI(extractedText);
      } catch (err) {
        console.error("❌ Error processing document:", err);
        setError("Error processing document.");
      } finally {
        setLoading(false);
      }
    }, [pdfUrl, downloadFileAndExtractText, analyzeTextWithAI]);

  const cleanText = (text: string) => {
    return text.replace(/\*\*/g, "").replace(/\n\s*\n/g, "\n").trim();
  };
  // Debounced useEffect
  useEffect(() => {
    if (!pdfUrl) return;

    console.log("📢 Loading PDF...");
    const timeoutId = setTimeout(() => {
      processDocument();
    }, 300); // Prevents multiple executions

    return () => clearTimeout(timeoutId); // Cleanup to prevent multiple runs
  }, [pdfUrl, processDocument]);

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      <div className="bg-[#1A1A1A] text-white p-4 rounded-md overflow-y-auto">
        {loading && <FaSpinner data-testid="spinner" className="text-4xl animate-spin" />}
        {error && <p>{error}</p>}
        {!loading && !error && risks.length === 0 && <p>No risks found.</p>}
        {!loading && risks.map((risk, index) => <RiskItem key={index} risk={risk} />)}
      </div>
      <div className="bg-gray-800 text-white p-4 rounded-md overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
        <pre className="whitespace-pre-wrap text-sm">{aiResponse || "Waiting for AI response..."}</pre>
      </div>
    </div>
  );
});

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;
