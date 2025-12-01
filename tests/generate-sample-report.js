/**
 * Generate Sample Test Report
 * Creates a sample DOCX report for demonstration purposes
 */

const { generateTestReport } = require('./generate-report');
const fs = require('fs');
const path = require('path');

// Create sample test results
const sampleResults = {
  unit: {
    total: 25,
    passed: 23,
    failed: 2,
    coverage: 85.5,
    tests: [
      { name: 'encryptionService.encrypt', status: 'passed', duration: 45 },
      { name: 'encryptionService.decrypt', status: 'passed', duration: 38 },
      { name: 'encryptionService.hashPassword', status: 'passed', duration: 52 },
      { name: 'errorHandler.handleError', status: 'passed', duration: 30 },
      { name: 'logger.info', status: 'passed', duration: 15 }
    ]
  },
  integration: {
    total: 18,
    passed: 17,
    failed: 1,
    tests: [
      { name: 'authAPI.register', status: 'passed', duration: 120 },
      { name: 'authAPI.login', status: 'passed', duration: 95 },
      { name: 'patientsAPI.createClient', status: 'passed', duration: 150 },
      { name: 'patientsAPI.searchPatients', status: 'failed', duration: 200 }
    ]
  },
  component: {
    total: 15,
    passed: 15,
    failed: 0,
    tests: [
      { name: 'CreatePatientModal renders', status: 'passed', duration: 80 },
      { name: 'CreatePatientModal form validation', status: 'passed', duration: 120 }
    ]
  },
  e2e: {
    total: 12,
    passed: 11,
    failed: 1,
    tests: [
      { name: 'User registration flow', status: 'passed', duration: 2500 },
      { name: 'User login flow', status: 'passed', duration: 1800 },
      { name: 'Patient creation workflow', status: 'failed', duration: 5000 }
    ]
  },
  penetration: {
    total: 30,
    passed: 28,
    failed: 2,
    tests: [
      { vulnerability: 'SQL Injection', status: 'protected', severity: 'high' },
      { vulnerability: 'XSS', status: 'protected', severity: 'high' },
      { vulnerability: 'CSRF', status: 'protected', severity: 'medium' },
      { vulnerability: 'Authentication Bypass', status: 'vulnerable', severity: 'critical' }
    ]
  }
};

// Save sample results
function createSampleResults() {
  const resultsDir = path.join(__dirname, '..', 'test-results');
  fs.mkdirSync(resultsDir, { recursive: true });

  // Create sample JSON files
  fs.writeFileSync(
    path.join(resultsDir, 'unit-results.json'),
    JSON.stringify({
      numTotalTests: sampleResults.unit.total,
      numPassedTests: sampleResults.unit.passed,
      numFailedTests: sampleResults.unit.failed,
      testResults: sampleResults.unit.tests.map(t => ({
        name: t.name,
        status: t.status,
        assertionResults: [{
          title: t.name,
          status: t.status,
          duration: t.duration
        }]
      }))
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(resultsDir, 'integration-results.json'),
    JSON.stringify({
      numTotalTests: sampleResults.integration.total,
      numPassedTests: sampleResults.integration.passed,
      numFailedTests: sampleResults.integration.failed,
      testResults: sampleResults.integration.tests.map(t => ({
        name: t.name,
        status: t.status,
        assertionResults: [{
          title: t.name,
          status: t.status,
          duration: t.duration
        }]
      }))
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(resultsDir, 'component-results.json'),
    JSON.stringify({
      numTotalTests: sampleResults.component.total,
      numPassedTests: sampleResults.component.passed,
      numFailedTests: sampleResults.component.failed,
      testResults: sampleResults.component.tests.map(t => ({
        name: t.name,
        status: t.status,
        assertionResults: [{
          title: t.name,
          status: t.status,
          duration: t.duration
        }]
      }))
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(resultsDir, 'e2e-results.json'),
    JSON.stringify({
      stats: {
        total: sampleResults.e2e.total,
        passed: sampleResults.e2e.passed,
        failed: sampleResults.e2e.failed
      },
      suites: [{
        specs: sampleResults.e2e.tests.map(t => ({
          title: t.name,
          tests: [{
            results: [{
              status: t.status,
              duration: t.duration
            }]
          }]
        }))
      }]
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(resultsDir, 'penetration-results.json'),
    JSON.stringify({
      summary: {
        total: sampleResults.penetration.total,
        passed: sampleResults.penetration.passed,
        failed: sampleResults.penetration.failed
      },
      tests: sampleResults.penetration.tests
    }, null, 2)
  );

  console.log('✅ Sample test results created');
}

// Generate report
async function generateSampleReport() {
  console.log('📝 Generating sample test report...\n');
  
  createSampleResults();
  await generateTestReport();
  
  console.log('\n✅ Sample test report generated successfully!');
  console.log('📄 Report location: test-results/comprehensive-test-report.docx');
}

// Run if called directly
if (require.main === module) {
  generateSampleReport().catch(console.error);
}

module.exports = { generateSampleReport, createSampleResults };

