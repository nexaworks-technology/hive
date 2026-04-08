import { enrichFromHunter, enrichDefault } from './utils/hunter-enricher.js';

console.log('\n🎯 ENRICHMENT SYSTEM TEST\n');

// Test 1: Hunter Enrichment
console.log('='.repeat(60));
console.log('1️⃣  HUNTER ENRICHMENT (Primary)');
console.log('='.repeat(60));
console.log('Input: Position "VP Engineering" at domain "techcorp.com"\n');

const hunterResult = await enrichFromHunter('john@techcorp.com', 'techcorp.com', {
  position: 'VP Engineering',
  company: 'techcorp.com'
});

console.log('Output (enrichedData object):');
console.log(JSON.stringify(hunterResult, null, 2));
console.log('');

// Test 2: Default Enrichment  
console.log('='.repeat(60));
console.log('2️⃣  DEFAULT ENRICHMENT (Fallback)');
console.log('=' .repeat(60));
console.log('Input: "Jane Smith", role "Senior Developer", company "StartupXYZ"\n');

const defaultResult = await enrichDefault('Jane Smith', 'Senior Developer', 'StartupXYZ');

console.log('Output (enrichedData object):');
console.log(JSON.stringify(defaultResult, null, 2));
console.log('');

// Test 3: Show email token replacement
console.log('='.repeat(60));
console.log('3️⃣  EMAIL TOKEN REPLACEMENT');
console.log('=' .repeat(60));
console.log('\nBefore enrichment:');
console.log('  Subject: {{prospectName}}, quick thought');
console.log('  Body: Noticed {{prospectAchievement}}\n');

console.log('After enrichment:');
if (hunterResult) {
  console.log('  Subject: John, quick thought');
  console.log(`  Body: Noticed ${hunterResult.prospectAchievement}`);
  console.log(`  Headline: ${hunterResult.prospectHeadline}`);
  console.log(`  Source: ${hunterResult.source}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ TEST COMPLETE');
console.log('=' .repeat(60) + '\n');
