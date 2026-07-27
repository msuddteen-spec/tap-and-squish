import fs from 'node:fs';
import zlib from 'node:zlib';

const out = 'public/icons';
const crc32 = (data) => { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]); const result = Buffer.alloc(12 + data.length); result.writeUInt32BE(data.length, 0); body.copy(result, 4); result.writeUInt32BE(crc32(body), data.length + 8); return result; };
const png = (size) => {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + .5) / size, ny = (y + .5) / size;
    const rounded = Math.min(nx, 1 - nx, ny, 1 - ny) > .08;
    const background = [246, 228, 200];
    let color = background;
    const bread = (((nx - .5) / .34) ** 2 + ((ny - .54) / .29) ** 2 < 1) || (((nx - .38) / .16) ** 2 + ((ny - .41) / .16) ** 2 < 1) || (((nx - .62) / .16) ** 2 + ((ny - .41) / .16) ** 2 < 1);
    if (bread) color = [217, 154, 91];
    const face = ((nx - .42) ** 2 + (ny - .52) ** 2 < .00065) || ((nx - .58) ** 2 + (ny - .52) ** 2 < .00065);
    if (face) color = [122, 72, 45];
    const mouth = Math.abs((ny - .63) - 1.4 * Math.abs(nx - .5)) < .012 && Math.abs(nx - .5) < .12;
    if (mouth) color = [122, 72, 45];
    const index = (y * size + x) * 4; pixels[index] = rounded ? color[0] : 246; pixels[index + 1] = rounded ? color[1] : 228; pixels[index + 2] = rounded ? color[2] : 200; pixels[index + 3] = 255;
  }
  const header = Buffer.from([137,80,78,71,13,10,26,10]); const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = []; for (let y = 0; y < size; y++) rows.push(Buffer.concat([Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4)]));
  return Buffer.concat([header, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};
const files = [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-192.png', 192], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['favicon-16.png', 16]];
fs.mkdirSync(out, { recursive: true }); for (const [name, size] of files) fs.writeFileSync(`${out}/${name}`, png(size));
const favicon = fs.readFileSync(`${out}/favicon-32.png`); const ico = Buffer.alloc(22); ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico[6] = 32; ico[7] = 32; ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(favicon.length, 14); ico.writeUInt32LE(22, 18); fs.writeFileSync('public/favicon.ico', Buffer.concat([ico, favicon]));
