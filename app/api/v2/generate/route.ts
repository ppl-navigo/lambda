import { NextRequest } from "next/server";
// import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { google } from "@ai-sdk/google";
import { legalDocumentPageSchema } from "@/utils/legalDocumentPageSchema";
import { SYSTEM_PROMPT } from "@/utils/prompts/generateDoc";
import { checkBalanceThenDeduct } from "@/utils/checkBalanceThenDeduct";
import { supabase } from "@/utils/supabase";

export const maxDuration = 60;
// Define the schema for a single page of the legal document

export async function POST(req: NextRequest) {
    const { promptText, previousState, init, accessToken, refreshToken } = await req.json();
    if (!accessToken || !refreshToken) {
        return new Response(
            JSON.stringify({ error: "Missing access/refresh token" }),
            {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
    const { data: sessionData } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });
    if (!sessionData.session || !sessionData.session.user) {
        return new Response(
            JSON.stringify({ error: "Invalid session" }),
            {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
    try {
        if (init) {
            await checkBalanceThenDeduct(
                sessionData.session.user.id,
                20000,
            );
        }
    } catch (error) {
        console.error("Balance check failed:", error);
        return new Response(
            JSON.stringify({ error: "Insufficient balance" }),
            {
                status: 402,
                headers: {
                    "Content-Type": "application/json",
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            }
        );
    }
    try {

        // Extract data from prompt for initial generation
        // Structured state management for document generation
        const initialState = createInitialState(previousState, promptText);

        // Generate the appropriate prompt context based on generation stage
        const promptContext = generatePromptContext(previousState, promptText, initialState);

        const res = await streamObject({
            // model: openai("gpt-4o-flas"),
            model: google("gemini-2.5-flash-preview-04-17"),
            schema: legalDocumentPageSchema,
            system: SYSTEM_PROMPT,
            prompt: promptContext,
            temperature: 0.5,
            schemaDescription: "Generate a legal document in Indonesian language with rich markdown formatting and structured numbered lists.",
        });

        const response = res.toTextStreamResponse();
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        response.headers.set('Access-Control-Max-Age', '86400');
        return response;

    } catch (error) {
        console.error("Error in /api/new-generate:", error);
        return new Response(JSON.stringify({ error: "Error generating legal document" }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

/**
 * Creates the initial state for document generation
 */
function createInitialState(previousState: any, promptText: any) {
    if (previousState) return previousState;

    return {
        status: {
            marker: "SOS",
            completionStatus: 0,
            isComplete: false,
            remainingElements: ["pembukaan", "isi_kontrak", "penutup"]
        },
        promptText,
        currentPage: {
            pageType: "cover",
            elements: []
        },
        navigation: {
            currentDocumentSummary: "",
            previousPageSummary: "",
            nextPageHint: "Pembukaan dokumen dengan identifikasi para pihak",
            isLastPage: false
        },
        formalities: {
            tempatPenandatanganan: "Jakarta",
            tanggalPenandatanganan: formatIndonesianDate(new Date()),
            materai: true,
            nilaiMaterai: "Rp10.000"
        }
    };
}

/**
 * Generates the appropriate prompt context based on generation stage
 */
function generatePromptContext(previousState: any, promptText: any, initialState: any) {
    // Base context always included
    const baseContext = `
    [KONTEKS DASAR]
    ${promptText}
    
    [STATUS DOKUMEN]
    ${JSON.stringify(initialState, null, 2)}
    `;

    // Generate continuation context if this is not the first generation
    const continuationContext = previousState ? `
    [INFORMASI LANJUTAN]
    Status sebelumnya: ${previousState.status?.marker || "undefined"}
    Penyelesaian: ${previousState.status?.completionStatus || 0}%
    Tipe halaman terakhir: ${previousState.currentPage?.pageType || "undefined"}
    
    Ringkasan halaman sebelumnya: 
    ${previousState.navigation?.previousPageSummary || "Belum ada halaman sebelumnya."}
    
    ${previousState.status?.marker === "MID" ?
            "Lanjutkan pembuatan dokumen dari posisi ini. Selesaikan elemen yang belum lengkap." :
            "Buat halaman berikutnya sesuai dengan alur dokumen."}
    ` : "";

    // Determine if we're starting fresh or continuing
    if (!previousState) {
        return `
        [KONTEKS DASAR]
        ${baseContext}
        `;
    } else {
        // Continuation prompt with specific guidance based on current position
        return `
        [KONTEKS DASAR]
        ${baseContext}
        
        [KONTEKS LANJUTAN]
        ${continuationContext}
        `;
    }
}

// Helper function to format date in Indonesian format
function formatIndonesianDate(date: Date): string {
    const day = date.getDate();
    const month = getIndonesianMonth(date.getMonth());
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Helper function for Indonesian month names
function getIndonesianMonth(monthIndex: number): string {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[monthIndex];
}

