const fs = require('fs');
const path = require('path');

// Create a simple valid PNG (1x1 blue pixel) then scale for different sizes
// This is a minimal valid PNG file (1x1 blue pixel #3B82F6 - ElderX theme color)
const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const bluePNG = Buffer.from(base64PNG, 'base64');

// Function to create a solid color PNG of any size
function createSolidColorPNG(width, height, color = { r: 59, g: 130, b: 246 }) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(2, 17); // Color type (RGB)
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace
  
  // Simple CRC calculation
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = crc ^ buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdr.slice(4, 21)), 0);
  
  // IDAT chunk (image data) - create simple uncompressed data
  // For simplicity, create a small colored square
  const pixelData = Buffer.alloc(height * (1 + width * 3)); // Filter byte + RGB for each pixel
  for (let y = 0; y < height; y++) {
    pixelData[y * (1 + width * 3)] = 0; // Filter method: None
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      pixelData[offset] = color.r;
      pixelData[offset + 1] = color.g;
      pixelData[offset + 2] = color.b;
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(pixelData, { level: 9 });
  
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idat.slice(4, 8 + compressed.length)), 0);
  
  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  
  return Buffer.concat([
    signature,
    ihdr,
    ihdrCrc,
    idat.slice(0, 8 + compressed.length),
    idatCrc,
    iend
  ]);
}

// Create icons directory
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('📁 Created icons directory');
}

// Generate icons with ElderX brand color
const elderxBlue = { r: 59, g: 130, b: 246 };

try {
  fs.writeFileSync(path.join(iconsDir, 'icon-16x16.png'), createSolidColorPNG(16, 16, elderxBlue));
  console.log('✅ Created icon-16x16.png');
  
  fs.writeFileSync(path.join(iconsDir, 'icon-32x32.png'), createSolidColorPNG(32, 32, elderxBlue));
  console.log('✅ Created icon-32x32.png');
  
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createSolidColorPNG(192, 192, elderxBlue));
  console.log('✅ Created icon-192x192.png');
  
  // Also create a 512x512 for better PWA support
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createSolidColorPNG(512, 512, elderxBlue));
  console.log('✅ Created icon-512x512.png');
  
  console.log('🎉 All icons created successfully with ElderX brand color!');
} catch (error) {
  console.error('❌ Error creating icons:', error);
  process.exit(1);
}

