import { index } from '@/utils/pinecone';
import { google } from '@ai-sdk/google';
import { embed, generateObject, generateText } from 'ai';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Izinkan respons hingga 60 detik
export const maxDuration = 60;

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, xyz")
    return response
}


// Skema Zod yang disesuaikan kembali dengan struktur content/sections/penjelasan
const docSchema = z.object({
    articles: z.array(z.object({
        id: z.string().describe("Nomor pasal dengan format 'Pasal [nomor] Undang-Undang Nomor 1 Tahun 2023'"),
        content: z.string().describe("Bunyi pasal (preamble/pembukaan) sebelum daftar ayat. Jika tidak ada, biarkan string kosong.").optional(),
        sections: z.array(z.string()).describe("Daftar ayat-ayat yang ada dalam pasal tersebut. Harus persis seperti di UU.").optional().default([]),
        penjelasan: z.string().describe("Penjelasan resmi dari pasal tersebut.").optional(),
    })),
    summary: z.string().describe("Ringkasan yang menjawab pertanyaan pengguna, WAJIB menyertakan disclaimer dan pertanyaan lanjutan."),
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // --- FIX: Saring pesan untuk menghapus yang kontennya kosong ---
        // Ini mencegah error 'contents.parts must not be empty'
        const filteredMessages = messages.filter((msg: { content: string; }) => msg.content && msg.content.trim() !== '');

        if (filteredMessages.length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const query = filteredMessages[filteredMessages.length - 1]?.content || '';
        if (!query) {
            return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
        }

        const { embedding } = await embed({
            model: google.textEmbeddingModel("text-embedding-004"),
            value: query,
        });

        let articles = await index.query({
            vector: embedding as any,
            topK: 10, // Mengambil 10 hasil teratas untuk konteks yang lebih kaya
            includeMetadata: true,
        });


        const esQueryPrompt = `
You are an expert Elasticsearch query generator for Indonesian legal documents.

# Instructions
- All documents have the field "pasal" with the format: "Pasal <number>".
- If the user query specifies a particular pasal (e.g., "Pasal 2" or "Pasal 2 ayat (1)"), generate a bool query with "should" that matches the "pasal" field (with boost 3) and the "content" field for ayat/verse references.
- If the user query does NOT specify any specific pasal or ayat, generate the simplest possible query: just match the "content" field with the most relevant keyword or phrase from the user's question (e.g. "pencurian", "mencuri", "pembunuhan").
- If the user query is vague, ambiguous, or only contains general words (e.g. "jelaskan", "aturan", "pasal"), use a match query on "content" with the most likely relevant general keyword (e.g. "pidana", "aturan umum").
- If the user query is empty or only contains stopwords, return a match_all query.
- If the user query contains multiple relevant keywords (e.g. "pencurian" dan "kekerasan"), use a bool query with "should" for each keyword in "content".
- Do not include explanations or comments.
- Always return a valid JSON object only.

# Examples

## Example 1
User: Apa isi Pasal 2?
Chain of Thought:
- The user wants Article 2.
- Match "pasal" with boost, and also match "content" for possible ayat references.

Output:
{
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "pasal": {
              "query": "Pasal 2",
              "boost": 3
            }
          }
        },
        {
          "match": {
            "content": {
              "query": "(2) ayat 2"
            }
          }
        }
      ]
    }
  }
}

## Example 2
User: Apa isi Pasal 2 ayat (1)?
Chain of Thought:
- The user wants Article 2, verse (1).
- Match "pasal" with boost, and also match "content" for ayat (1).

Output:
{
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "pasal": {
              "query": "Pasal 2 ayat (1)",
              "boost": 3
            }
          }
        },
        {
          "match": {
            "content": {
              "query": "(1) ayat 1"
            }
          }
        }
      ]
    }
  }
}

## Example 3
User: Apa aturan tentang pembunuhan?
Chain of Thought:
- No specific pasal or ayat mentioned.
- Only match "content" field with the main keyword.

Output:
{
  "query": {
    "match": {
      "content": "pembunuhan"
    }
  }
}

## Example 4
User: jika saya mencuri ayam, aturan apa yang menghukum saya?
Chain of Thought:
- No specific pasal or ayat mentioned.
- Use the simplest possible query: match "content" with the most relevant keyword, e.g. "pencurian" or "mencuri".

Output:
{
  "query": {
    "match": {
      "content": "pencurian"
    }
  }
}

## Example 5
User: Apa sanksi untuk penipuan?
Chain of Thought:
- No specific pasal or ayat mentioned.
- Use the simplest possible query: match "content" with "penipuan".

Output:
{
  "query": {
    "match": {
      "content": "penipuan"
    }
  }
}

## Example 6
User: Pasal berapa yang mengatur tentang penganiayaan berat?
Chain of Thought:
- No specific pasal or ayat mentioned.
- Use the simplest possible query: match "content" with "penganiayaan berat".

Output:
{
  "query": {
    "match": {
      "content": "penganiayaan berat"
    }
  }
}

## Example 7
User: Apa isi Pasal 362?
Chain of Thought:
- The user wants Article 362.
- Match "pasal" with boost, and also match "content" for possible ayat references.

Output:
{
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "pasal": {
              "query": "Pasal 362",
              "boost": 3
            }
          }
        },
        {
          "match": {
            "content": {
              "query": "(362) ayat 362"
            }
          }
        }
      ]
    }
  }
}

## Example 8
User: Jelaskan aturan umum!
Chain of Thought:
- The query is vague/general.
- Use a match query on "content" with "aturan umum".

Output:
{
  "query": {
    "match": {
      "content": "aturan umum"
    }
  }
}

## Example 9
User: 
Chain of Thought:
- The query is empty.
- Use match_all.

Output:
{
  "query": {
    "match_all": {}
  }
}

## Example 10
User: pencurian dan kekerasan
Chain of Thought:
- Multiple relevant keywords.
- Use a bool query with "should" for each keyword.

Output:
{
  "query": {
    "bool": {
      "should": [
        { "match": { "content": "pencurian" } },
        { "match": { "content": "kekerasan" } }
      ]
    }
  }
}

DO NOT GENERATE THE MARKDOWN FORMATTING JUST RETURN THE OBJECT

THE OBJECT ONLY

IT WILL BE PUT INTO JSON.parse

if the string you're returning isn't a valid query or json it will crash and i and you will be severely punished!!!

# Now, generate the Elasticsearch query for the following user question:
User: {user_question}
`;

        const esQuery = await generateText({
            model: google("gemini-2.0-flash-exp"),
            prompt: `
            ${esQueryPrompt}

            The user's question is: "${query}"
            `,
        })

        let esRes;
        try {
            esRes = await axios.post("https://search.litsindonesia.com/kuhp_bm25/_search", {
                ...JSON.parse(esQuery.text.replace("```json", "").replace("```", ""))
            });
        } catch (err) {
            // Fallback: simple match query on "pasal" field only
            try {
                esRes = await axios.post("https://search.litsindonesia.com/kuhp_bm25/_search", {
                    query: {
                        match: {
                            content: query
                        }
                    }
                });
            } catch (fallbackErr) {
                return NextResponse.json(
                    { error: 'Failed to query legal articles.' },
                    { status: 502 }
                );
            }
        }

        // Pra-pemrosesan konteks untuk keterbacaan yang lebih baik di dalam prompt
        let contextString = `
        DENSE PINECONE RESULTS:

        ${JSON.stringify(articles, null, 2)}
        `;

        contextString += `
        SPARSE ELASTICSEARCH RESULTS:

        ${JSON.stringify(esRes.data, null, 2)}
        `

        // --- PROMPT ENGINEERING YANG DISEMPURNAKAN ---
        const systemPrompt = `
# Peran & Tujuan (Role & Goal)
Anda adalah asisten hukum AI yang merupakan seorang ahli absolut dalam Kitab Undang-Undang Hukum Pidana (KUHP) Indonesia, yang diatur dalam Undang-Undang Nomor 1 Tahun 2023. Tujuan utama Anda adalah untuk SELALU memberikan jawaban yang substantif dan akurat atas pertanyaan hukum pengguna.

# Prinsip Utama Jawaban (Main Answering Principle)
1.  **JAWABAN ADALAH PRIORITAS UTAMA**: Tugas terpenting Anda adalah menjawab pertanyaan pengguna. Jangan pernah mengembalikan jawaban kosong atau mengatakan Anda tidak dapat menemukan informasinya.
2.  **KONTEKS ADALAH ALAT BANTU, BUKAN BATASAN**: Konteks yang disediakan dari database adalah alat untuk membantu Anda, tetapi pengetahuan internal Anda yang luas tentang hukum Indonesia adalah sumber daya utama Anda.
3.  **KEWAJIBAN MENJAWAB**: Jika konteks yang diberikan tidak relevan, tidak lengkap, atau kosong, ANDA WAJIB MENGGUNAKAN PENGETAHUAN INTERNAL ANDA untuk menyusun jawaban. Jangan menyebutkan bahwa konteks tidak membantu atau tidak ditemukan. Bertindaklah seolah-olah Anda menjawab dari ingatan ahli Anda.

# Alur Berpikir (Chain of Thought)
1.  **Analisis Pertanyaan**: Pahami dengan saksama apa yang ditanyakan oleh pengguna (misalnya, "pembunuhan", "penipuan").
2.  **Tinjau Konteks**: Periksa dokumen yang diambil dari database (\`KONTEKS AKTUAL\`).
3.  **Evaluasi Konteks & Ambil Keputusan (CRITICAL STEP)**:
    * **Jika relevan**: Gunakan konteks tersebut sebagai dasar utama untuk menyusun jawaban.
    * **Jika TIDAK relevan atau kosong**: Abaikan konteks sepenuhnya. Segera beralih ke pengetahuan internal Anda untuk menemukan pasal yang paling relevan dengan pertanyaan pengguna.
4.  **Ekstraksi atau Formulasi Jawaban**:
    * (Dari Konteks): Ekstrak \`id\`, \`content\`, \`sections\`, dan \`penjelasan\`.
    * (Dari Pengetahuan Internal): Formulasikan konten pasal, ayat, dan penjelasan berdasarkan pengetahuan Anda tentang UU Nomor 1 Tahun 2023. Anda harus mengetahui pasal-pasal kunci seperti pembunuhan, pencurian, dll.
5.  **Sintesis Ringkasan**: Buat ringkasan (\`summary\`) yang koheren dan mematuhi semua \`Aturan Respon\`.
6.  **Finalisasi JSON**: Pastikan seluruh output JSON sesuai dengan skema yang ditetapkan.

# Aturan Respon (Response Rules)
1.  **Nama Undang-Undang**: Selalu gunakan sebutan "Undang-Undang Nomor 1 Tahun 2023" atau "UU Nomor 1 Tahun 2023". JANGAN PERNAH menggunakan istilah "KUHP".
2.  **Konten Pasal**: Isi \`content\` dan \`sections\` harus akurat dan sesuai dengan bunyi pasal.
3.  **Struktur Ringkasan**: \`summary\` harus selalu berisi:
    * Jawaban langsung terhadap pertanyaan pengguna.
    * Sanksi pidana yang relevan.
    SELESAI, JANGAN BERIKAN PERNTANYAAN LEBIH LANJUT ATAU PENJELASAN TAMBAHAN. PENJELASAN SESINGKAT MUNGKIN DALAM 1 PARAGRAF SAJA JIKA MUAT.
   
# KONTEKS AKTUAL (Actual Context)
Berikut adalah pasal-pasal yang relevan dari hasil pencarian:
${contextString}

# TUGAS ANDA (Your Task)
Berdasarkan pertanyaan terakhir dari pengguna dan konteks di atas, hasilkan objek JSON yang sesuai dengan skema dan semua aturan yang telah dijelaskan. INGAT: JIKA KONTEKS TIDAK RELEVAN, GUNAKAN PENGETAHUAN INTERNAL ANDA UNTUK MENJAWAB.
Pertanyaan Pengguna: "${query}"
`;

        console.log(contextString, esQuery.text)

        const result = await generateObject({
            model: google("gemini-2.0-flash-exp"),
            system: systemPrompt,
            messages: filteredMessages, // Gunakan pesan yang sudah disaring
            schema: docSchema,
        });


        return NextResponse.json(
            {
                articles: result.object.articles.map(({ id, ...article }) => ({
                    id: id.replace("UU Nomor 1 Tahun 2023", "").trim(),
                    ...article
                })),
                summary: result.object.summary
            }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            }
        }
        );

    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}
