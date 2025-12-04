const fs = require('fs');
const path = require('path');
const MiniSearch = require('minisearch');

async function generateIndex(type) {
    console.log(`\n--- Generating Index for ${type.toUpperCase()} ---`);
    const DATA_FILE = path.join(__dirname, `data_${type}.json`);
    const PENJELASAN_FILE = path.join(__dirname, `penjelasan_${type}.json`);
    const INDEX_OUTPUT_FILE = path.join(__dirname, `${type}-index.json`);

    if (!fs.existsSync(DATA_FILE) || !fs.existsSync(PENJELASAN_FILE)) {
        console.error(`❌ Data files for ${type} not found.`);
        return;
    }

    console.log('Reading data files...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const penjelasanData = JSON.parse(fs.readFileSync(PENJELASAN_FILE, 'utf-8'));

    const documents = [];

    for (const [pasal, content] of Object.entries(data)) {
        const penjelasan = penjelasanData[pasal] || '';
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
        fields: ['pasal', 'content', 'penjelasan', 'full_text'],
        storeFields: ['pasal', 'content', 'penjelasan'],
        searchOptions: {
            boost: { pasal: 2, content: 1.5 },
            fuzzy: 0.2
        }
    });

    miniSearch.addAll(documents);

    console.log('Writing index to file...');
    const jsonIndex = JSON.stringify(miniSearch.toJSON());
    fs.writeFileSync(INDEX_OUTPUT_FILE, jsonIndex);

    console.log(`✅ Index generated successfully at ${INDEX_OUTPUT_FILE}`);
}

async function main() {
    await generateIndex('kuhp');
    await generateIndex('kuhap');
}

main().catch(console.error);
