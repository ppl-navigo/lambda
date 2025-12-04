const MiniSearch = require('minisearch');
const fs = require('fs');
const path = require('path');

const INDEX_FILE_PATH = path.join(__dirname, 'scripts', 'kuhp-index.json');

const loadIndex = () => {
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
        console.log('[SearchService] Index loaded successfully.');
        return miniSearch;
    } catch (error) {
        console.error('[SearchService] Failed to load index:', error);
        return null;
    }
};

const search = (query, limit = 10) => {
    const ms = loadIndex();
    if (!ms) return [];

    const results = ms.search(query, { fuzzy: 0.2, prefix: true });

    return results.slice(0, limit).map(r => ({
        id: r.id,
        score: r.score,
        content: r.content,
        penjelasan: r.penjelasan
    }));
};

const searchExact = (query, limit = 100) => {
    const ms = loadIndex();
    if (!ms) return [];

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

console.log('Testing Search Service (JS)...');

console.log('\n--- Test 1: General Search (pencurian) ---');
const results1 = search('pencurian');
console.log(`Found ${results1.length} results.`);
if (results1.length > 0) {
    console.log('Top result:', results1[0].id, results1[0].content.substring(0, 50) + '...');
}

console.log('\n--- Test 2: Exact Search (Pasal 362) ---');
const results2 = searchExact('Pasal 362');
console.log(`Found ${results2.length} results.`);
if (results2.length > 0) {
    console.log('Top result:', results2[0].id, results2[0].content.substring(0, 50) + '...');
}
