// Draws the chat wallpaper tile: public/quote-reply/doodles.svg.
//   node app/quote-reply/doodles.mjs
//
// The style is WhatsApp's: a dense, hand-drawn pattern of everyday objects in one thin
// line, packed edge to edge, with small circles, dots and sparkles filling the gaps.
// Every motif here is drawn for this prototype; none is traced from WhatsApp's asset.
// Motifs are on a 32-unit grid centred on (16, 16). The tile wraps on all four sides.
import { writeFileSync } from "node:fs";

const TILE = 380; // CSS px
const LINE = 1.05; // CSS px, after scaling
const SEED = 7;

const M = {
  heart: ["M16 27C6 20 3 14 6 9.5C8.8 5.5 14 6.5 16 10.5C18 6.5 23.2 5.5 26 9.5C29 14 26 20 16 27Z"],
  star: ["M16 4l3.5 7.6 8.2.9-6.1 5.6 1.7 8.1L16 22.1l-7.3 4.1 1.7-8.1-6.1-5.6 8.2-.9Z"],
  cloud: ["M8 23h16a5 5 0 0 0-.5-9.8A7.5 7.5 0 0 0 9.4 12 5.5 5.5 0 0 0 8 23Z", "M12 17.5a3 3 0 0 1 3-2.5"],
  moon: ["M19 5a11 11 0 1 0 8 16 9 9 0 0 1-8-16Z", "M23 7.5v3M21.5 9h3"],
  cup: ["M7 13h15v8a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5Z", "M22 15h1.5a3 3 0 0 1 0 6H22", "M11 10c0-2 2-2 2-4M16 10c0-2 2-2 2-4", "M5 28.5h19"],
  note: ["M12.5 24V8l13-3v16", "M12.5 12l13-3"],
  noteDots: [["c", 9, 24, 3.5], ["c", 22, 21, 3.5]],
  camera: ["M7 10h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z", "M11 10l2-3.5h6L21 10", "M24 13.5h.1"],
  cameraLens: [["c", 16, 18, 4.5], ["c", 16, 18, 2]],
  balloon: ["M16 3.5c4.6 0 8 3.7 8 8.3 0 5-4 9.7-8 10.2-4-.5-8-5.2-8-10.2 0-4.6 3.4-8.3 8-8.3Z", "M14.8 24h2.4L16 22Z", "M16 24c-2 3 2 4 0 7", "M12 9a4.5 4.5 0 0 1 2.5-2.5"],
  leaf: ["M6 26C6 13 14 6 27 5c0 13-8 21-21 21Z", "M6 26L20 12", "M12.5 19.5l-.5-5M16.5 15.5l-.5-4.5M12.5 19.5l5 .5M16.5 15.5l4.5.5"],
  bolt: ["M18 3L8 18h7l-2 11 11-16h-7Z"],
  smile: ["M10 19c3.5 4 8.5 4 12 0", "M11.5 13v1.5M20.5 13v1.5"],
  smileFace: [["c", 16, 16, 11.5]],
  plane: ["M4 15L28 5l-6 22-7-8Z", "M15 19L28 5", "M15 19v6l3.5-3.5"],
  chat: ["M7 6h18a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9l-6 5v-5H7a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Z", "M9 12h14M9 16.5h9"],
  sun: ["M16 3.5v3M16 25.5v3M3.5 16h3M25.5 16h3M7.2 7.2l2.1 2.1M22.7 22.7l2.1 2.1M7.2 24.8l2.1-2.1M22.7 9.3l2.1-2.1"],
  sunDisc: [["c", 16, 16, 5.5]],
  gift: ["M6 14h20v13H6Z", "M5 9.5h22V14H5Z", "M16 9.5V27", "M16 9.5c-3-5-8.5-3.5-5.5 0M16 9.5c3-5 8.5-3.5 5.5 0"],
  umbrella: ["M4 16a12 12 0 0 1 24 0c-1-1.6-4.4-2.2-6 0-1.6-2.2-4.4-2.2-6 0-1.6-2.2-4.4-2.2-6 0-1.6-2.2-5-1.6-6 0Z", "M16 16v9.5a2.5 2.5 0 0 1-5 0", "M16 4v-1"],
  icecream: ["M10 15l6 14 6-14", "M9 15a7 7 0 1 1 14 0Z", "M11.6 18.8l8.2-1.9M12.8 21.9l6-1.4", "M13 10.5a3 3 0 0 1 2.5-2"],
  pizza: ["M5 8.5Q16 2.5 27 8.5L16 29Z", "M7.2 12.2Q16 7 24.8 12.2"],
  pizzaDots: [["c", 14, 15.5, 1.6], ["c", 18.5, 19.5, 1.4], ["c", 15.5, 23.5, 1.1]],
  flower: ["M16 28V20", "M16 24c2-3 5-3 7-2-1 2-4 3-7 2Z"],
  flowerHead: [["c", 16, 11, 2.6], ["c", 16, 5.5, 3.2], ["c", 21.2, 9.3, 3.2], ["c", 19.2, 15.4, 3.2], ["c", 12.8, 15.4, 3.2], ["c", 10.8, 9.3, 3.2]],
  envelope: ["M6 8h20a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z", "M4.5 9.5L16 18l11.5-8.5"],
  clock: ["M16 17v-6M16 17l4 2", "M6.5 8.5l3.5-3M25.5 8.5l-3.5-3", "M10 26l-1.5 2.5M22 26l1.5 2.5"],
  clockFace: [["c", 16, 17, 10]],
  headphones: ["M6 21v-5a10 10 0 0 1 20 0v5", "M5.5 18h2a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 7.5 27h-2A1.5 1.5 0 0 1 4 25.5v-6A1.5 1.5 0 0 1 5.5 18ZM24.5 18h2a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z"],
  house: ["M4.5 15L16 5.5 27.5 15", "M8 12.5V27h16V12.5", "M14 27v-6.5h4V27", "M18.5 14.5h3.5V18h-3.5ZM20.25 14.5V18M18.5 16.25H22", "M22 9V6h2.5v5"],
  tree: ["M16 3.5L9 13h3.5L7 21h18l-5.5-8H23Z", "M16 21v6", "M12 28h8"],
  fish: ["M4 16q10-10 19 0-9 10-19 0Z", "M23 16l6-6v12Z", "M10 13c1.5 2 1.5 4 0 6"],
  fishEye: [["c", 15.5, 14.5, 1]],
  glasses: ["M14 17q2-1.6 4 0", "M4 17L2.5 12.5M28 17l1.5-4.5"],
  glassesRims: [["c", 9, 18, 5], ["c", 23, 18, 5]],
  crown: ["M5 24L4 10l6.5 6L16 7l5.5 9 6.5-6-1 14Z", "M5 27.5h22"],
  crownGems: [["c", 16, 19.5, 1.5]],
  bell: ["M16 4.5v2.5", "M9 22v-7a7 7 0 0 1 14 0v7l2 2.5H7Z", "M13.8 26.5a2.2 2.2 0 0 0 4.4 0"],
  rocket: ["M16 3c6 5 6 15 4 20h-8c-2-5-2-15 4-20Z", "M12 17.5L8 23h4.2M20 17.5l4 5.5h-4.2", "M14 26q2 4 4 0"],
  rocketWindow: [["c", 16, 12, 2.5]],
  cassette: ["M5 8h22a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z", "M8 25l2-5h12l2 5", "M13.5 15h5"],
  cassetteReels: [["c", 11, 15, 2.5], ["c", 21, 15, 2.5]],
  controller: ["M9 11h14a6 6 0 0 1 5.8 7.4l-.9 4a3 3 0 0 1-5 1.3L21 21H11l-1.9 2.7a3 3 0 0 1-5-1.3l-.9-4A6 6 0 0 1 9 11Z", "M9.5 14.5v4M7.5 16.5h4"],
  controllerKeys: [["c", 22, 15, 1.1], ["c", 24.5, 17.8, 1.1]],
  cake: ["M6 16h20v11H6Z", "M6 20.5q2.5 2 5 0t5 0 5 0 5 0", "M11.5 16v-5M20.5 16v-5", "M11.5 8.5q-1.2-1.4 0-3 1.2 1.6 0 3ZM20.5 8.5q-1.2-1.4 0-3 1.2 1.6 0 3Z"],
  citrus: ["M16 6.5v19M6.5 16h19M9.3 9.3l13.4 13.4M22.7 9.3L9.3 22.7"],
  citrusRings: [["c", 16, 16, 11], ["c", 16, 16, 9.2]],
  donut: ["M12 9l1 1.5M19 8.5l-1.2 1.3M23 14l-1.6.5M9 19l1.5-.4M20.5 21.5l-.6-1.5"],
  donutRings: [["c", 16, 16, 11], ["c", 16, 16, 3.8]],
  bulb: ["M12 22c-4.5-3-5-9-2.5-12.5A8 8 0 0 1 22.5 9.5c2.5 3.5 2 9.5-2.5 12.5v3h-8Z", "M13 28.5h6", "M14 18l2-3 2 3"],
  planet: ["M5 21c-2 2.5-1.5 4 2 3.5 3.5-.5 9-3 13.5-6.5S28 10.5 27 8.5c-.6-1.2-2.4-1.2-5 0"],
  planetBody: [["c", 16, 16, 7.5]],
  dice: ["M8 6h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"],
  diceDots: [["d", 11.5, 11.5], ["d", 16, 16], ["d", 20.5, 20.5], ["d", 20.5, 11.5], ["d", 11.5, 20.5]],
  key: ["M14 16h14M24 16v4M27.5 16v3"],
  keyBow: [["c", 9, 16, 5], ["c", 9, 16, 1.6]],
  pencil: ["M6 26l2-7L22 5l5 5-14 14Z", "M19 8l5 5", "M8 19l5 5", "M6 26l3.5-1"],
  mushroom: ["M4.5 17a11.5 10 0 0 1 23 0Z", "M12 17v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8"],
  mushroomSpots: [["c", 11, 12, 1.6], ["c", 17.5, 9.5, 1.3], ["c", 21.5, 13, 1.4]],
  sparkle: ["M16 4q1 11 12 12-11 1-12 12-1-11-12-12 11-1 12-12Z"],
  cat: ["M7 13L8 4l5.5 5h5L24 4l1 9c2 9-4 14-9 14S5 22 7 13Z", "M14.5 18.5h3l-1.5 1.5Z", "M16 20v1.5c-1 1.5-2.5 1.5-3.5.5M16 21.5c1 1.5 2.5 1.5 3.5.5", "M3 18l6 .5M3 21.5l6-1M29 18l-6 .5M29 21.5l-6-1"],
  catEyes: [["d", 12, 15], ["d", 20, 15]],
  book: ["M16 9C12 6 7 6 4 7v18c3-1 8-1 12 2 4-3 9-3 12-2V7c-3-1-8-1-12 2Z", "M16 9v18", "M7 11c2-.5 4.5-.3 6 .5M7 15c2-.5 4.5-.3 6 .5M19 11.5c1.5-.8 4-1 6-.5"],
  paw: ["M10.5 23c0-4 2.5-7 5.5-7s5.5 3 5.5 7c0 2.5-2.5 3-5.5 2-3 1-5.5.5-5.5-2Z"],
  pawToes: [["c", 8, 14, 2.2], ["c", 12.5, 9.5, 2.3], ["c", 19.5, 9.5, 2.3], ["c", 24, 14, 2.2]],
  guitar: ["M19.5 12.5l8-8M25 3l4 4", "M19 13c-1.5-1.8-4.5-2-6 0-1 1.3-1 2.7-2.5 3.2-3.5 1-5.5 3-5.5 6 0 3.5 3 6.5 6.5 6.5 3 0 5-2 6-5.5.5-1.5 1.9-1.5 3.2-2.5 2-1.5 1.8-4.5 0-6Z", "M12 20l3 3"],
  guitarHole: [["c", 13.5, 18.5, 1.8]],
  anchor: ["M16 9v19", "M11 13h10", "M5 19c0 5 5 9 11 9s11-4 11-9", "M3 21.5l2-2.5 2.5 2M29 21.5l-2-2.5-2.5 2"],
  anchorRing: [["c", 16, 6, 2.8]],
  snail: ["M5 25h19c2.5 0 4-2 4-4.5", "M24 20.5V13M27.5 20.5V13"],
  snailShell: [["c", 14, 17.5, 7.5], ["c", 14.5, 18, 4], ["c", 15, 18.5, 1.3]],
  shoe: ["M4 21V12.5l6-1c1.5 3 4.5 4 7 4l8.5 2.5c2 .6 3 2 3 3.5V24H4Z", "M4 21h24.5", "M13 13l1.5-2M15.8 14l1.5-2"],
  bike: ["M10 22l5-9h7l-6 9h-6", "M15 13l-1.5-3h-2.5M22 13l1-3h2.5", "M22 13l3 9"],
  bikeWheels: [["c", 9.5, 22, 5], ["c", 23.5, 22, 5]],
  popsicle: ["M10 15a6 6 0 0 1 12 0v9H10Z", "M16 24v5", "M13 12v8"],
  watermelon: ["M4 12a12 12 0 0 0 24 0Z", "M6.5 12a9.5 9.5 0 0 0 19 0"],
  watermelonSeeds: [["d", 12, 15.5], ["d", 16, 18], ["d", 20, 15.5]],
};

