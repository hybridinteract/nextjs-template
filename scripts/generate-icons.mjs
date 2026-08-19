/**
 * Generates the PWA placeholder icons in `public/icons/`.
 *
 * Run: `node scripts/generate-icons.mjs`
 *
 * These are **placeholders**. Replace them with your brand mark — the same two
 * sizes, the same filenames — and delete this script. It exists so the template
 * ships an installable app out of the box rather than a manifest pointing at
 * missing files, which is how a PWA silently fails to be installable.
 *
 * Written by hand rather than with an image library on purpose: a template
 * should not carry a build-time dependency to draw two squares. PNG is a simple
 * enough format that a 60-line encoder is cheaper than `sharp`.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

/** The mark: a rounded square in the brand colour with a lighter diagonal band. */
const BG = [24, 24, 27]; // zinc-900 — matches --primary in the default light theme
const FG = [250, 250, 250];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, maskable) {
  // A maskable icon must be FULL BLEED: the launcher applies its own shape mask
  // (circle, squircle, rounded square) and whatever it crops away must still be
  // your background. Ship a transparent-cornered circle here and the launcher's
  // wallpaper shows through at the edges.
  //
  // What it gets instead is a "safe zone": the middle 80%. Anything outside that
  // may be cropped, so the mark stays inside it.
  const radius = size * 0.22;
  const cx = size / 2;
  // The safe zone is a CIRCLE of 80% diameter, not a square — a launcher may
  // crop to a circle, so the corners of the middle-80% square are not safe.
  const safeRadius = size * 0.4;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;

      if (!maskable) {
        // Rounded square with transparent corners.
        const pad = size * 0.06;
        const dx = Math.max(Math.abs(x - cx + 0.5) - (cx - pad - radius), 0);
        const dy = Math.max(Math.abs(y - cx + 0.5) - (cx - pad - radius), 0);
        if (Math.hypot(dx, dy) > radius) { row[i + 3] = 0; continue; }
      }

      // Full bleed when maskable; inside the rounded square otherwise.
      let [r, g, b] = BG;

      // The diagonal band — confined to the safe zone on a maskable icon so a
      // circular crop cannot slice through it.
      const band = Math.abs(x - y) < size * 0.11;
      const inSafe =
        !maskable || Math.hypot(x - cx + 0.5, y - cx + 0.5) < safeRadius;
      if (band && inSafe) [r, g, b] = FG;

      row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = 255;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/maskable-512.png", 512, true],
  ["public/icons/apple-touch-icon.png", 180, false],
];

for (const [file, size, maskable] of targets) {
  writeFileSync(file, png(size, maskable));
  console.log(`wrote ${file} (${size}x${size}${maskable ? ", maskable" : ""})`);
}
