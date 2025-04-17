"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useMouStore, RiskyClause } from "@/app/store/useMouStore";
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_PROMPT_REVISION, SYSTEM_PROMPT_ANALYZE, SYSTEM_PROMPT_ORGANIZE, 
        SYSTEM_PROMPT_UPDATE, SYSTEM_PROMPT_USER_EDIT } from "@/app/utils/prompt";
import { apiRequest } from "@/app/utils/apiRequest";
import { fetchFileAndExtractText } from "@/app/utils/fileUtils";
import { toast } from 'react-toastify';
import RiskClausesLayout from "./RiskClausesLayout";
import 'react-toastify/dist/ReactToastify.css';
import pLimit from "p-limit";

const CONCURRENCY = 3;               // tune: 3‑4 is usually optimal
const limit       = pLimit(CONCURRENCY);

interface MarkdownViewerProps {
  pdfUrl: string | null;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({ pdfUrl }) => {
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

  const commitOrderedPage = (page: { sectionNumber: number; content: string }) =>
    useMouStore.setState(state => {
      /* replace if we already have this section, otherwise add it */
      const without = state.pagesContent.filter(
        p => p.sectionNumber !== page.sectionNumber
      );
      const ordered = [...without, page].sort(
        (a, b) => a.sectionNumber - b.sectionNumber
      );
      return { pagesContent: ordered };
    });

    const processDocument = useCallback(async () => {
      if (!pdfUrl) return;
      setLoading(true);
      setError("");
    
      try {
        const pages = await downloadFileAndExtractText(pdfUrl); // still sequential
    
        const tasks = pages.map((rawPageText, idx) =>
          limit(async () => {
            const sectionNumber = idx + 1;
    
            /* ---------- organize ---------- */
            const organizedText = await organizeTextWithLLM(rawPageText);
    
            /* ordered commit instead of plain push  */
            commitOrderedPage({ sectionNumber, content: organizedText });
    
            /* ---------- analyse ---------- */
            const pageRisks = await analyzeTextWithAI(organizedText, sectionNumber);
            if (pageRisks.length) {
              useMouStore.getState().setRiskyClauses(pageRisks);
              setRisks(prev => [...prev, ...pageRisks]);
            }
    
            setProcessedPages(prev => [...prev, sectionNumber]); // progress bar
          })
        );
    
        await Promise.all(tasks); // max 3 running simultaneously
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
  
    /** clear previous PDF data */
    useMouStore.getState().reset();
    setRisks([]);
    setProcessedPages([]);
  
    const id = setTimeout(processDocument, 300);
    return () => clearTimeout(id);
  }, [pdfUrl]);

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

      toast.success("Revisi berhasil dihasilkan!");
    } catch (error) {
      console.error("❌ Error generating revision:", error);
      toast.error("Gagal untuk menghasilkan revisi!");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [risk.id]: false }));  // Set loading to false for this risk
    }
  };
  
  const handleApplySuggestion = async (risk: RiskyClause) => {
    try {
      const currentPagesContent = useMouStore.getState().pagesContent;
      const originalPageContent = currentPagesContent.find(
        p => p.sectionNumber === risk.sectionNumber
      )?.content ?? '';
      
      // Remove highlight tags from the original content
      const cleanedOriginalContent = originalPageContent.replace(
        /<highlight>([\s\S]*?)<\/highlight>/g,
        '$1'
      );
      
      console.log("Original Page Content:", cleanedOriginalContent);
      console.log("Risk Clause:", risk.currentClause);
      console.log("Suggestion:", risk.revisedClause);

      const systemPrompt = SYSTEM_PROMPT_UPDATE
      .replace("{originalPageContent}", cleanedOriginalContent)
      .replace("{originalClause}", risk.currentClause)
      .replace("{suggestion}", risk.revisedClause ?? "");
      
      const revisedPageContent = await apiRequest(systemPrompt, "", "Error applying revision");

      useMouStore.getState().updatePageContent(risk.sectionNumber, revisedPageContent);
      useMouStore.getState().updateRiskyClause(risk.id, {
            currentClause: risk.revisedClause
      });

      setRisks((prev) =>
        prev.map((r) =>
          r.id === risk.id ? { ...r, currentClause: risk.revisedClause ?? "" } : r
        )
      );
      toast.success("Revisi berhasil diterapkan!");

    } catch (error) {
      console.error("❌ Error applying suggestion:", error);
      toast.error("Gagal menerapkan revisi klausul!");
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
          .replace("{revisedClause}", selectedRisk.revisedClause ?? "")
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
      toast.success("Revisi berhasil dikirimkan!");
    } catch (error) {
      console.error("Revision error:", error);
      toast.error("Gagal untuk merevisi klausul!");
    } finally {
      setIsSending(false);
      setChatPrompt("");  // Clear the chat input
    }
  };

  return (
    <RiskClausesLayout
      risks={risks}
      loading={loading}
      processedPages={processedPages}
      error={error}
      selectedRisks={selectedRisks}
      loadingStates={loadingStates}
      handleSelectClause={handleSelectClause}
      handleRevise={handleRevise}
      handleApplySuggestion={handleApplySuggestion}
      chatPrompt={chatPrompt}
      setChatPrompt={setChatPrompt}
      isSending={isSending}
      handleSendPrompt={handleSendPrompt}
    />
  );
  });

MarkdownViewer.displayName = "MarkdownViewer";
export default MarkdownViewer;