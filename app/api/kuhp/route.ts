import { handleLegalRequest } from '@/app/lib/legal-api-handler';
import { NextResponse } from 'next/server';

// Allow responses to take up to 60 seconds
export const maxDuration = 60;

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
}

export async function POST(req: Request) {
    return handleLegalRequest(req, 'kuhp');
}