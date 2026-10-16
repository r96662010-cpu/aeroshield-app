import fs from 'fs';
import zlib from 'zlib';

/**
 * Creates an uncompressed/deflated RGBA PNG image buffer in pure Node.js
 */
function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanline filter bytes
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw smooth emerald shield gradient with border
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const maxRadius = width * 0.45;

      if (dist < maxRadius) {
        // Emerald shield center
        const factor = 1 - (dist / maxRadius) * 0.4;
        rawData[pixelOffset] = Math.round(16 * factor);    // R
        rawData[pixelOffset + 1] = Math.round(185 * factor); // G (emerald-500)
        rawData[pixelOffset + 2] = Math.round(129 * factor); // B
        rawData[pixelOffset + 3] = a;
      } else if (dist < maxRadius + 4) {
        // Glowing outline
        rawData[pixelOffset] = 52;
        rawData[pixelOffset + 1] = 211;
        rawData[pixelOffset + 2] = 153;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Dark background
        rawData[pixelOffset] = 9;
        rawData[pixelOffset + 1] = 9;
        rawData[pixelOffset + 2] = 11;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = calculateCrc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

// Standard PNG CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCrc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// Generate PWA icons
fs.mkdirSync('./public', { recursive: true });

const icon192 = createPng(192, 192, 16, 185, 129);
fs.writeFileSync('./public/pwa-192x192.png', icon192);

const icon512 = createPng(512, 512, 16, 185, 129);
fs.writeFileSync('./public/pwa-512x512.png', icon512);

const iconMaskable = createPng(512, 512, 16, 185, 129);
fs.writeFileSync('./public/pwa-maskable-512x512.png', iconMaskable);

const appleIcon = createPng(180, 180, 16, 185, 129);
fs.writeFileSync('./public/apple-touch-icon.png', appleIcon);

const favicon = createPng(32, 32, 16, 185, 129);
fs.writeFileSync('./public/favicon.ico', favicon);

console.log('Successfully generated all PWA icons in ./public');
