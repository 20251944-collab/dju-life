'use strict';
// Generates logo192.png and logo512.png using only built-in Node modules (no npm).
// Design: navy (#1F3864) background, white rounded badge, navy "D" letter.

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY  = [31, 56, 100];
const WHITE = [255, 255, 255];

// ── PNG encoding (zlib + CRC32) ──────────────────────────────────────────────

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length);
  const c = Buffer.allocUnsafe(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, c]);
}

function encodePNG(pixels, size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      row[1 + x * 3]     = pixels[i];
      row[1 + x * 3 + 1] = pixels[i + 1];
      row[1 + x * 3 + 2] = pixels[i + 2];
    }
    rows.push(row);
  }
  const sig  = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Drawing primitives ───────────────────────────────────────────────────────

function makeCanvas(size, [r, g, b]) {
  const buf = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i++) { buf[i*3]=r; buf[i*3+1]=g; buf[i*3+2]=b; }
  return buf;
}

function setPixel(buf, size, x, y, [r, g, b]) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 3;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b;
}

function fillRect(buf, size, x1, y1, x2, y2, col) {
  for (let y = Math.max(0, y1); y <= Math.min(size-1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(size-1, x2); x++)
      setPixel(buf, size, x, y, col);
}

function fillDisc(buf, size, cx, cy, r, col) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx*dx + dy*dy <= r*r) setPixel(buf, size, cx+dx, cy+dy, col);
}

function fillRoundedRect(buf, size, x1, y1, x2, y2, r, col) {
  fillRect(buf, size, x1+r, y1,   x2-r, y2,   col);
  fillRect(buf, size, x1,   y1+r, x2,   y2-r, col);
  fillDisc(buf, size, x1+r, y1+r, r, col);
  fillDisc(buf, size, x2-r, y1+r, r, col);
  fillDisc(buf, size, x1+r, y2-r, r, col);
  fillDisc(buf, size, x2-r, y2-r, r, col);
}

// ── Icon design ──────────────────────────────────────────────────────────────

function drawIcon(size) {
  const s  = size;
  const px = makeCanvas(s, NAVY);

  // White rounded badge (15 % padding, 12 % corner radius)
  const pad = Math.round(s * 0.15);
  const cr  = Math.round(s * 0.12);
  const bx1 = pad, by1 = pad, bx2 = s - pad - 1, by2 = s - pad - 1;
  fillRoundedRect(px, s, bx1, by1, bx2, by2, cr, WHITE);

  // Navy "D" letter inside badge
  const bcx  = (bx1 + bx2) / 2;
  const bcy  = Math.round((by1 + by2) / 2);
  const bw   = bx2 - bx1;
  const bh   = by2 - by1;

  const lHalf = Math.round(bh * 0.40);        // letter half-height
  const barW  = Math.round(bw * 0.16);        // vertical bar width
  const barX  = Math.round(bcx - bw * 0.22);  // bar left edge

  // Left vertical bar of D
  fillRect(px, s, barX, bcy - lHalf, barX + barW - 1, bcy + lHalf, NAVY);

  // Right curved part: outer ellipse minus inner ellipse (semi-annulus)
  const ex = barX + barW;
  const oA = lHalf;
  const oB = Math.round(bw * 0.38);
  const iA = Math.round(lHalf * 0.62);
  const iB = Math.round(bw  * 0.22);

  for (let y = bcy - oA; y <= bcy + oA; y++) {
    for (let x = ex; x <= ex + oB + 1; x++) {
      const dy = (y - bcy) / oA, dx = (x - ex) / oB;
      const iy = (y - bcy) / iA, ix = (x - ex) / iB;
      if (dy*dy + dx*dx <= 1.0 && !(iy*iy + ix*ix <= 1.0)) {
        setPixel(px, s, x, y, NAVY);
      }
    }
  }

  return encodePNG(px, s);
}

// ── Write files ──────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '..', 'public');
[192, 512].forEach(size => {
  const buf  = drawIcon(size);
  const file = path.join(publicDir, `logo${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`Generated logo${size}.png  (${buf.length.toLocaleString()} bytes)`);
});
console.log('Done.');
