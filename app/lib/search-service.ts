import MiniSearch from 'minisearch';
import fs from 'fs';
import path from 'path';

let miniSearch: MiniSearch | null = null;

const INDEX_FILE_PATH = path.join(process.cwd(), 'scripts', 'kuhp-index.json');

export const loadIndex = () => {
    if (miniSearch) return miniSearch;

    try {
        console.log(`[SearchService] Loading index from ${INDEX_FILE_PATH}...`);
        if (!fs.existsSync(INDEX_FILE_PATH)) {
            console.error(`[SearchService] Index file not found at ${INDEX_FILE_PATH}`);
            return null;
        }

        const jsonIndex = fs.readFileSync(INDEX_FILE_PATH, 'utf-8');
        miniSearch = MiniSearch.loadJSON(jsonIndex, {
            fields: ['pasal', 'content', 'penjelasan', 'full_text'],
            storeFields: ['pasal', 'content', 'penjelasan'],
            searchOptions: {
                boost: { pasal: 2, content: 1.5 },
                fuzzy: 0.2
            }
        });
        console.log('[SearchService] Index loaded successfully.');
        return miniSearch;
    } catch (error) {
        console.error('[SearchService] Failed to load index:', error);
        return null;
    }
};

export interface SearchResult {
    id: string;
    score: number;
    content: string;
    penjelasan?: string;
}

export const search = (query: string, limit: number = 10): SearchResult[] => {
    const ms = loadIndex();
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

export const searchExact = (query: string, limit: number = 100): SearchResult[] => {
    const ms = loadIndex();
    if (!ms) return [];

    // Exact match search (no fuzziness, must match phrase if possible, but minisearch is token-based)
    // For "exact phrase" in minisearch, it's a bit different than ES.
    // We can use the 'combineWith: AND' to ensure all terms are present.
    // Or we can just rely on high scoring for exact matches.
    // A true "phrase" search isn't natively supported in the same way as ES 'match_phrase',
    // but we can approximate it or filter post-search if needed.
    // For now, we'll use a stricter search configuration.

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
