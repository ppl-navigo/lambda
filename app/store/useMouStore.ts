import { create } from "zustand";

export interface PageSection {
  sectionNumber: number;
  content: string;
}

export interface RiskyClause {
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
      riskyClauses: [...state.riskyClauses, ...risks],
    })),
}));
