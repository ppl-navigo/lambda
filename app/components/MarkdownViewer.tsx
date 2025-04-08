"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import { useCallback } from "react";
import ReactMarkdown from "react-markdown"; // Importing react-markdown
import remarkGfm from "remark-gfm"; 
import remarkBreaks from 'remark-breaks';
import { useMouStore, RiskyClause  } from "@/app/store/useMouStore";

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}


export const RiskItem: React.FC<{ risk: RiskyClause; onRevise: (risk: RiskyClause) => void }> = ({ risk, onRevise }) => {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ⬅️ Add this

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    await onRevise(risk);
    setIsLoading(false);
  };

  return (
    <div className="mb-4 border-b border-gray-700 pb-2">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className="text-lg font-semibold">📌 {risk.title}</h3>
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
          {/* ⏳ Show loading indicator if revision is being generated */}
          {!risk.revisedClause && isLoading && (
            <p className="mt-1 text-yellow-400">⏳ Generating revision...</p>
          )}
          {risk.revisedClause && (
            <p className="mt-1">
              <strong>📝 Revision:</strong> {risk.revisedClause}
            </p>
          )}
          {!risk.revisedClause && !isLoading && (
            <button
              className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
              onClick={handleClick}
            >
              Get Revision
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ pdfUrl }) => {
const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({ pdfUrl }) => {
  const {
    pagesContent,
    setPagesContent,
    setRiskyClauses,
  } = useMouStore();

  const [risks, setRisks] = useState<RiskyClause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const downloadFileAndExtractText = useCallback(async (fileUrl: string) => {
    try {
      // console.log("📄 Downloading file from Cloudinary for text extraction:", fileUrl);
  
      // Step 1: Download the file from Cloudinary as a Blob
      const fileResponse = await axios.get(fileUrl, { responseType: "blob" });
      const fileBlob = fileResponse.data;
  
      // Step 2: Create a temporary File object from the Blob
      const fileName = fileUrl.split("/").pop() || "unknown-file";
      const fileType = fileResponse.headers["content-type"];
      const file = new File([fileBlob], fileName, { type: fileType });
  
      // Step 3: Send the File object to the backend for extraction
      const formData = new FormData();
      formData.append("file", file); // Append the File object
  
      const extractResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/extract_text/`,
        formData
      );
  
      const pagesText: string[] = extractResponse.data.pages_text;
      // console.log(`📄 Total pages extracted: ${pagesText.length}`);
  
      // Cleanup: No need to delete the file in browser-based environments
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
  
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "user",
          content: `Analyzing document page ${sectionNumber} for potential risks...`,
        },
      ]);
  
      try {
        // console.log(`🤖 AI Analysis Attempt ${attempt} for section ${sectionNumber}...`);
  
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

Jangan lupa berikan jawaban beserta dengan newline untuk readibility

Jika dokumen memiliki bahasa yang tidak dikenali, tampilkan pesan: "Bahasa tidak didukung". Jika tidak ditemukan klausul berisiko, tampilkan pesan: "Tidak ditemukan klausul yang dapat dianalisis". Jika terjadi kesalahan sistem, tampilkan pesan: "Gagal menganalisis dokumen, coba lagi nanti".

Setiap klausul yang ditandai harus memiliki minimal satu alasan mengapa klausul tersebut berisiko, tetapi jangan berikan rekomendasi perbaikan terlebih dahulu.

**Contoh Format Jawaban:** 

\`\`\`
Berikut adalah analisis dari beberapa klausul yang berpotensi berisiko beserta alasannya:

**Klausul judul1:**
"xxx"
**Alasan:**
"xxx"

**Klausul judul2:**
"xxx"
**Alasan:**
"xxx"

**Kesimpulan:**
"xxx"

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

        setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        
        // Reading and processing the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break; // When the stream is done, stop reading

          // Decode the chunk and append it to the accumulated response
          const chunk = decoder.decode(value, { stream: true });

          // Directly append the chunk (which is plain text) to the accumulated response
          accumulatedResponse += chunk
          // console.log("Received chunk:", chunk);
          // console.log(accumulatedResponse);
          // Add the streamed response to the chat
          setChatMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage?.role === "assistant") {
              return [
                ...prevMessages.slice(0, -1),
                { role: "assistant", content: accumulatedResponse },
              ];
            }
            console.log("No last message found, returning previous messages");
            return prevMessages;
          });
      }

      // console.log(`📄 Response for section ${sectionNumber}:`, accumulatedResponse);

      if (!accumulatedResponse || accumulatedResponse.trim() === "") return [];
      if (accumulatedResponse.toLowerCase().includes("tidak ditemukan klausul")) return [];

      // 🔹 Parse AI Response into Risks
      const riskMatches = accumulatedResponse.matchAll(/(?:\*\*)?Klausul\s+(.*?):(?:\*\*)?\s*["']?(.*?)["']?\s*(?:\.\s*)?(?:\*\*)?Alasan:(?:\*\*)?\s*["']?(.*?)["']?(?:\n|$)/g);
      const extractedRisks: RiskyClause[] = Array.from(riskMatches, (match: RegExpMatchArray) => ({
        sectionNumber, // You can replace 0 later with the actual page number when processing per page
        title: cleanText(`Klausul ${match[1]}`),
        originalClause: cleanText(match[2]),
        reason: cleanText(match[3]),
      }));
      
      // console.log("⚠️ Extracted Risks:", extractedRisks);
      return extractedRisks;
    } catch (error) {
      console.error(`❌ Error analyzing section ${sectionNumber}:`, error);
      setError("❌ Gagal menganalisis dokumen, coba lagi nanti.");
      return [];
    } finally {
      setLoading(false);
    }
  },[]
);
    
const processDocument = useCallback(async () => {
  setLoading(true);
  setError("");

  if (!pdfUrl) return;

  try {
    const pages = await downloadFileAndExtractText(pdfUrl);

    for (let i = 0; i < pages.length; i++) {
      const sectionNumber = i + 1;
      const rawPageText = pages[i];

      // === 1. ORGANIZE TEXT WITH LLM ===
      const organizedText = await organizeTextWithLLM(rawPageText);
      setPagesContent([...pagesContent, { sectionNumber, content: organizedText }]);

      // === 2. ANALYZE RISKS ===
      const risks = await analyzeTextWithAI(organizedText, sectionNumber);

      if (risks.length > 0) {
        setRiskyClauses(risks);
        setRisks((prev) => [...prev, ...risks]);
      }

      // ✅ If no risks, you can add a "clean" section note if needed
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
  // Debounced useEffect
  useEffect(() => {
    if (!pdfUrl) return;

    // console.log("📢 Loading PDF...");
    const timeoutId = setTimeout(() => {
      processDocument();
    }, 300); // Prevents multiple executions

    return () => clearTimeout(timeoutId); // Cleanup to prevent multiple runs
  }, [pdfUrl, processDocument]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);  

  const organizeTextWithLLM = async (text: string): Promise<string> => {
    const systemPrompt = `
  Susun ulang teks dokumen berikut agar terlihat rapi dan profesional untuk ditampilkan kembali. Gunakan format markdown, tetapi jangan ada format tabel. Pastikan setiap poin atau bagian memiliki pemisahan yang jelas. Jangan menghilangkan struktur asli dokumen, seperti judul, subjudul, dan pemisahan antara bagian. 
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

  const generateRevisionWithAI = useCallback(async (riskyText: string, reason: string): Promise<string> => {
    try {
      // console.log("🔄 Generating revision for:", riskyText);

      const systemPrompt = `Anda adalah asisten hukum yang bertugas merevisi teks berikut berdasarkan alasan yang diberikan. Tujuannya adalah membuat teks lebih adil dan mengurangi risiko bagi semua pihak yang terlibat. 
      
      **Teks Berisiko:** "${riskyText}" 
      **Alasan:** "${reason}" 
      
      Berikan versi revisi teks yang menangani masalah tersebut sambil tetap menjaga kejelasan dan profesionalisme. JAWABAN REVISI MAKSIMAL HANYA 1 PARAGRAF DAN BERIKAN REVISINYA LANSGUNG SAJA TANPA PENGANTAR ATAU APAPUN
      `;;

      const response = await fetch("/api/mou-analyzer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: ``,
          systemPrompt,
        }),
      });

      if (!response.body) throw new Error("No stream body received");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        setChatMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage?.role === "assistant") {
            return [
              ...prevMessages.slice(0, -1),
              { role: "assistant", content: accumulatedResponse },
            ];
          }
          return prevMessages;
        });
      }

      return accumulatedResponse;
    } catch (error) {
      console.error("❌ Error generating revision:", error);
      return "Error generating revision.";
    }
  }, []);

  const handleRevise = useCallback(
    async (risk: RiskyClause) => {
      const userMessage = `Generating revision for Klausul ${risk.title}...`;
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: userMessage },
      ]);

      const revisedText = await generateRevisionWithAI(risk.originalClause, risk.reason);

      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: `Berikut adalah perbaikan yang disarankan:\n\n${revisedText}`},
      ]);

      setRisks((prevRisks) =>
        prevRisks.map((r) =>
          r === risk ? { ...r, revisedClause: revisedText } : r
        )
      );
    },
    [generateRevisionWithAI]
  );

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      <div className="bg-[#1A1A1A] text-white p-4 rounded-md overflow-y-auto">
        {loading && <FaSpinner data-testid="spinner" className="text-4xl animate-spin" />}
        {error && <p>{error}</p>}
        {!loading && !error && risks.length === 0 && <p>No risks found.</p>}
        {!loading && Object.entries(
          risks.reduce((acc, risk) => {
            acc[risk.sectionNumber] = acc[risk.sectionNumber] || [];
            acc[risk.sectionNumber].push(risk);
            return acc;
          }, {} as Record<number, RiskyClause[]>)
        ).map(([sectionNumber, group]) => (
          <div key={sectionNumber} className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-blue-300">📄 Page {sectionNumber}</h2>
            {group.map((risk, index) => (
              <RiskItem key={index} risk={risk} onRevise={handleRevise} />
            ))}
          </div>
        ))}

      </div>
      <div className="bg-gray-800 text-white p-4 rounded-md overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">AI Chat:</h3>
        <div className="space-y-2">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-md ${
                msg.role === "user" ? "bg-blue-500 self-end" : "bg-gray-700 self-start"
              } max-w-[80%]`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
});

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;