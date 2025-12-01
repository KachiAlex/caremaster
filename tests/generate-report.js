/**
 * Test Report Generator
 * Generates comprehensive DOCX report from all test results
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs');
const path = require('path');

async function generateTestReport() {
  console.log('📝 Generating Comprehensive Test Report...\n');

  // Load test results
  const unitTestResults = loadTestResults('test-results/unit-results.json');
  const integrationTestResults = loadTestResults('test-results/integration-results.json');
  const componentTestResults = loadTestResults('test-results/component-results.json');
  const e2eTestResults = loadTestResults('test-results/e2e-results.json');
  const penetrationTestResults = loadTestResults('test-results/penetration-results.json');

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'Comprehensive Test Report',
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 }
          }),

          // Executive Summary
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleString()}\n\n`,
                bold: true
              }),
              new TextRun({
                text: `This comprehensive test report covers unit tests, integration tests, component tests, end-to-end tests, and penetration tests for the ElderX healthcare management platform.`
              })
            ],
            spacing: { after: 200 }
          }),

          // Test Summary Table
          new Paragraph({
            text: 'Test Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          createSummaryTable([
            ['Test Type', 'Total Tests', 'Passed', 'Failed', 'Coverage'],
            ['Unit Tests', unitTestResults.total || 0, unitTestResults.passed || 0, unitTestResults.failed || 0, unitTestResults.coverage || 'N/A'],
            ['Integration Tests', integrationTestResults.total || 0, integrationTestResults.passed || 0, integrationTestResults.failed || 0, 'N/A'],
            ['Component Tests', componentTestResults.total || 0, componentTestResults.passed || 0, componentTestResults.failed || 0, 'N/A'],
            ['E2E Tests', e2eTestResults.total || 0, e2eTestResults.passed || 0, e2eTestResults.failed || 0, 'N/A'],
            ['Penetration Tests', penetrationTestResults.total || 0, penetrationTestResults.passed || 0, penetrationTestResults.failed || 0, 'N/A']
          ]),

          // Unit Tests Section
          new Paragraph({
            text: 'Unit Tests',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: unitTestResults.summary || 'Unit tests verify individual functions and utilities in isolation.',
            spacing: { after: 200 }
          }),
          createTestDetailsTable(unitTestResults.tests || []),

          // Integration Tests Section
          new Paragraph({
            text: 'Integration Tests',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: integrationTestResults.summary || 'Integration tests verify API endpoints and database interactions.',
            spacing: { after: 200 }
          }),
          createTestDetailsTable(integrationTestResults.tests || []),

          // Component Tests Section
          new Paragraph({
            text: 'Component Tests',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: componentTestResults.summary || 'Component tests verify React component rendering and user interactions.',
            spacing: { after: 200 }
          }),
          createTestDetailsTable(componentTestResults.tests || []),

          // E2E Tests Section
          new Paragraph({
            text: 'End-to-End Tests',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: e2eTestResults.summary || 'E2E tests verify complete user workflows across the application.',
            spacing: { after: 200 }
          }),
          createTestDetailsTable(e2eTestResults.tests || []),

          // Penetration Tests Section
          new Paragraph({
            text: 'Penetration Tests',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: penetrationTestResults.summary || 'Penetration tests verify security vulnerabilities and attack vectors.',
            spacing: { after: 200 }
          }),
          createSecurityTestTable(penetrationTestResults.tests || []),

          // Recommendations
          new Paragraph({
            text: 'Recommendations',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: generateRecommendations(unitTestResults, integrationTestResults, componentTestResults, e2eTestResults, penetrationTestResults)
              })
            ],
            spacing: { after: 200 }
          }),

          // Conclusion
          new Paragraph({
            text: 'Conclusion',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: generateConclusion(unitTestResults, integrationTestResults, componentTestResults, e2eTestResults, penetrationTestResults)
              })
            ],
            spacing: { after: 200 }
          })
        ]
      }
    ]
  });

  // Generate and save document
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../test-results/comprehensive-test-report.docx');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Test report generated: ${outputPath}`);
  return outputPath;
}

function loadTestResults(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      // Handle different result formats
      if (data.numTotalTests !== undefined) {
        // Jest format
        return {
          total: data.numTotalTests || 0,
          passed: data.numPassedTests || 0,
          failed: data.numFailedTests || 0,
          coverage: data.coverageMap ? calculateCoverage(data.coverageMap) : null,
          tests: data.testResults?.flatMap(r => r.assertionResults || []) || []
        };
      } else if (data.stats) {
        // Playwright format
        return {
          total: data.stats?.total || 0,
          passed: data.stats?.passed || 0,
          failed: data.stats?.failed || 0,
          tests: data.suites?.flatMap(s => s.specs || []) || []
        };
      } else if (data.summary) {
        // Custom format
        return {
          total: data.summary?.total || 0,
          passed: data.summary?.passed || 0,
          failed: data.summary?.failed || 0,
          tests: data.tests || []
        };
      }
      return data;
    } catch (error) {
      console.warn(`Warning: Could not load ${filePath}:`, error.message);
      return {};
    }
  }
  // Return default structure if file doesn't exist
  return {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
}

function createSummaryTable(data) {
  const rows = data.map((row, index) => {
    const cells = row.map(cell => 
      new TableCell({
        children: [new Paragraph(cell.toString())],
        width: { size: 20, type: WidthType.PERCENTAGE }
      })
    );
    return new TableRow({ children: cells });
  });

  return new Table({
    rows: rows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function createTestDetailsTable(tests) {
  if (tests.length === 0) {
    return new Paragraph({ text: 'No test results available.' });
  }

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Test Name')] }),
        new TableCell({ children: [new Paragraph('Status')] }),
        new TableCell({ children: [new Paragraph('Duration')] })
      ]
    })
  ];

  tests.forEach(test => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(test.name || 'Unknown')] }),
          new TableCell({ children: [new Paragraph(test.status || 'Unknown')] }),
          new TableCell({ children: [new Paragraph((test.duration || 0) + 'ms')] })
        ]
      })
    );
  });

  return new Table({ rows: rows });
}

function createSecurityTestTable(tests) {
  if (tests.length === 0) {
    return new Paragraph({ text: 'No penetration test results available.' });
  }

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Vulnerability')] }),
        new TableCell({ children: [new Paragraph('Status')] }),
        new TableCell({ children: [new Paragraph('Severity')] })
      ]
    })
  ];

  tests.forEach(test => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(test.vulnerability || 'Unknown')] }),
          new TableCell({ children: [new Paragraph(test.status || 'Unknown')] }),
          new TableCell({ children: [new Paragraph(test.severity || 'N/A')] })
        ]
      })
    );
  });

  return new Table({ rows: rows });
}

function generateRecommendations(...testResults) {
  const recommendations = [];
  
  testResults.forEach((results, index) => {
    const testTypes = ['Unit', 'Integration', 'Component', 'E2E', 'Penetration'];
    if (results.failed > 0) {
      recommendations.push(`- ${testTypes[index]} tests: ${results.failed} test(s) failed. Review and fix failing tests.`);
    }
    if (results.coverage && results.coverage < 80) {
      recommendations.push(`- ${testTypes[index]} tests: Coverage is ${results.coverage}%. Aim for at least 80% coverage.`);
    }
  });

  if (recommendations.length === 0) {
    return 'All tests are passing. Continue maintaining test coverage and adding tests for new features.';
  }

  return recommendations.join('\n');
}

function generateConclusion(...testResults) {
  const total = testResults.reduce((sum, r) => sum + (r.total || 0), 0);
  const passed = testResults.reduce((sum, r) => sum + (r.passed || 0), 0);
  const failed = testResults.reduce((sum, r) => sum + (r.failed || 0), 0);
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

  return `The comprehensive test suite executed ${total} tests with a pass rate of ${passRate}%. ${passed} tests passed and ${failed} tests failed. The application demonstrates ${passRate >= 90 ? 'excellent' : passRate >= 70 ? 'good' : 'acceptable'} test coverage and quality.`;
}

// Run report generation
if (require.main === module) {
  generateTestReport().catch(console.error);
}

module.exports = { generateTestReport };

