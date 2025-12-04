
const { Pinecone } = require('@pinecone-database/pinecone');
const { google } = require('@ai-sdk/google');
const { embed } = require('ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const PINECONE_API_KEY = "pcsk_6HxVW5_6SKbgf6f76Z9KwEPov2BsDv3pxH4Kbv6gz5MUb8taXvggEDkwLnx1nz7BPJQdoU";
const INDEX_NAME = "kuhp-demo-gemini";

async function seed() {
    console.log("Starting seeding process...");

    // Initialize Pinecone
    const pc = new Pinecone({
        apiKey: PINECONE_API_KEY,
    });
    const index = pc.index(INDEX_NAME);

    // Load KUHAP Data
    const dataPath = path.join(__dirname, 'data_kuhap.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`Loaded ${Object.keys(data).length} articles from ${dataPath}`);

    const vectors = [];
    const batchSize = 10; // Process in small batches to avoid rate limits

    for (const [key, content] of Object.entries(data)) {
        console.log(`Processing ${key}...`);

        try {
            const { embedding } = await embed({
                model: google.textEmbeddingModel("text-embedding-004"),
                value: `${key}: ${content}`,
            });

            vectors.push({
                id: key,
                values: embedding,
                metadata: {
                    content: content,
                    type: 'kuhap'
                }
            });

            if (vectors.length >= batchSize) {
                console.log(`Upserting batch of ${vectors.length} vectors to namespace KUHAP...`);
                await index.namespace('KUHAP').upsert(vectors);
                vectors.length = 0; // Clear batch
            }
        } catch (error) {
            console.error(`Error processing ${key}:`, error);
        }
    }

    // Upsert remaining
    if (vectors.length > 0) {
        console.log(`Upserting remaining ${vectors.length} vectors to namespace KUHAP...`);
        await index.namespace('KUHAP').upsert(vectors);
    }

    console.log("Seeding complete!");
}

seed().catch(console.error);
