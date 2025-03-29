// src/strategies/RiskAnalysisStrategy.ts
import { AnalysisStrategy } from './AnalysisStrategy';
import { Risk } from '../types';
import { AiService } from '../services/aiService';

export class RiskAnalysisStrategy implements AnalysisStrategy {
  async analyze(text: string): Promise<Risk[]> {
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

    const response = await fetch("/api/mou-analyzer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: text,
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

    const cleanText = (text: string) => {
        return text.replace(/\*\*/g, "").trim();
      };
    const riskMatches = accumulatedResponse.matchAll(/\*\*Klausul\s+([\w\s().,]+):\*\*\s*['"]?(.*)['"]?\s*\.?\s*\*\*Alasan:\*\*\s*['"]?(.*)['"]?(?:$|\n)/g);
    const extractedRisks: Risk[] = Array.from(riskMatches, (match: RegExpMatchArray) => ({
        clause: cleanText(`Klausul ${match[1]}`),
        risky_text: cleanText(match[2]),
        reason: cleanText(match[3]),
    }));

    return extractedRisks.length ? extractedRisks : [{
      clause: "N/A",
      risky_text: "Tidak ditemukan klausul berisiko",
      reason: "Dokumen tampak aman"
    }];
  }

  async revise(risk: Risk): Promise<string> {
    throw new Error("Method not implemented.");
  }
}