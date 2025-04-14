"use client";

import React, { useCallback, useState, useEffect } from "react";
import { FaSpinner } from "react-icons/fa";
import { useMouStore, RiskyClause } from "@/app/store/useMouStore";
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_PROMPT_REVISION, SYSTEM_PROMPT_ANALYZE, SYSTEM_PROMPT_ORGANIZE, 
        SYSTEM_PROMPT_UPDATE, SYSTEM_PROMPT_USER_EDIT } from "@/app/utils/prompt";
import { apiRequest } from "@/app/utils/apiRequest";
import { fetchFileAndExtractText } from "@/app/utils/fileUtils";

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

export const RiskItem: React.FC<{ 
  risk: RiskyClause; 
  isSelected: boolean;
  onSelect: (id: string, isSelected: boolean) => void;  // New handler for selecting clauses
  onRevise: (risk: RiskyClause) => void;
  onApply: (risk: RiskyClause) => void;
  isLoading: boolean;  // Track the loading state for each risk
}> = ({ risk, isSelected, onSelect, onRevise, onApply, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 border-b border-gray-700 pb-2" id={risk.id}>
      <div className="flex items-center">
      {/* Checkbox for selecting the clause on the left */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(risk.id, e.target.checked)}  // Handle checkbox change
        className="mr-2"
      />
      
      {/* Title beside checkbox on the left */}
      <h3 className="text-base font-semibold flex-1">📌 {risk.title}</h3>
      
      {/* Expand button on the far right */}
      <button 
        className="text-sm text-blue-400 focus:outline-none"
        onClick={() => setExpanded(!expanded)}  // Toggle expansion on button click
      >
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
            {!risk.revisedClause && isLoading && (
              <p className="mt-1 text-yellow-400">⏳ Generating revision...</p>
            )}

            {risk.revisedClause && (
              <>
              <p className="mt-1">
                {(() => {
                  console.log("Rendering revised clause:", risk.revisedClause);
                  return null;
                })()}
                <strong>📝 Suggested Revision:</strong> {risk.revisedClause}
              </p>
              </>
            )}

            {!risk.revisedClause && !isLoading && (
              <button
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevise(risk);  // Call onRevise to get the revision
                }}
              >
                Get Revision
              </button>
            )}

            {risk.revisedClause && (
              <button
                className="mt-2 bg-green-600 px-2 py-1 text-white rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(risk);  // Apply the suggestion
                }}
              >
                Apply Suggestion
              </button>
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
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});  // Loading state for each risk
  const [error, setError] = useState("");
  const [processedPages, setProcessedPages] = useState<number[]>([]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());  // Track selected risks

  const downloadFileAndExtractText = useCallback(async (fileUrl: string) => {
    setError("");
    const pagesText = await fetchFileAndExtractText(fileUrl, process.env.NEXT_PUBLIC_API_URL ?? "", "Error extracting text from backend");
  
    if (pagesText.length === 0) {
      setError("❌ Error extracting text from backend.");
    }
  
    return pagesText;
  }, []);
  
  const analyzeTextWithAI = useCallback(
    async (text: string, sectionNumber: number): Promise<RiskyClause[]> => {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest(SYSTEM_PROMPT_ANALYZE, text, "Error analyzing text");

        if (response.toLowerCase().includes("tidak ditemukan klausul")) return [];

        const riskMatches = response.matchAll(/(?:\*\*)?Klausul\s+(.*?):(?:\*\*)?\s*["']?(.*?)["']?\s*(?:\.\s*)?(?:\*\*)?Alasan:(?:\*\*)?\s*["']?(.*?)["']?(?:\n|$)/g);
        const extractedRisks: RiskyClause[] = Array.from(riskMatches, (match: RegExpMatchArray) => ({
          id: uuidv4(), // Add unique ID
          sectionNumber,
          title: cleanText(`Klausul ${match[1]}`),
          originalClause: cleanText(match[2]),
          reason: cleanText(match[3]),
          revisedClause: "",
          currentClause: cleanText(match[2]),
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
    const organizedText = await apiRequest(SYSTEM_PROMPT_ORGANIZE, text, "Error organizing text");
    return organizedText.trim();
  };

  const handleRevise = async (risk: RiskyClause) => {
    setLoadingStates((prev) => ({ ...prev, [risk.id]: true }));  // Set loading to true for this risk
    try {
      const suggestion = await generateRevisionWithAI(risk.originalClause, risk.reason);
      
      useMouStore.getState().updateRiskyClause(risk.id, {
        revisedClause: suggestion,
      });

      setRisks((prev) =>
        prev.map((r) =>
          r.id === risk.id ? { ...r, revisedClause: suggestion } : r
        )
      );
    } catch (error) {
      console.error("❌ Error generating revision:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [risk.id]: false }));  // Set loading to false for this risk
    }
  };
  
  const handleApplySuggestion = async (risk: RiskyClause) => {
    try {
      const currentPagesContent = useMouStore.getState().pagesContent;
      const originalPageContent = currentPagesContent.find(
        p => p.sectionNumber === risk.sectionNumber
      )?.content || '';
      
      console.log("Original Page Content:", originalPageContent);
      console.log("Risk Clause:", risk.currentClause);
      console.log("Suggestion:", risk.revisedClause);

      const systemPrompt = SYSTEM_PROMPT_UPDATE
      .replace("{originalPageContent}", originalPageContent)
      .replace("{originalClause}", risk.currentClause)
      .replace("{suggestion}", risk.revisedClause || "");
      
      const revisedPageContent = await apiRequest(systemPrompt, originalPageContent, "Error applying revision");

      useMouStore.getState().updatePageContent(risk.sectionNumber, revisedPageContent);
      useMouStore.getState().updateRiskyClause(risk.id, {
            currentClause: risk.revisedClause
      });

      setRisks((prev) =>
        prev.map((r) =>
          r.id === risk.id ? { ...r, currentClause: risk.revisedClause || "" } : r
        )
      );
      // Fetch updated state to verify changes
      const updatedRisk = useMouStore.getState().riskyClauses.find(r => r.id === risk.id);
      console.log("Updated currentClause:", updatedRisk?.currentClause);

    } catch (error) {
      console.error("❌ Error applying suggestion:", error);
      alert("Gagal menerapkan revisi klausul");
    }
  };  

  const generateRevisionWithAI = useCallback(async (
    riskyText: string,
    reason: string
  ): Promise<string> => {
    const systemPrompt = SYSTEM_PROMPT_REVISION.replace("{riskyText}", riskyText).replace("{reason}", reason);
    
    const suggestion = await apiRequest(systemPrompt, riskyText, "Error generating revision");
    return suggestion;
  }, []);

  const handleSelectClause = (riskId: string, isSelected: boolean) => {
    setSelectedRisks((prev) => {
      const newSelectedRisks = new Set(prev);
      if (isSelected) {
        newSelectedRisks.add(riskId);  // Add to set if selected
      } else {
        newSelectedRisks.delete(riskId);  // Remove from set if deselected
      }
      return newSelectedRisks;
    });
  };

  const handleSendPrompt = async () => {
    if (selectedRisks.size === 0) return; // If no clauses are selected
  
    setIsSending(true);
  
    try {
      // 1. Generate system prompts for all selected clauses
      const selectedRiskClauses = risks.filter(risk => selectedRisks.has(risk.id));
      
      // Iterate through each selected risk
      for (const selectedRisk of selectedRiskClauses) {
        const systemPrompt = SYSTEM_PROMPT_USER_EDIT
          .replace("{riskyText}", selectedRisk.currentClause)
          .replace("{revisedClause}", selectedRisk.revisedClause || "")
          .replace("{chatPrompt}", chatPrompt || "");
  
        // 2. Request revision from LLM
        console.log("System Prompt:", systemPrompt);
        console.log("Current Clause:", selectedRisk.currentClause);
        const revisedClause = await apiRequest(systemPrompt, selectedRisk.currentClause, "Error generating revision");
        console.log("Revised Clause:", revisedClause);

        // 3. Update the revisedClause in the local state (for immediate display)
        setRisks((prev) =>
          prev.map((risk) =>
            risk.id === selectedRisk.id ? { ...risk, revisedClause } : risk
          )
        );
        
        useMouStore.getState().updateRiskyClause(selectedRisk.id, {
          revisedClause: revisedClause,
        });
      }
    } catch (error) {
      console.error("Revision error:", error);
      alert("Gagal merevisi klausul");
    } finally {
      setIsSending(false);
      setChatPrompt("");  // Clear the chat input
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
            <h2 className="text-base font-bold mb-2 text-blue-300">Page {sectionNumber}</h2>
            {group.map((risk) => (
              <RiskItem 
              key={risk.id}
              risk={risk}
              isSelected={selectedRisks.has(risk.id)}
              onSelect={handleSelectClause}
              onRevise={handleRevise}
              onApply={handleApplySuggestion}
              isLoading={loadingStates[risk.id] || false}  // Pass isLoading for each risk
            />
            ))}
          </div>
        ))}
      </div>
  
      {/* Floating Chatbar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#2A2A2A] border-t border-gray-700 p-4">
        <div className="relative">
          <div className={`flex gap-2 items-center`}>
            {/* Chat Input for revision instructions */}
            <input
              type="text"
              placeholder={
                selectedRisks.size > 0 
                  ? "Type your revision instructions..." 
                  : "Select clauses to revise..."
              }
              className="flex-1 p-2 rounded-lg bg-gray-800 text-white"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendPrompt()}
              disabled={selectedRisks.size === 0}  // Disable if no clauses are selected
            />
            
            {/* Revise Button */}
            <button
              className={`px-4 py-2 rounded-lg ${isSending || selectedRisks.size === 0 ? 'bg-gray-600' : 'bg-blue-600'} text-white`}
              onClick={handleSendPrompt}
              disabled={isSending || selectedRisks.size === 0}
            >
              {isSending ? 'Generating...' : 'Revise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );});

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;