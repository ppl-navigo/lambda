import { search, searchExact } from './app/lib/search-service';

console.log('Testing Search Service...');

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