// What a motif is made of: path keys and dot/circle keys drawn together.
const MOTIFS = [
  ["heart"], ["star"], ["cloud"], ["moon"], ["cup"], ["note", "noteDots"], ["camera", "cameraLens"],
  ["balloon"], ["leaf"], ["bolt"], ["smile", "smileFace"], ["plane"], ["chat"], ["sun", "sunDisc"],
  ["gift"], ["umbrella"], ["icecream"], ["pizza", "pizzaDots"], ["flower", "flowerHead"], ["envelope"],
  ["clock", "clockFace"], ["headphones"], ["house"], ["tree"], ["fish", "fishEye"], ["glasses", "glassesRims"],
  ["crown", "crownGems"], ["bell"], ["rocket", "rocketWindow"], ["cassette", "cassetteReels"],
  ["controller", "controllerKeys"], ["cake"], ["citrus", "citrusRings"], ["donut", "donutRings"], ["bulb"],
  ["planet", "planetBody"], ["dice", "diceDots"], ["key", "keyBow"], ["pencil"], ["mushroom", "mushroomSpots"],
  ["cat", "catEyes"], ["book"], ["paw", "pawToes"], ["guitar", "guitarHole"], ["anchor", "anchorRing"],
  ["snail", "snailShell"], ["shoe"], ["bike", "bikeWheels"], ["popsicle"], ["watermelon", "watermelonSeeds"],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const between = (a, b) => a + rand() * (b - a);
const fmt = (n) => +n.toFixed(2);

/** Shortest distance between two points on the wrapping tile. */
function wrapDist(a, b) {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  dx = Math.min(dx, TILE - dx);
  dy = Math.min(dy, TILE - dy);
  return Math.hypot(dx, dy);
}

const placed = [];
function place(r, gap, tries) {
  for (let i = 0; i < tries; i++) {
    const p = { x: rand() * TILE, y: rand() * TILE, r };
    if (placed.every((q) => wrapDist(p, q) >= p.r + q.r + gap)) {
      placed.push(p);
      return p;
    }
  }
  return null;
}

function motifBody(keys) {
  return keys
    .flatMap((k) =>
      M[k].map((part) => {
        if (typeof part === "string") return `<path d="${part}"/>`;
        const [kind, cx, cy, r] = part;
        return kind === "d"
          ? `<circle cx="${cx}" cy="${cy}" r="1.15" fill="currentColor" stroke="none"/>`
          : `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
      }),
    )
    .join("");
}

// Each motif is defined once and placed with <use>, so the file stays small.
const defs = MOTIFS.map((keys, i) => `<g id="m${i}">${motifBody(keys)}</g>`).join("");
const items = [];

// Wrapped copies, so a motif that crosses an edge shows on the other side too.
function copies(x, y, r) {
  const out = [];
  for (const ox of [-TILE, 0, TILE])
    for (const oy of [-TILE, 0, TILE]) {
      const cx = x + ox;
      const cy = y + oy;
      if (cx + r > 0 && cx - r < TILE && cy + r > 0 && cy - r < TILE) out.push([cx, cy]);
    }
  return out;
}

// 1. Objects: every motif at least once, then more until the tile is full.
const order = [];
for (let round = 0; round < 4; round++) {
  const shuffled = MOTIFS.map((_, i) => i).sort(() => rand() - 0.5);
  order.push(...shuffled);
}
for (const m of order) {
  const size = between(36, 52);
  const p = place(size * 0.45, 1, 600);
  if (!p) continue;
  const k = size / 32;
  const a = between(-28, 28);
  for (const [x, y] of copies(p.x, p.y, p.r))
    items.push(
      `<use href="#m${m}" transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(a)}) scale(${fmt(k)}) translate(-16 -16)" stroke-width="${fmt(LINE / k)}"/>`,
    );
}

// 2. Fillers in the gaps: rings, dots, small sparkles and crosses, as WhatsApp's pattern has.
const FILL = [
  (x, y, r) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r * 0.75)}"/>`,
  (x, y) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="1.2" fill="currentColor" stroke="none"/>`,
  (x, y, r) => {
    const s = r * 0.95;
    return `<path d="M${fmt(x)} ${fmt(y - s)}q${fmt(s * 0.15)} ${fmt(s * 0.85)} ${fmt(s)} ${fmt(s)}q${fmt(-s * 0.85)} ${fmt(s * 0.15)} ${fmt(-s)} ${fmt(s)}q${fmt(-s * 0.15)} ${fmt(-s * 0.85)} ${fmt(-s)} ${fmt(-s)}q${fmt(s * 0.85)} ${fmt(-s * 0.15)} ${fmt(s)} ${fmt(-s)}Z"/>`;
  },
  (x, y, r) => {
    const s = r * 0.7;
    return `<path d="M${fmt(x)} ${fmt(y - s)}v${fmt(2 * s)}M${fmt(x - s)} ${fmt(y)}h${fmt(2 * s)}"/>`;
  },
];
for (let i = 0; i < 4000; i++) {
  const r = between(2, 5);
  const p = place(r, 2.2, 1);
  if (!p) continue;
  const draw = FILL[Math.floor(rand() * (r < 3 ? 2 : FILL.length))];
  for (const [x, y] of copies(p.x, p.y, p.r)) items.push(draw(x, y, p.r));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" fill="none" stroke="currentColor" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round" color="#b9ab94" opacity="0.42"><defs>${defs}</defs>${items.join("")}</svg>\n`;
const out = new URL("../../public/quote-reply/doodles.svg", import.meta.url);
writeFileSync(out, svg);
console.log(`${placed.length} shapes, ${items.length} drawn, ${(svg.length / 1024).toFixed(1)} KB → ${out.pathname}`);
