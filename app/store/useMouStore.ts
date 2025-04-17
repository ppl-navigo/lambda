// app/store/useMouStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";
import { v4 as uuidv4 } from "uuid";

/* ---------- Types ---------- */
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
  currentClause: string;
}

interface MouStore {
  /* state */
  pagesContent: PageSection[];
  riskyClauses: RiskyClause[];

  /* actions */
  setPagesContent: (pages: PageSection[]) => void;
  setRiskyClauses: (risks: RiskyClause[]) => void;
  updatePageContent: (sectionNumber: number, newContent: string) => void;
  updateRiskyClause: (id: string, updates: Partial<RiskyClause>) => void;

  /* optional helper: wipe cache when user opens a new PDF */
  reset: () => void;
}

/* ---------- Store with persistence ---------- */
export const useMouStore = create<MouStore>()(
  persist(
    (set, get) => ({
      /* -------------------- state -------------------- */
      pagesContent: [],
      riskyClauses: [],

      /* ------------------- actions ------------------- */
      setPagesContent: (newPages) =>
        set((state) => ({
          pagesContent: [...state.pagesContent, ...newPages],
        })),

      setRiskyClauses: (risks) =>
        set((state) => ({
          riskyClauses: [
            ...state.riskyClauses,
            ...risks.map((r) => ({
              ...r,
              id: r.id || uuidv4(),
              revisedClause: r.revisedClause ?? "",
            })),
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

      updateRiskyClause: (id, updates) =>
        set((state) => ({
          riskyClauses: state.riskyClauses.map((risk) =>
            risk.id === id ? { ...risk, ...updates } : risk
          ),
        })),

      reset: () => set({ pagesContent: [], riskyClauses: [] }),
    }),

    /* ------------- persistence options ------------- */
    {
      name: "mou-cache",                       // key in IndexedDB
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        /* decide what to persist */
        pagesContent: state.pagesContent,
        riskyClauses: state.riskyClauses,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("❌ Rehydration error:", error);
      },
    }
  )
);