const BASE_URL = 'http://localhost:3000';

const kuhpTests = [
    { query: "Apa isi Pasal 362?", type: "Direct Single", description: "Should return Pasal 362 content" },
    { query: "Jelaskan Pasal 338 dan 340", type: "Direct Multiple", description: "Should return Pasal 338 and 340" },
    { query: "Hukuman untuk pencuri ayam", type: "Semantic", description: "Should find theft related articles" },
    { query: "Tindak pidana korupsi", type: "Semantic", description: "Should find corruption related articles" },
    { query: "Makar dengan maksud membunuh presiden", type: "Exact Keyword", description: "Should find treason articles" },
    { query: "Apa itu asas legalitas?", type: "Concept", description: "Should explain legality principle (Pasal 1)" },
    { query: "Resep nasi goreng", type: "Irrelevant", description: "Should return irrelevant flag/message" },
    { query: "Pasal 1", type: "Direct Single", description: "Should return Pasal 1" },
    { query: "Penggelapan dalam jabatan", type: "Semantic Specific", description: "Should find embezzlement in office" },
    { query: "Bedanya pasal 372 dan 378", type: "Mixed/Comparison", description: "Should return both articles for comparison" }
];

const kuhapTests = [
    { query: "Isi Pasal 1", type: "Direct Single", description: "Should return definitions in Pasal 1" },
    { query: "Pasal 16 dan 17", type: "Direct Multiple", description: "Should return arrest related articles" },
    { query: "Syarat sah penangkapan", type: "Semantic", description: "Should find arrest requirements" },
    { query: "Berapa lama masa penahanan?", type: "Semantic", description: "Should find detention duration articles" },
    { query: "Praduga tak bersalah", type: "Exact Keyword", description: "Should find presumption of innocence" },
    { query: "Apa tugas jaksa penuntut umum?", type: "Concept", description: "Should find prosecutor duties" },
    { query: "Cara memperbaiki motor", type: "Irrelevant", description: "Should return irrelevant message" },
    { query: "Pasal 77", type: "Direct Single", description: "Should return Pretrial (Prapenuntutan) article" },
    { query: "Ganti kerugian salah tangkap", type: "Semantic", description: "Should find compensation articles" },
    { query: "Prosedur penggeledahan rumah", type: "Semantic", description: "Should find house search procedures" }
];

async function runTest(endpoint, testCases) {
    console.log(`\n\n==================================================`);
    console.log(`       TESTING API ENDPOINT: /api/${endpoint}`);
    console.log(`==================================================`);

    let passed = 0;
    let failed = 0;

    for (const [index, test] of testCases.entries()) {
        console.log(`\nTest #${index + 1}: [${test.type}]`);
        console.log(`Query: "${test.query}"`);
        console.log(`Expectation: ${test.description}`);

        try {
            const start = Date.now();
            const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: test.query }],
                    type: 'public'
                })
            });
            const duration = Date.now() - start;

            if (!response.ok) {
                console.log(`❌ FAILED: HTTP ${response.status} ${response.statusText}`);
                failed++;
                continue;
            }

            const data = await response.json();

            // Basic validation
            const hasArticles = data.articles && data.articles.length > 0;
            const hasSummary = data.summary && data.summary.length > 0;

            if (hasSummary) {
                console.log(`✅ PASSED (${duration}ms)`);
                console.log(`   Articles Found: ${data.articles?.map(a => a.id).join(', ') || 'None'}`);
                console.log(`   Summary Snippet: ${data.summary.substring(0, 80).replace(/\n/g, ' ')}...`);
                passed++;
            } else {
                console.log(`⚠️ WARNING: No summary returned.`);
                failed++;
            }

        } catch (error) {
            console.log(`❌ ERROR: Connection Failed. Is the server running at ${BASE_URL}?`);
            console.log(`   Details: ${error.message}`);
            return; // Stop testing this endpoint if connection fails
        }
    }

    console.log(`\n--- ${endpoint.toUpperCase()} Results: ${passed} Passed, ${failed} Failed ---`);
}

async function main() {
    console.log("Starting API Tests...");
    console.log("Ensure your Next.js server is running on http://localhost:3000");

    await runTest('kuhp', kuhpTests);
    await runTest('kuhap', kuhapTests);
}

main();
