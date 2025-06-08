import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
    const res = new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
    return res;
}

export const maxDuration = 60; // Allow streaming responses up to 60 seconds
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query string is required' },
                { status: 400 }
            );
        }

        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'bge-m3:latest',
                prompt: query,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            embeddings: data.embedding || data.embeddings,
            new_query: query,
        });

    } catch (error) {
        console.error('Embedding API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate embeddings' },
            { status: 500 }
        );
    }
}
