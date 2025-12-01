/**
 * Comprehensive Test Runner
 * Executes all test suites and generates report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateTestReport } = require('./generate-report');

const testResults = {
  timestamp: new Date().toISOString(),
  unit: {},
  integration: {},
  component: {},
  e2e: {},
  penetration: {}
};

function runTests(type, command) {
  console.log(`\n🧪 Running ${type} tests...\n`);
  
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ ${type} tests failed:`, error.message);
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Suite\n');
  console.log('=' .repeat(60));

  // Unit Tests
  const unitResult = runTests('Unit', 'npm run test:unit -- --json --outputFile=test-results/unit-results.json');
  testResults.unit = parseJestResults('test-results/unit-results.json');

  // Integration Tests
  const integrationResult = runTests('Integration', 'npm run test:integration -- --json --outputFile=test-results/integration-results.json');
  testResults.integration = parseJestResults('test-results/integration-results.json');

  // Component Tests
  const componentResult = runTests('Component', 'npm run test:component -- --json --outputFile=test-results/component-results.json');
  testResults.component = parseJestResults('test-results/component-results.json');

  // E2E Tests
  const e2eResult = runTests('E2E', 'npx playwright test --reporter=json --output-dir=test-results/e2e-results.json');
  testResults.e2e = parsePlaywrightResults('test-results/e2e-results.json');

  // Penetration Tests
  const penetrationResult = runTests('Penetration', 'node tests/penetration/runner.js');
  testResults.penetration = parsePenetrationResults('test-results/penetration-results.json');

  // Generate Report
  console.log('\n📝 Generating comprehensive test report...\n');
  await generateTestReport();

  // Print Summary
  printSummary();

  return testResults;
}

function parseJestResults(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      return {
        total: data.numTotalTests || 0,
        passed: data.numPassedTests || 0,
        failed: data.numFailedTests || 0,
        coverage: data.coverageMap ? calculateCoverage(data.coverageMap) : null,
        tests: data.testResults?.flatMap(r => r.assertionResults || []) || []
      };
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}`);
      return {};
    }
  }
  return {};
}

function parsePlaywrightResults(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      return {
        total: data.stats?.total || 0,
        passed: data.stats?.passed || 0,
        failed: data.stats?.failed || 0,
        tests: data.suites?.flatMap(s => s.specs || []) || []
      };
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}`);
      return {};
    }
  }
  return {};
}

function parsePenetrationResults(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      return {
        total: data.summary?.total || 0,
        passed: data.summary?.passed || 0,
        failed: data.summary?.failed || 0,
        tests: data.tests || []
      };
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}`);
      return {};
    }
  }
  return {};
}

function calculateCoverage(coverageMap) {
  // Simplified coverage calculation
  let total = 0;
  let covered = 0;
  
  Object.values(coverageMap).forEach(file => {
    if (file.statementMap) {
      total += Object.keys(file.statementMap).length;
      covered += Object.values(file.s).filter(count => count > 0).length;
    }
  });
  
  return total > 0 ? ((covered / total) * 100).toFixed(2) : 0;
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const types = ['unit', 'integration', 'component', 'e2e', 'penetration'];
  types.forEach(type => {
    const results = testResults[type];
    if (results.total > 0) {
      const passRate = ((results.passed / results.total) * 100).toFixed(1);
      console.log(`\n${type.toUpperCase()}:`);
      console.log(`  Total: ${results.total}`);
      console.log(`  Passed: ${results.passed} (${passRate}%)`);
      console.log(`  Failed: ${results.failed}`);
      if (results.coverage) {
        console.log(`  Coverage: ${results.coverage}%`);
      }
    }
  });
  
  const totalTests = types.reduce((sum, type) => sum + (testResults[type].total || 0), 0);
  const totalPassed = types.reduce((sum, type) => sum + (testResults[type].passed || 0), 0);
  const totalFailed = types.reduce((sum, type) => sum + (testResults[type].failed || 0), 0);
  const overallPassRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL: ${totalTests} tests | ${totalPassed} passed | ${totalFailed} failed | ${overallPassRate}% pass rate`);
  console.log('='.repeat(60));
  console.log('\n✅ Test report generated: test-results/comprehensive-test-report.docx\n');
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };

