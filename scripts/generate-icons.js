// Genera los iconos PNG de la app (casa blanca sobre fondo verde) sin dependencias externas.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BG = [47, 111, 79]; // --primary
const FG = [255, 255, 255];

function drawHouse(size) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, color, alpha = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
    px[i + 3] = alpha;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) set(x, y, BG);
  }

  const cx = size / 2;
  const roofTop = size * 0.22;
  const roofBase = size * 0.5;
  const roofHalfWidth = size * 0.32;
  const bodyTop = roofBase;
  const bodyBottom = size * 0.78;
  const bodyLeft = cx - size * 0.24;
  const bodyRight = cx + size * 0.24;
  const doorLeft = cx - size * 0.06;
  const doorRight = cx + size * 0.06;
  const doorTop = size * 0.6;

  for (let y = Math.floor(roofTop); y < roofBase; y++) {
    const t = (y - roofTop) / (roofBase - roofTop);
    const halfWidth = roofHalfWidth * t;
    for (let x = Math.floor(cx - halfWidth); x <= Math.ceil(cx + halfWidth); x++) {
      set(x, y, FG);
    }
  }

  for (let y = Math.floor(bodyTop); y < bodyBottom; y++) {
    for (let x = Math.floor(bodyLeft); x < bodyRight; x++) {
      const inDoor = x >= doorLeft && x < doorRight && y >= doorTop;
      set(x, y, inDoor ? BG : FG);
    }
  }

  return px;
}

function encodePNG(size) {
  const pixels = drawHouse(size);
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // sin filtro
    Buffer.from(pixels.buffer, y * rowBytes, rowBytes).copy(raw, y * (rowBytes + 1) + 1);
  }

  const idatData = zlib.deflateSync(raw);

  const chunk = (type, data) => {
    const typeBuf = Buffer.from(type, "ascii");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const sizes = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180 };
for (const [file, size] of Object.entries(sizes)) {
  fs.writeFileSync(path.join(outDir, file), encodePNG(size));
  console.log("Generado", file);
}
