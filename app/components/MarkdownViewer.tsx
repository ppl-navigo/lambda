"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import { useCallback } from "react";
import { useMouStore, RiskyClause } from "@/app/store/useMouStore";
import { v4 as uuidv4 } from 'uuid';

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

export const RiskItem: React.FC<{ 
  risk: RiskyClause; 
  isSelected: boolean;
  onSelect: (id: string) => void 
}> = ({ risk, isSelected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 border-b border-gray-700 pb-2">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className="text-base font-semibold">📌 {risk.title}</h3>
        <button className="text-sm text-blue-400 focus:outline-none mt-1">
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 text-sm">
          <p>
            <strong>🔍 Risky Text:</strong> {risk.originalClause}
          </p>
          <p className="mt-1">
            <strong>⚠️ Reason:</strong> {risk.reason}
          </p>
          
          <div className="mt-2 space-y-2">
            <button
              className={`mt-2 px-3 py-1 rounded ${
                isSelected ? "bg-green-600" : "bg-blue-600"
              } text-white`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(risk.id);
              }}
            >
              {isSelected ? "Deselect" : "Select Clause"}
            </button>

            {risk.revisedClause && (
              <p className="mt-2 text-green-400">
                <strong>📝 Revision Generated on Revised Document Section</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({ pdfUrl }) => {
  const { pagesContent, setPagesContent, setRiskyClauses } = useMouStore();
  const [risks, setRisks] = useState<RiskyClause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processedPages, setProcessedPages] = useState<number[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [chatPrompt, setChatPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);

  const downloadFileAndExtractText = useCallback(async (fileUrl: string) => {
    try {
      const fileResponse = await axios.get(fileUrl, { responseType: "blob" });
      const fileBlob = fileResponse.data;
      const fileName = fileUrl.split("/").pop() || "unknown-file";
      const fileType = fileResponse.headers["content-type"];
      const file = new File([fileBlob], fileName, { type: fileType });

      const formData = new FormData();
      formData.append("file", file);

      const extractResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/extract_text/`,
        formData
      );

      const pagesText: string[] = extractResponse.data.pages_text;
      return pagesText;
    } catch (error) {
      console.error("❌ Error extracting text from backend:", error);
      setError("❌ Error extracting text from backend.");
      return [];
    }
  }, []);

  const analyzeTextWithAI = useCallback(
    async (text: string, sectionNumber: number): Promise<RiskyClause[]> => {
      setLoading(true);
      setError("");
      let accumulatedResponse = "";

      try {
        const systemPrompt = `
Analisis dokumen berikut untuk mengidentifikasi klausul yang berpotensi berisiko bagi pihak kedua. Risiko mencakup, namun tidak terbatas pada:

- Ketidakseimbangan hak dan kewajiban antara pihak pertama dan pihak kedua
- Klausul pembatalan yang merugikan
- Klausul pembayaran yang berpotensi memberatkan
- Klausul tanggung jawab yang bisa menyebabkan kerugian sepihak
- Klausul force majeure yang tidak melindungi kepentingan pihak kedua
- Klausul ambigu atau multi-tafsir yang bisa disalahgunakan
- Klausul lain yang dapat menyebabkan dampak hukum negatif bagi pihak kedua

Format hasil yang diharapkan dalam **markdown**:

\`\`\`
Klausul {judul}: "{kalimat atau kata-kata berisiko}"
Alasan: "{penjelasan mengapa klausul ini berisiko}"
\`\`\`
`;

        const response = await fetch("/api/mou-analyzer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptText: text, systemPrompt }),
        });

        if (!response.body) throw new Error("No stream body received");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulatedResponse += decoder.decode(value, { stream: true });
        }

        if (accumulatedResponse.toLowerCase().includes("tidak ditemukan klausul")) return [];

        const riskMatches = accumulatedResponse.matchAll(/(?:\*\*)?Klausul\s+(.*?):(?:\*\*)?\s*["']?(.*?)["']?\s*(?:\.\s*)?(?:\*\*)?Alasan:(?:\*\*)?\s*["']?(.*?)["']?(?:\n|$)/g);
        const extractedRisks: RiskyClause[] = Array.from(riskMatches, (match: RegExpMatchArray) => ({
          id: uuidv4(), // Add unique ID
          sectionNumber,
          title: cleanText(`Klausul ${match[1]}`),
          originalClause: cleanText(match[2]),
          reason: cleanText(match[3]),
          revisedClause: "" // Add empty initial revision
        }));
        
        return extractedRisks;
      } catch (error) {
        console.error(`❌ Error analyzing section ${sectionNumber}:`, error);
        setError("❌ Gagal menganalisis dokumen, coba lagi nanti.");
        return [];
      } finally {
        setLoading(false);
      }
  },[]);
    
  const processDocument = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!pdfUrl) return;

    try {
      const pages = await downloadFileAndExtractText(pdfUrl);

      for (let i = 0; i < pages.length; i++) {
        const sectionNumber = i + 1;
        const rawPageText = pages[i];

        const organizedText = await organizeTextWithLLM(rawPageText);
        setPagesContent([...pagesContent, { 
          sectionNumber,  // ← Di sini sudah ditambahkan koma
          content: organizedText 
        }]); // ← Tutup array dengan benar

        const risks = await analyzeTextWithAI(organizedText, sectionNumber);

        if (risks.length > 0) {
          setRiskyClauses(risks);
          setRisks((prev) => [...prev, ...risks]);
        }

        setProcessedPages((prev) => [...prev, sectionNumber]);
      }
    } catch (err) {
      console.error("❌ Gagal menganalisis dokumen:", err);
      setError("Gagal menganalisis dokumen");
    } finally {
      setLoading(false);
    }
  }, [pdfUrl, downloadFileAndExtractText]);

  const cleanText = (text: string) => {
    return text.replace(/\*\*/g, "").trim();
  };

  useEffect(() => {
    if (!pdfUrl) return;

    const timeoutId = setTimeout(() => {
      processDocument();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [pdfUrl, processDocument]);

  const organizeTextWithLLM = async (text: string): Promise<string> => {
    const systemPrompt = `
Susun ulang teks dokumen berikut agar terlihat rapi dan profesional untuk ditampilkan kembali. Pertahankan struktur asli dokumen seperti judul, subjudul, poin-poin, dan numbering. Gunakan bahasa yang formal namun tidak terlalu kaku dan jangan mengubah isi asli. Gunakan format markdown, tetapi jangan ada format tabel.
  `;
  
    const response = await fetch("/api/mou-analyzer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: text,
        systemPrompt,
      }),
    });
  
    if (!response.body) throw new Error("No response from LLM");
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let result = "";
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
  
    return result.trim();
  };

  const generateRevisionWithAI = useCallback(async (
    riskyText: string,
    reason: string,
    systemPrompt: string // Sekima menerima custom prompt
  ): Promise<string> => {
    try {
      const response = await fetch("/api/mou-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: "", // Tidak perlu prompt tambahan
          systemPrompt    // Gunakan systemPrompt yang sudah dibuat
        }),
      });

      if (!response.body) throw new Error("No stream body received");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedResponse += decoder.decode(value, { stream: true });
      }
      console.log("Final System Prompt:", systemPrompt);

      return accumulatedResponse;
    } catch (error) {
      console.error("❌ Error generating revision:", error);
      return "Error generating revision.";
    }
  }, []);

  const handleSelectClause = (riskId: string) => {
    setSelectedRiskId(current => current === riskId ? null : riskId);
  };

  const handleSendPrompt = async () => {
    if (!selectedRiskId) return;
  
    const selectedRisk = risks.find(r => r.id === selectedRiskId);
    if (!selectedRisk) return;
  
    setIsSending(true);
    try {
      // 1. Dapatkan konten halaman terkait
      const currentPagesContent = useMouStore.getState().pagesContent;
      const originalPageContent = currentPagesContent.find(
        p => p.sectionNumber === selectedRisk.sectionNumber
      )?.content || '';
  
      // 2. Generate system prompt spesifik
      const systemPrompt = `Anda adalah ahli hukum. Revisi HARUS mengikuti kriteria ini:
  1. HANYA ubah klausul spesifik ini: "${selectedRisk.originalClause}"
  2. Alasan revisi: "${selectedRisk.reason}"
  ${
    chatPrompt 
      ? `3. Instruksi tambahan user: "${chatPrompt}"\n`
      : '3. Tidak ada instruksi tambahan - buat revisi berdasarkan analisis risiko\n'
  }
  4. Format hasil: Kembalikan SELURUH konten halaman asli dengan HANYA klausul tersebut yang diubah
  5. JANGAN ubah struktur dokumen, formatting, atau bagian lain
  
  Konten halaman asli:
  ${originalPageContent}
  
  Hasil revisi (hanya ubah klausul yang dimaksud):`;
  
      // 3. Minta revisi ke AI
      const revisedPageContent = await generateRevisionWithAI(
        selectedRisk.originalClause,
        selectedRisk.reason,
        systemPrompt // Gunakan prompt khusus ini
      );
  
      // 4. Update store dengan halaman yang direvisi
      useMouStore.getState().updatePageContent(
        selectedRisk.sectionNumber,
        revisedPageContent
      );
  
      // 5. Update revisi klausul di state lokal
      setRisks(prev => prev.map(risk => 
        risk.id === selectedRiskId 
          ? { ...risk, revisedClause: revisedPageContent } 
          : risk
      ));
  
    } catch (error) {
      console.error("Revision error:", error);
      alert("Gagal merevisi klausul");
    } finally {
      setIsSending(false);
      setSelectedRiskId(null);
      setChatPrompt("");
    }
  };

  return (
    <div className="h-screen flex flex-col relative">
      {/* Main Content Area with scroll */}
      <div className="bg-[#1A1A1A] text-white p-4 rounded-md flex-1 overflow-y-auto">
        {loading && processedPages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <FaSpinner data-testid="spinner" className="text-4xl animate-spin" />
          </div>
        )}
  
        {error && <p className="text-red-500 text-center">{error}</p>}
  
        {!loading && !error && risks.length === 0 && (
          <p className="text-gray-400 text-center">No risks found.</p>
        )}
  
        {Object.entries(
          risks.reduce((acc, risk) => {
            acc[risk.sectionNumber] = acc[risk.sectionNumber] || [];
            acc[risk.sectionNumber].push(risk);
            return acc;
          }, {} as Record<number, RiskyClause[]>)
        ).map(([sectionNumber, group]) => (
          <div key={sectionNumber} className="mb-6">
            <h2 className="text-base font-bold mb-2 text-blue-300">📄 Page {sectionNumber}</h2>
            {group.map((risk) => (
              <RiskItem 
                key={risk.id}
                risk={risk}
                isSelected={risk.id === selectedRiskId}
                onSelect={handleSelectClause}
              />
            ))}
          </div>
        ))}
      </div>
  
      {/* Floating Chatbar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#2A2A2A] border-t border-gray-700 p-4">
        <div className="relative">
          <div className={`flex gap-2 items-center ${!selectedRiskId ? 'opacity-50' : ''}`}>
            <input
              type="text"
              placeholder={
                selectedRiskId 
                  ? "Type your revision instructions..." 
                  : "Select a clause to revise..."
              }
              className="flex-1 p-2 rounded-lg bg-gray-800 text-white"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendPrompt()}
              disabled={!selectedRiskId}
            />
            
            <button
              className={`px-4 py-2 rounded-lg ${
                isSending || !selectedRiskId ? 'bg-gray-600' : 'bg-blue-600'
              } text-white`}
              onClick={handleSendPrompt}
              disabled={isSending || !selectedRiskId}
            >
              {isSending ? 'Generating...' : 'Revise'}
            </button>
          </div>
  
          {!selectedRiskId && (
            <div 
              className="absolute inset-0 bg-gray-800 bg-opacity-50 rounded-lg cursor-not-allowed"
              onClick={(e) => e.preventDefault()}
            />
          )}
        </div>
      </div>
    </div>
  );});

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;