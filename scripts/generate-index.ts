import fs from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';

const KUHP_FILE = path.join(__dirname, 'data_kuhp.json');
const PENJELASAN_FILE = path.join(__dirname, 'penjelasan_kuhp.json');
const INDEX_OUTPUT_FILE = path.join(__dirname, 'kuhp-index.json');

async function generateIndex() {
    console.log('Reading data files...');
    const kuhpData = JSON.parse(fs.readFileSync(KUHP_FILE, 'utf-8'));
    const penjelasanData = JSON.parse(fs.readFileSync(PENJELASAN_FILE, 'utf-8'));

    const documents = [];

    for (const [pasal, content] of Object.entries(kuhpData)) {
        const penjelasan = penjelasanData[pasal] || '';
        // Combine content and explanation for better searchability
        // We keep them separate in the stored fields for display
        documents.push({
            id: pasal,
            pasal: pasal,
            content: content,
            penjelasan: penjelasan,
            full_text: `${pasal} ${content} ${penjelasan}`
        });
    }

    console.log(`Prepared ${documents.length} documents.`);

    console.log('Creating MiniSearch index...');
    const miniSearch = new MiniSearch({
        fields: ['pasal', 'content', 'penjelasan', 'full_text'], // Fields to index for full-text search
        storeFields: ['pasal', 'content', 'penjelasan'], // Fields to return with search results
        searchOptions: {
            boost: { pasal: 2, content: 1.5 }, // Boost matches in 'pasal' and 'content'
            fuzzy: 0.2
        }
    });

    miniSearch.addAll(documents);

    console.log('Writing index to file...');
    const jsonIndex = JSON.stringify(miniSearch.toJSON());
    fs.writeFileSync(INDEX_OUTPUT_FILE, jsonIndex);

    console.log(`✅ Index generated successfully at ${INDEX_OUTPUT_FILE}`);
}

generateIndex().catch(console.error);
