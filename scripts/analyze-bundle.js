/**
 * Bundle Size Analysis Script
 * Analyzes the production bundle to identify large dependencies
 * 
 * Usage: node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBuildFolder(buildPath) {
  const stats = {
    totalSize: 0,
    files: [],
    chunks: []
  };

  function analyzeDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        analyzeDirectory(fullPath, relativeItemPath);
      } else if (stat.isFile()) {
        const size = stat.size;
        stats.totalSize += size;

        const fileInfo = {
          path: relativeItemPath,
          size: size,
          formattedSize: formatBytes(size)
        };

        if (item.endsWith('.js')) {
          stats.chunks.push(fileInfo);
        } else {
          stats.files.push(fileInfo);
        }
      }
    });
  }

  if (fs.existsSync(buildPath)) {
    analyzeDirectory(buildPath);
  } else {
    console.warn(`Build folder not found: ${buildPath}`);
    console.log('Please run "npm run build" first to generate the build folder.');
    return null;
  }

  return stats;
}

function generateReport(stats) {
  if (!stats) return;

  console.log('\n📦 Bundle Size Analysis Report\n');
  console.log('=' .repeat(60));
  console.log(`Total Build Size: ${formatBytes(stats.totalSize)}\n`);

  // Sort chunks by size
  const sortedChunks = stats.chunks.sort((a, b) => b.size - a.size);

  console.log('📄 JavaScript Chunks (sorted by size):');
  console.log('-'.repeat(60));
  sortedChunks.forEach((chunk, index) => {
    const percentage = ((chunk.size / stats.totalSize) * 100).toFixed(2);
    console.log(`${(index + 1).toString().padStart(2)}. ${chunk.path.padEnd(40)} ${chunk.formattedSize.padStart(10)} (${percentage}%)`);
  });

  console.log('\n📁 Other Files:');
  console.log('-'.repeat(60));
  stats.files.forEach((file, index) => {
    const percentage = ((file.size / stats.totalSize) * 100).toFixed(2);
    console.log(`${(index + 1).toString().padStart(2)}. ${file.path.padEnd(40)} ${file.formattedSize.padStart(10)} (${percentage}%)`);
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('-'.repeat(60));
  
  const largeChunks = sortedChunks.filter(chunk => chunk.size > 500 * 1024); // > 500KB
  if (largeChunks.length > 0) {
    console.log('⚠️  Large chunks detected (>500KB):');
    largeChunks.forEach(chunk => {
      console.log(`   - ${chunk.path}: ${chunk.formattedSize}`);
      console.log(`     Consider code splitting or lazy loading`);
    });
  }

  const totalJS = stats.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  if (totalJS > 2 * 1024 * 1024) { // > 2MB
    console.log(`\n⚠️  Total JavaScript size is ${formatBytes(totalJS)} (>2MB)`);
    console.log('   Consider:');
    console.log('   - Enabling gzip/brotli compression');
    console.log('   - Implementing code splitting');
    console.log('   - Reviewing large dependencies');
  }

  console.log('\n' + '='.repeat(60));
}

// Main execution
const buildPath = path.join(__dirname, '..', 'build');

console.log('🔍 Analyzing bundle size...');
console.log(`📂 Build folder: ${buildPath}\n`);

const stats = analyzeBuildFolder(buildPath);
generateReport(stats);

// Export for use in other scripts
if (require.main === module) {
  process.exit(0);
}

module.exports = { analyzeBuildFolder, formatBytes };

