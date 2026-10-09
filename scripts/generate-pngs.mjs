import fs from 'fs';
import zlib from 'zlib';

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function chunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(crcData), 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per sample
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = chunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0; // Filter: None
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(scanlines, rowOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = chunk('IDAT', idatData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

class Canvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.buf = Buffer.alloc(w * h * 4);
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || a <= 0) return;
    const idx = (y * this.width + x) * 4;
    if (a >= 255) {
      this.buf[idx] = r;
      this.buf[idx + 1] = g;
      this.buf[idx + 2] = b;
      this.buf[idx + 3] = 255;
    } else {
      const srcA = a / 255;
      const dstA = this.buf[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA > 0) {
        this.buf[idx] = Math.round((r * srcA + this.buf[idx] * dstA * (1 - srcA)) / outA);
        this.buf[idx + 1] = Math.round((g * srcA + this.buf[idx + 1] * dstA * (1 - srcA)) / outA);
        this.buf[idx + 2] = Math.round((b * srcA + this.buf[idx + 2] * dstA * (1 - srcA)) / outA);
        this.buf[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  fillGradientRect(x1, y1, w, h, col1, col2, radius = 0) {
    for (let y = y1; y < y1 + h; y++) {
      const t = (y - y1) / h;
      const r = Math.round(col1[0] + (col2[0] - col1[0]) * t);
      const g = Math.round(col1[1] + (col2[1] - col1[1]) * t);
      const b = Math.round(col1[2] + (col2[2] - col1[2]) * t);
      for (let x = x1; x < x1 + w; x++) {
        if (radius > 0) {
          const inCornerX = x < x1 + radius ? x - (x1 + radius) : (x > x1 + w - radius ? x - (x1 + w - radius) : 0);
          const inCornerY = y < y1 + radius ? y - (y1 + radius) : (y > y1 + h - radius ? y - (y1 + h - radius) : 0);
          if (inCornerX * inCornerX + inCornerY * inCornerY > radius * radius) {
            continue;
          }
        }
        this.setPixel(x, y, r, g, b, 255);
      }
    }
  }

  fillRect(x1, y1, w, h, r, g, b, a = 255, radius = 0) {
    for (let y = y1; y < y1 + h; y++) {
      for (let x = x1; x < x1 + w; x++) {
        if (radius > 0) {
          const inCornerX = x < x1 + radius ? x - (x1 + radius) : (x > x1 + w - radius ? x - (x1 + w - radius) : 0);
          const inCornerY = y < y1 + radius ? y - (y1 + radius) : (y > y1 + h - radius ? y - (y1 + h - radius) : 0);
          if (inCornerX * inCornerX + inCornerY * inCornerY > radius * radius) {
            continue;
          }
        }
        this.setPixel(x, y, r, g, b, a);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const xMin = Math.max(0, Math.floor(cx - radius));
    const xMax = Math.min(this.width - 1, Math.ceil(cx + radius));
    const yMin = Math.max(0, Math.floor(cy - radius));
    const yMax = Math.min(this.height - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 <= r2) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  fillPolygon(points, r, g, b, a = 255) {
    let yMin = this.height, yMax = 0;
    for (const p of points) {
      if (p[1] < yMin) yMin = p[1];
      if (p[1] > yMax) yMax = p[1];
    }
    yMin = Math.max(0, Math.floor(yMin));
    yMax = Math.min(this.height - 1, Math.ceil(yMax));

    for (let y = yMin; y <= yMax; y++) {
      const intersections = [];
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
          const x = p1[0] + ((y - p1[1]) / (p2[1] - p1[1])) * (p2[0] - p1[0]);
          intersections.push(x);
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2) {
        const xStart = Math.max(0, Math.floor(intersections[i]));
        const xEnd = Math.min(this.width - 1, Math.ceil(intersections[i + 1]));
        for (let x = xStart; x <= xEnd; x++) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }
}

function renderAppIcon(size, isMaskable = false) {
  const cv = new Canvas(size, size);
  const s = size / 512;

  // Background
  const bgNavy = [15, 45, 89];
  const bgBlue = [2, 132, 199];
  const cornerRadius = isMaskable ? 0 : Math.round(115 * s);
  cv.fillGradientRect(0, 0, size, size, bgNavy, bgBlue, cornerRadius);

  // If maskable, scale house down to fit 75% safe area
  const scale = isMaskable ? 0.72 : 0.95;
  const offX = size * (1 - scale) / 2;
  const offY = size * (1 - scale) / 2;

  const tf = (x, y) => [Math.round(offX + x * s * scale), Math.round(offY + y * s * scale)];

  // Chimney
  const chimP = tf(330, 140);
  const chimW = Math.round(38 * s * scale);
  const chimH = Math.round(75 * s * scale);
  cv.fillRect(chimP[0], chimP[1], chimW, chimH, 203, 213, 225, 255, 4 * s);

  const chimTopP = tf(324, 132);
  const chimTopW = Math.round(50 * s * scale);
  const chimTopH = Math.round(14 * s * scale);
  cv.fillRect(chimTopP[0], chimTopP[1], chimTopW, chimTopH, 148, 163, 184, 255, 3 * s);

  // Roof
  const roofPts = [
    tf(256, 105),
    tf(420, 238),
    tf(386, 270),
    tf(256, 165),
    tf(126, 270),
    tf(92, 238)
  ];
  cv.fillPolygon(roofPts, 255, 255, 255, 255);

  // House Body
  const bodyP = tf(135, 240);
  const bodyW = Math.round(242 * s * scale);
  const bodyH = Math.round(180 * s * scale);
  cv.fillRect(bodyP[0], bodyP[1], bodyW, bodyH, 248, 250, 252, 255, Math.round(16 * s * scale));

  // Door
  const doorP = tf(222, 305);
  const doorW = Math.round(68 * s * scale);
  const doorH = Math.round(115 * s * scale);
  cv.fillRect(doorP[0], doorP[1], doorW, doorH, 15, 45, 89, 255, Math.round(10 * s * scale));

  // Door knob
  const knobP = tf(274, 365);
  cv.fillCircle(knobP[0], knobP[1], Math.max(2, 5 * s * scale), 56, 189, 248, 255);

  // Left Window
  const w1P = tf(160, 275);
  const w1S = Math.round(46 * s * scale);
  cv.fillRect(w1P[0], w1P[1], w1S, w1S, 226, 232, 240, 255, Math.round(8 * s * scale));
  const subS = Math.round(18 * s * scale);
  const p1 = tf(163, 278);
  const p2 = tf(185, 278);
  const p3 = tf(163, 300);
  const p4 = tf(185, 300);
  cv.fillRect(p1[0], p1[1], subS, subS, 2, 132, 199, 230, 2);
  cv.fillRect(p2[0], p2[1], subS, subS, 56, 189, 248, 230, 2);
  cv.fillRect(p3[0], p3[1], subS, subS, 56, 189, 248, 230, 2);
  cv.fillRect(p4[0], p4[1], subS, subS, 2, 132, 199, 230, 2);

  // Right Window: Step bars (loan steps icon)
  const w2P = tf(306, 275);
  cv.fillRect(w2P[0], w2P[1], w1S, w1S, 226, 232, 240, 255, Math.round(8 * s * scale));
  const barW = Math.round(8 * s * scale);
  const bar1P = tf(313, 303);
  const bar2P = tf(325, 293);
  const bar3P = tf(337, 283);
  cv.fillRect(bar1P[0], bar1P[1], barW, Math.round(13 * s * scale), 2, 132, 199, 255, 2);
  cv.fillRect(bar2P[0], bar2P[1], barW, Math.round(23 * s * scale), 2, 132, 199, 255, 2);
  cv.fillRect(bar3P[0], bar3P[1], barW, Math.round(33 * s * scale), 56, 189, 248, 255, 2);

  // Badge Circle
  const badgeP = tf(256, 205);
  const badgeR = Math.round(28 * s * scale);
  cv.fillCircle(badgeP[0], badgeP[1], badgeR, 56, 189, 248, 255);
  // Center dot or symbol
  cv.fillCircle(badgeP[0], badgeP[1], Math.round(10 * s * scale), 15, 45, 89, 255);

  return encodePNG(size, size, cv.buf);
}

import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons to:', publicDir);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderAppIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderAppIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderAppIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderAppIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), renderAppIcon(64, false));
console.log('All icons generated successfully!');
