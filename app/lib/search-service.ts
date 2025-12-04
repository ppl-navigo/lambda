import MiniSearch from 'minisearch';
import fs from 'fs';
import path from 'path';

// Cache for multiple indices
const indices: Record<string, MiniSearch | null> = {};

export const loadIndex = (type: 'kuhp' | 'kuhap') => {
    if (indices[type]) return indices[type];

    const INDEX_FILE_PATH = path.join(process.cwd(), 'scripts', `${type}-index.json`);

    try {
        console.log(`[SearchService] Loading index from ${INDEX_FILE_PATH}...`);
        if (!fs.existsSync(INDEX_FILE_PATH)) {
            console.error(`[SearchService] Index file not found at ${INDEX_FILE_PATH}`);
            return null;
        }

        const jsonIndex = fs.readFileSync(INDEX_FILE_PATH, 'utf-8');
        const miniSearch = MiniSearch.loadJSON(jsonIndex, {
            fields: ['pasal', 'content', 'penjelasan', 'full_text'],
            storeFields: ['pasal', 'content', 'penjelasan'],
            searchOptions: {
                boost: { pasal: 2, content: 1.5 },
                fuzzy: 0.2
            }
        });
        console.log(`[SearchService] Index for ${type} loaded successfully.`);
        indices[type] = miniSearch;
        return miniSearch;
    } catch (error) {
        console.error(`[SearchService] Failed to load index for ${type}:`, error);
        return null;
    }
};

export interface SearchResult {
    id: string;
    score: number;
    content: string;
    penjelasan?: string;
}

export const search = (query: string, type: 'kuhp' | 'kuhap', limit: number = 10): SearchResult[] => {
    const ms = loadIndex(type);
    if (!ms) return [];

    // Standard search (fuzzy, boosted)
    const results = ms.search(query, { fuzzy: 0.2, prefix: true });

    return results.slice(0, limit).map(r => ({
        id: r.id,
        score: r.score,
        content: r.content,
        penjelasan: r.penjelasan
    }));
};

export const searchExact = (query: string, type: 'kuhp' | 'kuhap', limit: number = 100): SearchResult[] => {
    const ms = loadIndex(type);
    if (!ms) return [];

    // Exact match search
    const results = ms.search(query, {
        fuzzy: false,
        combineWith: 'AND',
        boost: { content: 2 }
    });

    return results.slice(0, limit).map(r => ({
        id: r.id,
        score: r.score,
        content: r.content,
        penjelasan: r.penjelasan
    }));
};
