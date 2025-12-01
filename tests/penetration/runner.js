/**
 * Penetration Test Runner
 * Executes all penetration tests and generates report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

function runPenetrationTests() {
  console.log('🔒 Starting Penetration Tests...\n');

  const testFiles = [
    'security.test.js'
  ];

  testFiles.forEach(testFile => {
    const testPath = path.join(__dirname, testFile);
    
    if (fs.existsSync(testPath)) {
      console.log(`Running ${testFile}...`);
      
      try {
        // Run Jest tests
        const output = execSync(`npx jest ${testPath} --json`, {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '../../')
        });
        
        const results = JSON.parse(output);
        testResults.tests.push({
          file: testFile,
          status: 'completed',
          results: results
        });
        
        testResults.summary.total += results.numTotalTests || 0;
        testResults.summary.passed += results.numPassedTests || 0;
        testResults.summary.failed += results.numFailedTests || 0;
        
        console.log(`✅ ${testFile} completed`);
      } catch (error) {
        console.error(`❌ ${testFile} failed:`, error.message);
        testResults.tests.push({
          file: testFile,
          status: 'failed',
          error: error.message
        });
        testResults.summary.failed++;
      }
    }
  });

  return testResults;
}

// Run tests
const results = runPenetrationTests();

// Save results
const resultsPath = path.join(__dirname, '../../test-results/penetration-results.json');
fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

console.log('\n📊 Penetration Test Summary:');
console.log(`Total Tests: ${results.summary.total}`);
console.log(`Passed: ${results.summary.passed}`);
console.log(`Failed: ${results.summary.failed}`);
console.log(`\nResults saved to: ${resultsPath}`);

module.exports = results;

