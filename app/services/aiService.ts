// src/services/aiService.ts
import { RiskAnalysisStrategy } from '../strategies/RiskAnalysisStrategy';
import { RevisionStrategy } from '../strategies/RevisionStrategy';
import { Risk } from '../types';

export class AiService {
  private static instance: AiService;
  private riskAnalysisStrategy: RiskAnalysisStrategy;
  private revisionStrategy: RevisionStrategy;

  private constructor() {
    this.riskAnalysisStrategy = new RiskAnalysisStrategy();
    this.revisionStrategy = new RevisionStrategy();
  }

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  public async analyzeText(text: string): Promise<Risk[]> {
    return this.riskAnalysisStrategy.analyze(text);
  }

  public async generateRevision(risk: Risk): Promise<string> {
    return this.revisionStrategy.revise(risk);
  }
}