import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid';

export interface PageSection {
  sectionNumber: number;
  content: string;
}

export interface RiskyClause {
  id: string;
  sectionNumber: number;
  title: string;
  originalClause: string;
  reason: string;
  revisedClause?: string;
  suggestion?: string;
}

interface MouStore {
  pagesContent: PageSection[];
  riskyClauses: RiskyClause[];
  setPagesContent: (pages: PageSection[]) => void;
  setRiskyClauses: (risks: RiskyClause[]) => void;
  updatePageContent: (sectionNumber: number, newContent: string) => void;
}

export const useMouStore = create<MouStore>((set) => ({
  pagesContent: [],
  riskyClauses: [],
  
  setPagesContent: (newPages) =>
    set((state) => ({
      pagesContent: [...state.pagesContent, ...newPages],
    })),

  setRiskyClauses: (risks) =>
    set((state) => ({
      riskyClauses: [
        ...state.riskyClauses,
        ...risks.map(risk => ({
          ...risk,
          id: risk.id || uuidv4(), // Generate ID jika belum ada
          revisedClause: risk.revisedClause || "",
          suggestion: risk.suggestion || ""
        }))
      ],
    })),

  updatePageContent: (sectionNumber, newContent) =>
    set((state) => ({
      pagesContent: state.pagesContent.map((page) =>
        page.sectionNumber === sectionNumber 
          ? { ...page, content: newContent } 
          : page
      ),
    })),
}));