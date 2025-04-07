// src/strategies/RevisionStrategy.ts
import { AnalysisStrategy } from './AnalysisStrategy';
import { Risk } from '../types';

export class RevisionStrategy implements AnalysisStrategy {
  async analyze(text: string): Promise<Risk[]> {
    throw new Error("Method not implemented.");
  }

  async revise(risk: Risk): Promise<string> {
    const systemPrompt = `
Anda adalah asisten hukum yang bertugas merevisi teks berikut berdasarkan alasan yang diberikan. Tujuannya adalah membuat teks lebih adil dan mengurangi risiko bagi semua pihak yang terlibat. 
      
**Teks Berisiko:** "${risk.risky_text}" 
**Alasan:** "${risk.revision}" 
      
Berikan versi revisi teks yang menangani masalah tersebut sambil tetap menjaga kejelasan dan profesionalisme. JAWABAN REVISI MAKSIMAL HANYA 1 PARAGRAF DAN BERIKAN REVISINYA LANSGUNG SAJA TANPA PENGANTAR ATAU APAPUN
    `;

    const response = await fetch("/api/mou-analyzer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "",
        systemPrompt: systemPrompt,
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
    }

    return accumulatedResponse;
  }
}