
import { Risk } from '../types';

// src/strategies/AnalysisStrategy.ts
export interface AnalysisStrategy {
    analyze(text: string): Promise<Risk[]>;
    revise(risk: Risk): Promise<string>;
  }