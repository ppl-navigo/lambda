"use client";

import { useState, useEffect } from "react";
import React from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import { useCallback } from "react";
import ReactMarkdown from "react-markdown"; // Importing react-markdown
import remarkGfm from "remark-gfm"; 
import remarkBreaks from 'remark-breaks';

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

interface Risk {
  clause: string;
  risky_text: string;
  reason: string;
  revision?: string; // Optional field for the revised text
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const RiskItem: React.FC<{ risk: Risk; onRevise: (risk: Risk) => void }> = ({ risk, onRevise }) => {
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
          {risk.revision && (
            <p className="mt-1">
              <strong>📝 Revision:</strong> {risk.revision}
            </p>
          )}
          {!risk.revision && (
            <button
              className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
              onClick={(e) => {
                e.stopPropagation(); // Prevent collapsing the item
                onRevise(risk);
              }}
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
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const downloadFileAndExtractText = useCallback(async (fileUrl: string) => {
    try {
      let filename = fileUrl.split("/stream/")[1];
      filename = filename.replace(/^uploads\/uploads\//, "uploads/");
  
      console.log("📂 Using filename for text extraction:", filename);
  
      // Step 1: Download file from your own backend
      const fileResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/download/${filename}`,
        { responseType: "blob" }
      );
  
      const fileBlob = fileResponse.data;
      const file = new File([fileBlob], filename);
  
      // Step 2: Upload it to the backend for extraction
      const formData = new FormData();
      formData.append("file", file);

      const extractResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/extract_text/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
  
      const extractedText = extractResponse.data.extracted_text;
      console.log("📝 Extracted text from backend:", extractedText.substring(0, 500));
      return extractedText;
    } catch (error) {
      console.error("❌ Error extracting text from backend:", error);
      setError("❌ Error extracting text from backend.");
      return "";
    }
  }, []);

  const analyzeTextWithAI = useCallback(async (text: string) => {
    setLoading(true);
    setError("");
    setRisks([]);
  
    const MAX_RETRIES = 3;
    let accumulatedResponse = "";
    
    // Add a "user" message to indicate the start of analysis
    setChatMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: "Analyzing document for potential risks..." },
    ]);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 AI Analysis Attempt ${attempt}...`);
  
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
Klausul {nomor}: "{kalimat atau kata-kata berisiko}"
Alasan: "{penjelasan mengapa klausul ini berisiko}"
\`\`\`

Jangan lupa berikan jawaban beserta dengan newline untuk readibility

Jika dokumen memiliki bahasa yang tidak dikenali, tampilkan pesan: "Bahasa tidak didukung". Jika tidak ditemukan klausul berisiko, tampilkan pesan: "Tidak ditemukan klausul yang dapat dianalisis". Jika terjadi kesalahan sistem, tampilkan pesan: "Gagal menganalisis dokumen, coba lagi nanti".

Setiap klausul yang ditandai harus memiliki minimal satu alasan mengapa klausul tersebut berisiko, tetapi jangan berikan rekomendasi perbaikan terlebih dahulu.

**Contoh Format Jawaban:** 

\`\`\`
Berikut adalah analisis dari beberapa klausul yang berpotensi berisiko beserta alasannya:

**Klausul 1:**
"xxx"
**Alasan:**
"xxx"

**Klausul 2:**
"xxx"
**Alasan:**
"xxx"

**Kesimpulan:**
"xxx"

\`\`\`
`;

        // Make a request to the backend API
        const response = await fetch("/api/mou-analyzer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            promptText: text,       // User input
            systemPrompt: systemPrompt, // Dynamic system prompt
          }),
        });
  
        if (!response.body) throw new Error("No stream body received");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        // Add an initial "assistant" message to the chat
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: "" },
        ]);
        
        // Reading and processing the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break; // When the stream is done, stop reading

          // Decode the chunk and append it to the accumulated response
          const chunk = decoder.decode(value, { stream: true });

          // Directly append the chunk (which is plain text) to the accumulated response
          accumulatedResponse += chunk
          console.log("Received chunk:", chunk);
          console.log(accumulatedResponse);
          // Add the streamed response to the chat
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

    console.log(accumulatedResponse);

    if (!accumulatedResponse) {
      setError("❌ Gagal menganalisis dokumen: Tidak ada respons yang valid dari AI.");
      setLoading(false);
      return;
    }

    // 🔹 Parse AI Response into Risks
    const riskMatches = accumulatedResponse.matchAll(/\*\*Klausul\s+([\w\s().,]+):\*\*\s*['\"]?(.*)['\"]?\s*\.?\s*\*\*Alasan:\*\*\s*['\"]?(.*)['\"]?(?:\n|$)/g);
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
    return text.replace(/\*\*/g, "").trim();
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

  const generateRevisionWithAI = useCallback(async (riskyText: string, reason: string): Promise<string> => {
    try {
      console.log("🔄 Generating revision for:", riskyText);

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
    async (risk: Risk) => {
      const userMessage = `Generating revision for Klausul ${risk.clause}...`;
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: userMessage },
      ]);

      const revisedText = await generateRevisionWithAI(risk.risky_text, risk.reason);

      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: revisedText },
      ]);

      setRisks((prevRisks) =>
        prevRisks.map((r) =>
          r === risk ? { ...r, revision: revisedText } : r
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
        {!loading && risks.map((risk, index) => (
          <RiskItem key={index} risk={risk} onRevise={handleRevise} />
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
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: (props) => <p className="text-sm" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;