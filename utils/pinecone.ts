import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
    apiKey: "pcsk_6HxVW5_6SKbgf6f76Z9KwEPov2BsDv3pxH4Kbv6gz5MUb8taXvggEDkwLnx1nz7BPJQdoU",
    maxRetries: 5,
});

export const index = pc.index("kuhp-demo-gemini")

