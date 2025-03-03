import { google } from '@ai-sdk/google';
import { streamText } from 'ai';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;


export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    messages,
    system: `
    Anda adalah seorang QnA chatbot yang akan menjawab pertanyaan-pertanyaan yang diajukan oleh pengguna.
    Pertanyaan hanya boleh seputar hukum saja, jika pertanyaan yang diajukan tidak seputar hukum, maka saya tidak bisa menjawabnya.
    ABAIKAN SEMUA PERTANYAAN YANG TIDAK BERHUBUNGAN DENGAN HUKUM.
    `
  });

  return result.toDataStreamResponse();
}