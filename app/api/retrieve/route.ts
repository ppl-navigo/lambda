import { Pinecone } from '@pinecone-database/pinecone';
const pc = new Pinecone({
    apiKey: 'pcsk_32CVVK_NTMBs4MWhyyARTVBNx3rVnRwzBxLHhPomGhViFi5xWgnPpBKkDp1WfTiydw3FsK',
    maxRetries: 5,
});
const index = pc.index("kuhp-demo")
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { embeddings } = body;

        if (!embeddings || !Array.isArray(embeddings)) {
            return new Response(JSON.stringify({ error: 'Embeddings array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const queryResponse = await index.query({
            vector: embeddings,
            topK: 20,
            includeValues: true,
            includeMetadata: true,
        });

        const results = queryResponse.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata,
        }));

        return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        console.error('Error processing embeddings:', error);
        return new Response(JSON.stringify({ error: 'Failed to process embeddings' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}