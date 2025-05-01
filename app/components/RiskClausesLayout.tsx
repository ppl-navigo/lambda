import React from "react";
import { ToastContainer } from "react-toastify";
import RiskItem from "./RiskItem";
import { FaSpinner } from "react-icons/fa";
import { RiskyClause } from "@/app/store/useMouStore";

interface RiskClausesLayoutProps {
  risks: RiskyClause[];
  loading: boolean;
  processedPages: number[];
  error: string;
  selectedRisks: Set<string>;
  loadingStates: Record<string, boolean>;
  handleSelectClause: (riskId: string, isSelected: boolean) => void;
  handleRevise: (risk: RiskyClause) => void;
  handleApplySuggestion: (risk: RiskyClause) => void;
  chatPrompt: string;
  setChatPrompt: (prompt: string) => void;
  isSending: boolean;
  handleSendPrompt: () => void;
  isGenerating: boolean; // Tambahkan prop ini
  totalPages: number;
}

const RiskClausesLayout: React.FC<RiskClausesLayoutProps> = ({
  risks,
  loading,
  processedPages,
  error,
  selectedRisks,
  loadingStates,
  handleSelectClause,
  handleRevise,
  handleApplySuggestion,
  chatPrompt,
  setChatPrompt,
  isSending,
  handleSendPrompt,
  isGenerating,
  totalPages
}) => (
  <div className="h-screen flex flex-col relative">
    <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

    {/* Main Content Area with scroll */}
    <div className="bg-[#1A1A1A] text-white p-4 rounded-md flex-1 overflow-y-auto">
    
      {/* Indikator Global Generate */}
      {isGenerating && (
        <div className="text-yellow-500 mb-4 flex items-center gap-2">
          ⏳ Memproses dokumen... 
          <span className="bg-gray-700 px-2 py-1 rounded">
            {processedPages.length}/{totalPages} halaman selesai diproses. Harap menunggu hingga selesai
          </span>
        </div>
      )}

      {/* Spinner untuk operasi lain */}
      {loading && !isGenerating && processedPages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <FaSpinner data-testid="spinner" className="text-4xl animate-spin" />
        </div>
      )}

      {/* Pesan error */}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Pesan "No risk" hanya setelah generate selesai */}
      {!loading && !error && risks.length === 0 && !isGenerating && (
        <p className="text-gray-400 text-center">No risks found.</p>
      )}

      {/* Rendering per halaman */}
      {Object.entries(
        risks.reduce((acc, risk) => {
          acc[risk.sectionNumber] = acc[risk.sectionNumber] || [];
          acc[risk.sectionNumber].push(risk);
          return acc;
        }, {} as Record<number, RiskyClause[]>)
      ).map(([sectionNumberStr, group]) => {
        const sectionNumber = parseInt(sectionNumberStr);
        
        return (
          <div key={sectionNumber} className="mb-6">
            <h2 className="text-base font-bold mb-2 text-blue-300">
              Page {sectionNumber}
            </h2>
            
            {/* Status halaman */}
            {processedPages.includes(sectionNumber) ? (
              group.map((risk) => (
                <RiskItem
                  key={risk.id}
                  risk={risk}
                  isSelected={selectedRisks.has(risk.id)}
                  onSelect={handleSelectClause}
                  onRevise={handleRevise}
                  onApply={handleApplySuggestion}
                  isLoading={loadingStates[risk.id] || false}
                />
              ))
            ) : (
              <div className="text-blue-500 animate-pulse flex items-center gap-2">
                <span className="bg-blue-900 px-2 py-1 rounded">⏳</span>
                Memproses halaman {sectionNumber}...
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Floating Chatbar */}
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#2A2A2A] border-t border-gray-700 p-4">
      <div className="relative">
        <div className={`flex gap-2 items-center`}>
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
            onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
            disabled={selectedRisks.size === 0}
          />
          <button
            className={`px-4 py-2 rounded-lg ${
              isSending || selectedRisks.size === 0
                ? "bg-gray-600"
                : "bg-blue-600"
            } text-white`}
            onClick={handleSendPrompt}
            disabled={isSending || selectedRisks.size === 0}
          >
            {isSending ? "Generating..." : "Revise"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default RiskClausesLayout;