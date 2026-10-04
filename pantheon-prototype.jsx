import React, { useState, useEffect, useRef } from "react";
import { Play, Lock, Sparkles, Moon, Star, Sun, ChevronRight, ChevronLeft, Calendar, X } from "lucide-react";

// Fixed "starfield" palette — the night-sky / constellation surfaces always render
// in these colors regardless of light/dark mode, since the sky is the emotional
// core of the app. Only the surrounding chrome (header, nav, codex page) themes.
// Palette: Mythic Night
const SKY = {
  cosmos: "#1B1B3A",
  violet: "#2D2B55",
  gold: "#E8C547",
  coral: "#E8836B",
  parchment: "#F4EFE6",
  mist: "#C8C3E8",
  mistDim: "#8B86B8",
};

const THEMES = {
  dark: {
    bg: SKY.cosmos,
    text: SKY.parchment,
    textDim: SKY.mistDim,
    navBg: "rgba(20,19,43,0.92)",
    codexPageBg: "#211D38",
    codexHeader: "#A89FD6",
    cardBg: "#2B2748",
    cardBorder: "rgba(255,255,255,0.12)",
    lockBoxBg: SKY.violet,
    gold: SKY.gold,
    coral: SKY.coral,
    isFrame: false,
  },
  light: {
    bg: "#EFEAF7",
    text: "#1F1B33",
    textDim: "#6E6690",
    navBg: "rgba(239,234,247,0.95)",
    codexPageBg: "#FBF8F1",
    codexHeader: "#9C8F73",
    cardBg: "#FFFFFF",
    cardBorder: "#E3DDC9",
    lockBoxBg: "#E7E1F2",
    gold: "#B8860B",
    coral: "#D9694F",
    isFrame: true,
  },
};

const TIER_NAMES = ["Common", "Common", "Rare", "Rare", "Mythic", "Mythic", "Legendary"];
const TIER_COSTS = [30, 50, 80, 110, 160, 210, 280];
const TIER_LEGEND = ["Common", "Rare", "Mythic", "Legendary"].map((tier) => {
  const costs = TIER_COSTS.filter((_, i) => TIER_NAMES[i] === tier);
  return { tier, min: Math.min(...costs), max: Math.max(...costs) };
});
const TIER_STARS = [5, 6, 7, 7, 8, 9, 10];

const tierColor = (tier) =>
  tier === "Legendary" ? SKY.coral :
  tier === "Mythic" ? SKY.gold :
  tier === "Rare" ? "#9CC6E8" : SKY.mist;

// Interpolates between two hex colors — used to deepen the night sky
// subtly as a focus session progresses, like dusk settling into true dark.
function mixHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}


function Prim({ p, fill }) {
  switch (p.t) {
    case "ellipse":
      return <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={fill}
        transform={p.rot ? `rotate(${p.rot} ${p.cx} ${p.cy})` : undefined} />;
    case "circle":
      return <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.stroke ? "none" : fill}
        stroke={p.stroke ? fill : undefined} strokeWidth={p.sw} />;
    case "polygon":
      return <polygon points={p.pts} fill={fill} />;
    case "line":
      return <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={fill} strokeWidth={p.w || 3} strokeLinecap="round" />;
    case "path":
      return <path d={p.d} fill={p.stroke ? "none" : fill} stroke={p.stroke ? fill : undefined}
        strokeWidth={p.sw} strokeLinecap="round" strokeLinejoin="round" />;
    default:
      return null;
  }
}

// Stylized humanoid figures — head, torso, arms, legs as a base, with
// distinguishing accessories per figure (weapon, headdress, wings, animal features).
const HEAD = { t: "circle", cx: 50, cy: 23, r: 8 };
const TORSO = { t: "path", d: "M37 34 Q50 27 63 34 L60 64 Q60 73 50 76 Q40 73 40 64 Z" };
const ARM_L = { t: "path", d: "M38 36 Q27 41 25 55 Q23 64 30 66 Q34 57 37 45 Z" };
const ARM_R = { t: "path", d: "M62 36 Q73 41 75 55 Q77 64 70 66 Q66 57 63 45 Z" };
const ARM_STUMP_R = { t: "path", d: "M62 36 Q70 40 70 48 Q66 50 63 45 Z" };
const LEG_L = { t: "path", d: "M43 71 L39 95 Q39 99 43 99 L46 99 L48 74 Z" };
const LEG_R = { t: "path", d: "M57 71 L61 95 Q61 99 57 99 L54 99 L52 74 Z" };
const ROBE_TORSO = { t: "path", d: "M37 34 Q50 27 63 34 L69 92 Q69 98 60 98 L40 98 Q31 98 31 92 Z" };
const BROAD_TORSO = { t: "path", d: "M32 36 Q50 25 68 36 L64 64 Q64 74 53 77 Q47 77 36 74 Q36 64 32 36 Z" };
const HUMANOID = [HEAD, TORSO, ARM_L, ARM_R, LEG_L, LEG_R];
const ROBED = [HEAD, ROBE_TORSO, ARM_L, ARM_R];
const BROAD = [HEAD, BROAD_TORSO, ARM_L, ARM_R, LEG_L, LEG_R];

const ICONS = {
  default: [{ t: "polygon", pts: "50,15 60,40 85,50 60,60 50,85 40,60 15,50 40,40" }],

  "greek-0": [ // Pegasus
    { t: "ellipse", cx: 42, cy: 58, rx: 16, ry: 10, rot: -15 },
    { t: "circle", cx: 62, cy: 46, r: 7 },
    { t: "polygon", pts: "56,44 78,20 68,42 58,50" },
    { t: "line", x1: 32, y1: 64, x2: 28, y2: 80, w: 3 },
    { t: "line", x1: 40, y1: 67, x2: 38, y2: 84, w: 3 },
    { t: "line", x1: 48, y1: 67, x2: 50, y2: 84, w: 3 },
    { t: "line", x1: 54, y1: 64, x2: 58, y2: 80, w: 3 },
  ],
  "greek-1": [ // Medusa
    ...ROBED,
    { t: "circle", cx: 50, cy: 22, r: 12 },
    { t: "path", d: "M36 16 Q26 8 28 -2", stroke: true, sw: 3 },
    { t: "path", d: "M42 8 Q36 -4 42 -12", stroke: true, sw: 3 },
    { t: "path", d: "M50 6 Q50 -8 56 -16", stroke: true, sw: 3 },
    { t: "path", d: "M58 8 Q64 -4 60 -12", stroke: true, sw: 3 },
    { t: "path", d: "M64 16 Q74 8 72 -2", stroke: true, sw: 3 },
  ],
  "greek-2": [ // Perseus
    ...HUMANOID,
    { t: "line", x1: 66, y1: 38, x2: 84, y2: 18, w: 4 },
    { t: "ellipse", cx: 26, cy: 50, rx: 7, ry: 11 },
  ],
  "greek-3": [ // Andromeda
    ...ROBED,
    { t: "line", x1: 38, y1: 36, x2: 22, y2: 22, w: 2.5 },
    { t: "line", x1: 62, y1: 36, x2: 78, y2: 22, w: 2.5 },
    { t: "circle", cx: 22, cy: 22, r: 3 },
    { t: "circle", cx: 78, cy: 22, r: 3 },
  ],
  "greek-4": [ // Orion
    ...HUMANOID,
    { t: "path", d: "M68 20 Q86 45 68 70", stroke: true, sw: 3.5 },
    { t: "line", x1: 68, y1: 20, x2: 68, y2: 70, w: 1.5 },
    { t: "line", x1: 68, y1: 45, x2: 40, y2: 45, w: 2 },
    { t: "polygon", pts: "40,45 50,40 50,50" },
  ],
  "greek-5": [ // Hercules
    ...BROAD,
    { t: "path", d: "M20 30 Q14 24 10 36 Q18 44 28 38 Z" },
    { t: "line", x1: 70, y1: 40, x2: 84, y2: 22, w: 5 },
    { t: "circle", cx: 86, cy: 18, r: 6 },
  ],
  "greek-6": [ // Atlas
    HEAD,
    { t: "path", d: "M30 74 Q30 50 50 50 Q70 50 70 74 Z" },
    { t: "line", x1: 36, y1: 56, x2: 32, y2: 40, w: 3 },
    { t: "line", x1: 64, y1: 56, x2: 68, y2: 40, w: 3 },
    { t: "circle", cx: 50, cy: 26, r: 14, stroke: true, sw: 2.5 },
  ],

  "norse-0": [ // Sleipnir
    { t: "ellipse", cx: 48, cy: 52, rx: 20, ry: 11 },
    { t: "circle", cx: 72, cy: 40, r: 8 },
    { t: "polygon", pts: "78,34 92,26 84,42" },
    { t: "line", x1: 30, y1: 60, x2: 26, y2: 80, w: 2.5 },
    { t: "line", x1: 38, y1: 62, x2: 36, y2: 82, w: 2.5 },
    { t: "line", x1: 46, y1: 63, x2: 46, y2: 84, w: 2.5 },
    { t: "line", x1: 54, y1: 63, x2: 56, y2: 84, w: 2.5 },
    { t: "line", x1: 60, y1: 62, x2: 64, y2: 82, w: 2.5 },
  ],
  "norse-1": [ // Tyr
    HEAD, TORSO, ARM_STUMP_R, ARM_L, LEG_L, LEG_R,
    { t: "line", x1: 30, y1: 40, x2: 18, y2: 18, w: 4 },
  ],
  "norse-2": [ // Valkyrie
    ...ROBED,
    { t: "polygon", pts: "36,32 12,16 30,42" },
    { t: "polygon", pts: "64,32 88,16 70,42" },
    { t: "line", x1: 50, y1: 18, x2: 50, y2: 80, w: 3 },
  ],
  "norse-3": [ // Loki
    HEAD, TORSO, ARM_L, ARM_R, LEG_L, LEG_R,
    { t: "path", d: "M64 30 Q78 24 76 12", stroke: true, sw: 2.5 },
    { t: "path", d: "M36 30 Q22 24 24 12", stroke: true, sw: 2.5 },
  ],
  "norse-4": [ // Thor
    ...BROAD,
    { t: "path", d: "M68 8 H86 V22 H68 Z" },
    { t: "line", x1: 77, y1: 22, x2: 70, y2: 40, w: 4 },
  ],
  "norse-5": [ // Fenrir
    { t: "ellipse", cx: 50, cy: 56, rx: 24, ry: 16 },
    { t: "polygon", pts: "26,42 14,28 32,40" },
    { t: "polygon", pts: "74,42 86,28 68,40" },
    { t: "polygon", pts: "50,70 38,86 62,86" },
    { t: "line", x1: 30, y1: 68, x2: 24, y2: 86, w: 4 },
    { t: "line", x1: 70, y1: 68, x2: 76, y2: 86, w: 4 },
  ],
  "norse-6": [ // Odin
    ...ROBED,
    { t: "line", x1: 24, y1: 16, x2: 24, y2: 80, w: 3.5 },
    { t: "polygon", pts: "76,20 92,12 84,28" },
    { t: "circle", cx: 46, cy: 22, r: 2, stroke: true, sw: 2 },
  ],

  "egyptian-0": [ // Bastet
    { t: "ellipse", cx: 50, cy: 60, rx: 18, ry: 16 },
    { t: "circle", cx: 50, cy: 36, r: 13 },
    { t: "polygon", pts: "38,28 32,14 44,26" },
    { t: "polygon", pts: "62,28 68,14 56,26" },
    { t: "path", d: "M66 62 Q82 66 80 48", stroke: true, sw: 3 },
    { t: "line", x1: 40, y1: 76, x2: 36, y2: 90, w: 3 },
    { t: "line", x1: 60, y1: 76, x2: 64, y2: 90, w: 3 },
  ],
  "egyptian-1": [ // Sobek
    { t: "path", d: "M14 56 Q50 42 88 54 Q50 66 14 56 Z" },
    { t: "polygon", pts: "16,54 24,50 24,58" },
    { t: "polygon", pts: "32,53 40,49 40,57" },
    { t: "polygon", pts: "48,53 56,49 56,57" },
    { t: "circle", cx: 80, cy: 50, r: 4 },
    { t: "line", x1: 30, y1: 64, x2: 26, y2: 78, w: 3 },
    { t: "line", x1: 50, y1: 66, x2: 48, y2: 80, w: 3 },
    { t: "line", x1: 70, y1: 64, x2: 72, y2: 78, w: 3 },
  ],
  "egyptian-2": [ // Thoth
    HEAD, ROBE_TORSO, ARM_L, ARM_R,
    { t: "path", d: "M56 22 Q82 24 86 8", stroke: true, sw: 4 },
  ],
  "egyptian-3": [ // Horus
    ...HUMANOID,
    { t: "polygon", pts: "56,22 70,18 56,28" },
    { t: "polygon", pts: "34,28 16,14 36,22" },
    { t: "polygon", pts: "66,28 84,14 64,22" },
  ],
  "egyptian-4": [ // Isis
    ...ROBED,
    { t: "polygon", pts: "37,32 8,14 28,40" },
    { t: "polygon", pts: "63,32 92,14 72,40" },
    { t: "path", d: "M44 8 H56 V18 H44 Z" },
  ],
  "egyptian-5": [ // Anubis
    ...HUMANOID,
    { t: "polygon", pts: "40,18 32,2 46,16" },
    { t: "polygon", pts: "60,18 68,2 54,16" },
    { t: "polygon", pts: "50,22 60,16 50,30" },
  ],
  "egyptian-6": [ // Ra
    ...HUMANOID,
    { t: "polygon", pts: "56,18 72,14 56,26" },
    { t: "circle", cx: 50, cy: 8, r: 7, stroke: true, sw: 2.5 },
  ],

  "japanese-0": [ // Kitsune
    { t: "ellipse", cx: 46, cy: 58, rx: 16, ry: 13 },
    { t: "polygon", pts: "34,34 44,48 28,48" },
    { t: "polygon", pts: "62,34 52,48 68,48" },
    { t: "circle", cx: 48, cy: 44, r: 12 },
    { t: "path", d: "M58 64 Q78 58 78 40", stroke: true, sw: 3 },
    { t: "path", d: "M60 70 Q84 68 86 50", stroke: true, sw: 3 },
    { t: "path", d: "M56 76 Q78 82 76 96", stroke: true, sw: 3 },
    { t: "line", x1: 36, y1: 70, x2: 32, y2: 86, w: 3 },
  ],
  "japanese-1": [ // Momotaro
    ...HUMANOID,
    { t: "line", x1: 64, y1: 38, x2: 80, y2: 20, w: 4 },
    { t: "circle", cx: 24, cy: 52, r: 9 },
    { t: "line", x1: 24, y1: 43, x2: 24, y2: 38, w: 2 },
  ],
  "japanese-2": [ // Tsukuyomi
    ...ROBED,
    { t: "path", d: "M62 6 A18 18 0 1 0 62 38 A13 13 0 1 1 62 6 Z" },
  ],
  "japanese-3": [ // Raijin
    ...BROAD,
    { t: "circle", cx: 16, cy: 40, r: 7 },
    { t: "circle", cx: 84, cy: 40, r: 7 },
    { t: "circle", cx: 22, cy: 58, r: 6 },
    { t: "circle", cx: 78, cy: 58, r: 6 },
  ],
  "japanese-4": [ // Susanoo
    ...HUMANOID,
    { t: "line", x1: 50, y1: 34, x2: 50, y2: 72, w: 4 },
    { t: "polygon", pts: "42,72 58,72 50,82" },
    { t: "path", d: "M30 26 Q40 18 36 6", stroke: true, sw: 2.5 },
    { t: "path", d: "M70 26 Q60 18 64 6", stroke: true, sw: 2.5 },
  ],
  "japanese-5": [ // Yamata-no-Orochi
    { t: "path", d: "M14 76 Q22 30 38 54 Q46 22 54 50 Q62 22 70 54 Q78 30 86 76", stroke: true, sw: 4 },
    { t: "circle", cx: 26, cy: 54, r: 5 },
    { t: "circle", cx: 46, cy: 44, r: 5 },
    { t: "circle", cx: 54, cy: 44, r: 5 },
    { t: "circle", cx: 74, cy: 54, r: 5 },
  ],
  "japanese-6": [ // Amaterasu
    ...ROBED,
    { t: "circle", cx: 50, cy: 50, r: 18, stroke: true, sw: 2.5 },
    { t: "line", x1: 50, y1: 28, x2: 50, y2: 18, w: 2.5 },
    { t: "line", x1: 50, y1: 72, x2: 50, y2: 82, w: 2.5 },
    { t: "line", x1: 28, y1: 50, x2: 18, y2: 50, w: 2.5 },
    { t: "line", x1: 72, y1: 50, x2: 82, y2: 50, w: 2.5 },
  ],

  "chinese-0": [ // Qilin
    { t: "ellipse", cx: 48, cy: 62, rx: 20, ry: 12 },
    { t: "circle", cx: 70, cy: 46, r: 9 },
    { t: "line", x1: 74, y1: 38, x2: 80, y2: 22, w: 2.5 },
    { t: "line", x1: 80, y1: 40, x2: 90, y2: 28, w: 2.5 },
    { t: "line", x1: 32, y1: 72, x2: 28, y2: 88, w: 2.5 },
    { t: "line", x1: 44, y1: 74, x2: 42, y2: 90, w: 2.5 },
    { t: "line", x1: 56, y1: 74, x2: 58, y2: 90, w: 2.5 },
  ],
  "chinese-1": [ // Houyi
    ...HUMANOID,
    { t: "path", d: "M30 14 Q54 45 30 76", stroke: true, sw: 3.5 },
    { t: "line", x1: 30, y1: 14, x2: 30, y2: 76, w: 1.5 },
    { t: "line", x1: 30, y1: 45, x2: 78, y2: 45, w: 2 },
    { t: "polygon", pts: "78,45 68,40 68,50" },
  ],
  "chinese-2": [ // Chang'e
    ...ROBED,
    { t: "path", d: "M62 4 A18 18 0 1 0 62 36 A13 13 0 1 1 62 4 Z" },
  ],
  "chinese-3": [ // Nuwa
    HEAD, TORSO, ARM_L, ARM_R,
    { t: "path", d: "M44 64 Q60 72 48 88 Q40 98 52 100", stroke: true, sw: 6 },
    { t: "path", d: "M56 64 Q40 76 56 90 Q66 98 52 100", stroke: true, sw: 6 },
  ],
  "chinese-4": [ // Zhulong
    { t: "path", d: "M16 64 Q26 28 50 38 Q74 28 84 64", stroke: true, sw: 6 },
    { t: "circle", cx: 84, cy: 60, r: 6 },
    { t: "polygon", pts: "16,64 8,58 8,70" },
  ],
  "chinese-5": [ // Pangu
    HEAD, BROAD_TORSO, ARM_L, ARM_R, LEG_L, LEG_R,
    { t: "polygon", pts: "66,16 88,4 92,12 70,28" },
    { t: "line", x1: 70, y1: 20, x2: 56, y2: 38, w: 3.5 },
  ],
  "chinese-6": [ // Sun Wukong
    ...HUMANOID,
    { t: "polygon", pts: "40,16 30,4 38,20" },
    { t: "polygon", pts: "60,16 70,4 62,20" },
    { t: "line", x1: 26, y1: 12, x2: 78, y2: 84, w: 3.5 },
  ],
};

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function genStars(id, count) {
  const rand = mulberry32(hashStr(id));
  const pts = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const radius = 24 + rand() * 22;
    const x = 50 + Math.cos(angle) * radius + (rand() - 0.5) * 6;
    const y = 50 + Math.sin(angle) * radius + (rand() - 0.5) * 6;
    pts.push({ x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) });
  }
  return pts;
}

const PANTHEONS = {
  greek: { label: "Greek", figures: ["Pegasus", "Medusa", "Perseus", "Andromeda", "Orion", "Hercules", "Atlas"],
    desc: ["The winged horse, born of sea-foam.", "Her gaze turned warriors to stone.", "Slayer of the Gorgon.", "Chained to the cliffs, freed by courage.", "The hunter, eternal in the winter sky.", "Twelve labors, one legend.", "He carries the sky on his shoulders."],
    lore: [
      "Born from the blood of Medusa where it struck the sea, Pegasus rose fully formed and untamed. Bellerophon caught him drinking at a spring, bridled him with a golden bit gifted by Athena, and together they soared against the Chimera. In the end, the gods set him among the stars — a reminder that even wild things can be tamed by patience, not force.",
      "Once a priestess of stunning beauty, Medusa was transformed by Athena's wrath after Poseidon wronged her in her own temple — punished, as is too often the case, for someone else's act. Her gaze turned the unworthy to stone, but Perseus found another way: a mirrored shield, and the courage to look without looking. Her severed head still adorns Athena's aegis, ever watchful.",
      "Sent to fetch the head of a Gorgon as an impossible task meant to kill him, Perseus instead returned a hero — armed with winged sandals, a cap of invisibility, and his own sharp wit. He slew Medusa without ever meeting her eyes directly, then went on to rescue Andromeda from a sea monster. His constellation kneels eternally beside hers.",
      "Chained to a sea cliff as offering to the monster Cetus — punishment for her mother's boastful tongue, not her own — Andromeda waited not for rescue but for a chance. Perseus arrived on Pegasus's wings, turned the beast to stone, and freed her. She chose him in return; their two constellations have never drifted far apart.",
      "A hunter of unmatched skill, Orion boasted he could kill any beast on Earth — a claim that drew the wrath of the gods, who sent a scorpion to humble him. He fell, and was raised into the winter sky anyway, the scorpion forever trailing at his heel on the opposite horizon. Even gods, it seems, can admire stubbornness.",
      "Twelve labors, each more absurd than the last — a lion's hide, a hydra's heads, the apples of the Hesperides — were the price of his redemption, set by Hera's lasting grudge. He completed them all, not through cleverness alone but sheer refusal to stop. The sky remembers persistence longer than perfection.",
      "For siding against the Olympians, Atlas was condemned to bear the heavens on his shoulders for eternity — not the Earth itself, as is often misremembered, but the sky's own weight. Heracles once offered to spell him, briefly, and Atlas nearly never took the burden back. Still, he stands. Still, he holds.",
    ] },
  norse: { label: "Norse", figures: ["Sleipnir", "Tyr", "Valkyrie", "Loki", "Thor", "Fenrir", "Odin"],
    desc: ["Eight-legged steed of the All-Father.", "Sacrificed a hand for the truth.", "Chooser of who lives, who is remembered.", "Trickster — never quite an enemy, never quite a friend.", "Thunder follows where he walks.", "The wolf who waits for the end of things.", "All-Father, seeker of wisdom's price."],
    lore: [
      "Eight-legged and grey, Sleipnir was born of trickery — Loki's own doing, in a shape he'd rather not discuss. Odin rides him between the nine worlds faster than thought itself, faster than any normal steed could carry a god. No gate, no river, no realm-edge slows him.",
      "God of law and the courage to keep one's word, Tyr was the only one willing to place his hand in the wolf Fenrir's mouth as proof of a promise the other gods intended to break. The wolf bit down. Tyr kept his honor and lost his hand — a trade he never seemed to regret.",
      "Riders of the battle-sky, the Valkyries choose who falls and who is carried to Odin's hall, weighing courage rather than survival. They are neither cruel nor kind — only exact. To be chosen by one is the old world's strangest honor.",
      "Trickster, shape-shifter, sometimes villain, sometimes the only one clever enough to fix what the gods broke in the first place. He is blood-brother to Odin and father to monsters, beloved and distrusted in equal, uneasy measure. The Norse never quite decided what to make of him, and neither should you.",
      "Hammer in hand, Thor stands between Midgard and the giants who would unmake it, loud and immediate where Odin is patient and distant. Mjölnir returns to his palm no matter how far he throws it. Thunder is just the sound of him on his way somewhere.",
      "Prophesied to kill Odin himself at the world's ending, Fenrir grew too fast and too strong for the gods' comfort, until they bound him with a chain spun from things that don't exist — a cat's footsteps, a woman's beard, a mountain's root. He waits there still, patient as only the doomed can be.",
      "All-Father, he traded an eye for a single drink from the well of wisdom, and hung himself from Yggdrasil for nine days just to learn the runes. He knows the price of knowledge better than any god who ever lived easy. Two ravens carry him the news he can't see for himself.",
    ] },
  egyptian: { label: "Egyptian", figures: ["Bastet", "Sobek", "Thoth", "Horus", "Isis", "Anubis", "Ra"],
    desc: ["Guardian of hearth and quiet evenings.", "Crocodile lord of the Nile's strength.", "Keeper of knowledge and the written word.", "Falcon-eyed, watcher of kings.", "Mother of magic, weaver of fate.", "Watcher at the threshold between worlds.", "The sun itself, sailing the underworld each night."],
    lore: [
      "Once a fierce lioness of war, Bastet softened over centuries into the protector of homes, childbirth, and the quiet hours after dark. Cats were sacred in her name, fed at temples and mourned with real grief when they died. She guards thresholds the way only something that used to be dangerous can.",
      "Crocodile-headed and short-tempered, Sobek embodied the Nile's dual nature — the same waters that fed Egypt's fields could just as easily drown a careless traveler. Pharaohs invoked his strength in battle, hoping to borrow some of that same controlled ferocity. Few gods are honored and feared in such equal measure.",
      "Keeper of writing, math, and the moon's slow arithmetic, Thoth recorded the verdicts at the weighing of every soul's heart. He is credited with inventing language itself — a god who valued precision over power, and got remembered for it anyway.",
      "Falcon-eyed sky god, Horus lost an eye in his long war against Set to avenge his father Osiris, and that eye — restored, imperfect, sacred — became Egypt's symbol of protection and healing. Every pharaoh claimed to rule as his living incarnation. He watches still, one eye for the sky, one for the underworld he avenged.",
      "Mother of magic and the most resourceful goddess in the pantheon, Isis reassembled her murdered husband Osiris piece by piece and conceived Horus from what remained. Her devotion outlasted her grief and became its own kind of power. Few myths reward persistence quite so literally.",
      "Jackal-headed guardian of the dead, Anubis presides over the weighing of hearts, where a soul's truth is measured against a single feather. He is neither cruel nor merciful — only fair, in a place where fairness is the only mercy that matters.",
      "The sun itself, Ra sails across the sky by day and through the perilous underworld by night, battling the serpent Apep in darkness so dawn can happen again. Every sunrise is, technically, a small victory parade. He has done this every day since the world began.",
    ] },
  japanese: { label: "Japanese", figures: ["Kitsune", "Momotaro", "Tsukuyomi", "Raijin", "Susanoo", "Yamata-no-Orochi", "Amaterasu"],
    desc: ["Nine-tailed trickster spirit of the fox.", "Born from a peach, raised to be brave.", "God of the moon, keeper of the quiet hours.", "Drummer of thunder across the sky.", "Storm god, banished, then redeemed.", "The eight-headed serpent of legend.", "Goddess of the sun, light of all things."],
    lore: [
      "Fox spirits that grow wiser — and more tails — with age, kitsune can be tricksters, guardians, or lovers in disguise, depending on which story you're trusting that day. The most powerful, nine-tailed kitsune are said to see the truth of anyone they meet. Not all foxes in the old stories are foxes.",
      "Found inside a giant peach by an elderly, childless couple, Momotaro grew up loyal and brave enough to set off and defeat the oni terrorizing his village — armed with nothing but conviction and a few animal friends he gathered along the way. Sometimes the most ordinary beginning makes the most determined hero.",
      "God of the moon, Tsukuyomi once shared the sky freely with his sister Amaterasu, until a disagreement over a meal split them apart forever — day and night, never meeting again. He governs the sky's quiet hours, patient where his sister is radiant.",
      "Drummer of thunder, Raijin strikes his ring of drums across the storm clouds, usually accompanied by his companion Fujin, god of wind. Farmers both feared and welcomed him — his storms were violent, but they brought the rain that fed the rice fields.",
      "Storm god and Amaterasu's unruly brother, Susanoo was banished from heaven after one chaotic act too many, only to redeem himself on Earth by slaying the eight-headed serpent Yamata-no-Orochi. From the serpent's tail he drew a legendary sword — proof that even the banished can still do something worth remembering.",
      "An eight-headed, eight-tailed serpent so vast it spanned eight valleys and eight peaks, Yamata-no-Orochi demanded a sacrifice of maidens until Susanoo intervened with sake and cunning, getting the beast drunk before striking. From its body came a blade fit for emperors.",
      "Goddess of the sun, Amaterasu once hid herself in a cave after a family quarrel, plunging the world into darkness until the other gods coaxed her out with a mirror and her own reflected light. She is, quite literally, what daylight depends on.",
    ] },
  chinese: { label: "Chinese", figures: ["Qilin", "Houyi", "Chang'e", "Nuwa", "Zhulong", "Pangu", "Sun Wukong"],
    desc: ["Gentle beast, omen of good fortune.", "The archer who saved the world from nine suns.", "She who drifted to the moon, and stayed.", "Mother who shaped humanity from clay.", "The torch dragon, bringer of day and night.", "From his body, the world itself was made.", "The Monkey King, undefeated by heaven itself."],
    lore: [
      "A gentle, hooved beast with the body of a deer and the scales of a dragon, the qilin appears only in times of great virtue — heralding the birth of a wise ruler or a sage. It is said to harm no living thing, not even the grass beneath its feet.",
      "When nine suns scorched the earth and threatened all life, the archer Houyi shot down eight of them, one by one, leaving only the single sun we still see today. For this, he was given the elixir of immortality — a gift his story doesn't end as simply as you'd hope.",
      "Chang'e drank the elixir of immortality meant to be shared, and drifted up to the moon alone, where she remains — watched, on clear nights, by the husband she left behind and the people who still leave her offerings every autumn.",
      "Lonely in a freshly made world, Nuwa shaped humanity from yellow clay, figure by figure, until her arms grew tired — and so, the story goes, the wealthy were made carefully by hand, and everyone else made faster, from flicked mud. She later patched a broken sky with five-colored stones.",
      "The torch dragon, vast enough to bring day and night merely by opening and closing his eyes, Zhulong needs no sun to mark time — his breath alone makes the seasons turn. Some stories say the world's first light came from him, not the sun at all.",
      "Born from a cosmic egg, Pangu split heaven from earth with a single swing and held them apart for eighteen thousand years. When he finally died, his breath became the wind, his eyes the sun and moon, his blood the rivers — the world quite literally made from him.",
      "The Monkey King, born from a stone and granted immortality through sheer audacity, fought heaven itself to a standstill before being humbled, imprisoned, and eventually redeemed on a pilgrimage west. No one in any pantheon causes quite as much trouble — or earns quite as much forgiveness.",
    ] },
};

const ALL_ITEMS = [];
Object.entries(PANTHEONS).forEach(([key, p]) => {
  p.figures.forEach((name, i) => {
    const id = `${key}-${i}`;
    ALL_ITEMS.push({
      id, name, pantheon: key, pantheonLabel: p.label,
      tier: TIER_NAMES[i], cost: TIER_COSTS[i],
      desc: p.desc[i],
      lore: p.lore[i],
      stars: genStars(id, TIER_STARS[i]),
    });
  });
});
function itemsFor(pantheonKey) {
  return ALL_ITEMS.filter((it) => it.pantheon === pantheonKey);
}

const ENCOURAGEMENT = [
  "discipline is choosing what you want most",
  "you don't need motivation, you need to begin",
  "small effort, repeated, becomes unstoppable",
  "show up. that's the whole job",
  "the work doesn't care how you feel about it",
  "done is better than perfect",
  "this is the work. right here",
  "keep going. that's the entire secret",
];

const DURATIONS = [
  { label: "5 min", mins: 5, sub: "warm up" },
  { label: "15 min", mins: 15, sub: "settle in" },
  { label: "25 min", mins: 25, sub: "deep focus" },
  { label: "45 min", mins: 45, sub: "full session" },
];

function Constellation({ item, progress = 1, size = 100, ghost = true, glow = false }) {
  const prims = ICONS[item.id] || ICONS.default;
  const maskId = `mask-${item.id}`;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100" height="100" fill="black" />
          <circle cx="50" cy="50" r={p * 75} fill="white" />
        </mask>
      </defs>
      {ghost && (
        <g opacity={0.2}>
          {prims.map((pr, i) => <Prim key={i} p={pr} fill={SKY.mist} />)}
        </g>
      )}
      {glow && p > 0.04 && (
        <circle cx="50" cy="50" r={8 + p * 26} fill={SKY.gold} opacity={0.14 * p} />
      )}
      <g mask={`url(#${maskId})`}>
        {prims.map((pr, i) => <Prim key={i} p={pr} fill={SKY.gold} />)}
      </g>
    </svg>
  );
}

function Twinkles() {
  const dots = useRef(
    Array.from({ length: 36 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      r: Math.random() * 0.7 + 0.3, d: Math.random() * 3 + 2, delay: Math.random() * 4,
    }))
  ).current;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={SKY.mist}>
          <animate attributeName="opacity" values="0.15;0.7;0.15" dur={`${p.d}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

function AppLogo({ size = 140 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r="6" fill={SKY.gold} />
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={SKY.gold} strokeWidth="1.3" opacity="0.75" transform="rotate(-20 50 50)" />
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={SKY.mist} strokeWidth="1" opacity="0.55" transform="rotate(40 50 50)" />
      <circle cx="78" cy="38" r="1.6" fill={SKY.mist} />
      <circle cx="22" cy="62" r="1.6" fill={SKY.mist} />
    </svg>
  );
}

// ---------- Onboarding ----------
function OnboardingDemo() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setP((prev) => (prev >= 1 ? 0 : prev + 0.02)), 90);
    return () => clearInterval(i);
  }, []);
  return <Constellation item={ALL_ITEMS[0]} progress={p} size={170} ghost glow />;
}

const OB_PAGES = [
  { title: "Welcome to Pantheon", body: "Ready to focus?", visual: "logo" },
  { title: "Grow your legends", body: "Stay focused, and your legends will grow in number, one star at a time.", visual: "demo" },
  { title: "Nothing is ever lost", body: "Step away early, and your legend just dims a little. Pick up exactly where you left off, next time.", visual: "dim" },
  { title: "Myths from across the world", body: "Build a constellation and collection of legends from Greek, Norse, Egyptian, Japanese, and Chinese myth.", visual: "cultures" },
  { title: "Small sessions count", body: "Five focused minutes earns its place in the sky just as surely as forty-five. Start small — consistency beats marathon sessions.", visual: "static" },
  { title: "No pressure, just focus", body: "No accounts. No streak-shaming. Just you, your focus, and the sky you're building.", visual: "static" },
];

function Onboarding({ T, mode, toggleMode, onFinish }) {
  const [page, setPage] = useState(0);
  const last = page === OB_PAGES.length - 1;
  const first = page === 0;
  const data = OB_PAGES[page];

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh" }} className="w-full flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: "100vh" }}>
        <div className="flex justify-start items-center px-5 pt-6">
          <button onClick={toggleMode} style={{ color: T.textDim }}>
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative" style={{ minHeight: 420 }}>
          <div className="rounded-3xl flex items-center justify-center mb-7"
            style={{ width: 210, height: 210, background: SKY.cosmos, position: "relative", overflow: "hidden" }}>
            <Twinkles />
            <div style={{ position: "relative", zIndex: 1 }}>
              {data.visual === "logo" && <AppLogo size={140} />}
              {data.visual === "demo" && <OnboardingDemo />}
              {data.visual === "dim" && <Constellation item={ALL_ITEMS[2]} progress={0.45} size={170} ghost glow />}
              {data.visual === "cultures" && (
                <div className="flex flex-col items-center gap-2" style={{ width: 170 }}>
                  <div className="flex gap-2 justify-center">
                    {Object.keys(PANTHEONS).slice(0, 3).map((k) => (
                      <Constellation key={k} item={itemsFor(k)[0]} progress={1} size={50} glow />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center">
                    {Object.keys(PANTHEONS).slice(3, 5).map((k) => (
                      <Constellation key={k} item={itemsFor(k)[0]} progress={1} size={50} glow />
                    ))}
                  </div>
                </div>
              )}
              {data.visual === "static" && <Constellation item={ALL_ITEMS[0]} progress={1} size={170} glow />}
            </div>
          </div>

          <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif", color: T.text }}>{data.title}</h2>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif", maxWidth: 280 }}>
            {data.body}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 px-8 pb-10">
          <div className="flex gap-1.5">
            {OB_PAGES.map((_, i) => (
              <div key={i} style={{
                width: i === page ? 18 : 6, height: 6, borderRadius: 3,
                background: i === page ? T.gold : T.cardBorder, transition: "all 0.3s",
              }} />
            ))}
          </div>
          <div className="w-full flex items-center gap-3">
            {!first && (
              <button onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-full px-5 py-4 text-sm"
                style={{ background: "transparent", border: `1px solid ${T.cardBorder}`, color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
                Back
              </button>
            )}
            <button
              onClick={() => (last ? onFinish() : setPage((p) => p + 1))}
              className="flex-1 rounded-full flex items-center justify-center gap-2 py-4"
              style={{ background: T.gold, color: mode === "dark" ? SKY.cosmos : "#FFF8EC", fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
              {last ? "Get started" : "Next"} {!last && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Tracker ----------
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Tracker({ T, sessionLog, calendarMonth, setCalendarMonth }) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const monthTotal = Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return sessionLog[key] || 0;
  }).reduce((a, b) => a + b, 0);

  const activeDays = Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return (sessionLog[key] || 0) > 0;
  }).filter(Boolean).length;

  function changeMonth(delta) {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + delta);
    setCalendarMonth(d);
  }

  return (
    <div className="flex-1 px-5 pt-5 pb-28" style={{ background: T.codexPageBg, borderRadius: "24px 24px 0 0", marginTop: 8 }}>
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => changeMonth(-1)} style={{ color: T.textDim }}><ChevronLeft size={18} /></button>
        <p style={{ fontFamily: "Georgia, serif", color: T.text }}>{MONTH_LABELS[month]} {year}</p>
        <button onClick={() => changeMonth(1)} style={{ color: T.textDim }}><ChevronRight size={18} /></button>
      </div>
      <p className="text-xs text-center mb-5" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
        {monthTotal} session{monthTotal === 1 ? "" : "s"} started · {activeDays} active day{activeDays === 1 ? "" : "s"}
      </p>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((w, i) => (
          <p key={i} className="text-center text-[10px]" style={{ color: T.codexHeader, fontFamily: "system-ui, sans-serif" }}>{w}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = sessionLog[key] || 0;
          const isToday = key === todayStr;
          return (
            <div key={i} className="aspect-square rounded-lg flex flex-col items-center justify-center"
              style={{
                background: count > 0 ? "rgba(232,197,71,0.12)" : (isToday ? "rgba(232,197,71,0.06)" : T.cardBg),
                border: isToday ? `2px solid ${T.gold}` : `1px solid ${T.cardBorder}`,
              }}>
              <span className="text-xs" style={{ color: count > 0 || isToday ? T.text : T.textDim, fontFamily: "system-ui, sans-serif", fontWeight: isToday ? 700 : 400 }}>{day}</span>
              {count > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                    <div key={j} style={{ width: 3, height: 3, borderRadius: 2, background: T.gold }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Main App ----------
export default function App() {
  const [tab, setTab] = useState("focus");
  const [unlocked, setUnlocked] = useState([]);
  const [invested, setInvested] = useState({});
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [bankedPoints, setBankedPoints] = useState(0);
  const [mode, setMode] = useState("dark");
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [pantheonKey, setPantheonKey] = useState("greek");
  const [selectedMins, setSelectedMins] = useState(5);
  const [sessionActive, setSessionActive] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completion, setCompletion] = useState(null);
  const [milestoneFlash, setMilestoneFlash] = useState(null);
  const [shootingStar, setShootingStar] = useState(null);
  const milestonesHitRef = useRef([]);
  const shootingTimeoutRef = useRef(null);
  const [companionId, setCompanionId] = useState(null);
  const [sessionLog, setSessionLog] = useState({}); // 'YYYY-MM-DD' -> count
  const [viewingItem, setViewingItem] = useState(null); // codex detail modal
  const [spendCelebration, setSpendCelebration] = useState(null); // unlock-via-points celebration
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);
  const totalSecRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get("pantheon-progress-v4");
        if (res?.value) {
          const data = JSON.parse(res.value);
          setUnlocked(data.unlocked || []);
          setInvested(data.invested || {});
          setLifetimePoints(data.lifetimePoints || 0);
          setBankedPoints(data.bankedPoints || 0);
          setMode(data.mode || "dark");
          setOnboardingDone(!!data.onboardingDone);
          setCompanionId(data.companionId || null);
          setSessionLog(data.sessionLog || {});
        }
      } catch (e) { /* fresh start */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage?.set("pantheon-progress-v4", JSON.stringify({ unlocked, invested, lifetimePoints, bankedPoints, mode, onboardingDone, companionId, sessionLog })).catch(() => {});
  }, [unlocked, invested, lifetimePoints, bankedPoints, mode, onboardingDone, companionId, sessionLog, loaded]);

  const companion = companionId ? ALL_ITEMS.find((it) => it.id === companionId) : null;

  const T = THEMES[mode];
  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  function nextTargetFor(key) {
    return itemsFor(key).find((it) => !unlocked.includes(it.id)) || null;
  }
  const target = nextTargetFor(pantheonKey);
  const investedSoFar = target ? (invested[target.id] || 0) : 0;
  const baseProgress = target ? Math.min(1, investedSoFar / target.cost) : 1;

  const totalSec = selectedMins * 60;
  const liveEarnedSoFar = Math.round((elapsedSec / 60) * 10);
  const liveProgress = target ? Math.min(1, (investedSoFar + liveEarnedSoFar) / target.cost) : 1;

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function startSession() {
    const total = selectedMins * 60;
    totalSecRef.current = total;
    sessionStartRef.current = Date.now();
    activeRef.current = true;
    milestonesHitRef.current = [];
    setElapsedSec(0);
    setSessionActive(true);
    setCompletion(null);
    setMilestoneFlash(null);
    setShootingStar(null);
    const key = todayKey();
    setSessionLog((log) => ({ ...log, [key]: (log[key] || 0) + 1 }));
    intervalRef.current = setInterval(tick, 1000);
    scheduleShootingStar();
  }

  function scheduleShootingStar() {
    clearTimeout(shootingTimeoutRef.current);
    const delay = 14000 + Math.random() * 18000; // every ~14-32s
    shootingTimeoutRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      setShootingStar({
        id: Date.now(),
        y: 15 + Math.random() * 40,
        fromLeft: Math.random() > 0.5,
      });
      setTimeout(() => setShootingStar(null), 1200);
      scheduleShootingStar();
    }, delay);
  }

  // Always derives elapsed time from the real start timestamp rather than
  // counting ticks — so a locked screen, backgrounded app, or throttled
  // timer self-corrects the instant focus returns, instead of drifting
  // or silently stalling.
  function tick() {
    if (!activeRef.current || sessionStartRef.current == null) return;
    const elapsed = Math.min(totalSecRef.current, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    setElapsedSec(elapsed);

    [0.25, 0.5, 0.75].forEach((m) => {
      const frac = elapsed / totalSecRef.current;
      if (frac >= m && !milestonesHitRef.current.includes(m)) {
        milestonesHitRef.current.push(m);
        setMilestoneFlash(m);
        setTimeout(() => setMilestoneFlash(null), 1600);
      }
    });

    if (elapsed >= totalSecRef.current) {
      clearInterval(intervalRef.current);
      clearTimeout(shootingTimeoutRef.current);
      activeRef.current = false;
      finishSession(elapsed, true);
    }
  }

  useEffect(() => {
    if (!sessionActive) return;
    function catchUp() {
      if (!document.hidden) tick();
    }
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
    };
  }, [sessionActive]);

  function finishSession(secs, full) {
    activeRef.current = false;
    setSessionActive(false);
    const mins = secs / 60;
    let earned = Math.round(mins * 10);
    if (full) earned = Math.round(earned * 1.2);
    setLifetimePoints((lp) => lp + earned);
    setBankedPoints((b) => b + earned);

    if (!target) { setCompletion({ earned, full, newlyUnlocked: null }); return; }

    const newInvested = investedSoFar + earned;
    let newlyUnlocked = null;
    if (newInvested >= target.cost) {
      const overflow = newInvested - target.cost;
      newlyUnlocked = target;
      setUnlocked((u) => [...u, target.id]);
      const list = itemsFor(pantheonKey);
      const nextIdx = list.findIndex((it) => it.id === target.id) + 1;
      const nextOne = list[nextIdx];
      setInvested((inv) => ({
        ...inv,
        [target.id]: target.cost,
        ...(nextOne ? { [nextOne.id]: overflow } : {}),
      }));
    } else {
      setInvested((inv) => ({ ...inv, [target.id]: newInvested }));
    }
    setCompletion({ earned, full, newlyUnlocked });
  }

  function endEarly() {
    clearInterval(intervalRef.current);
    clearTimeout(shootingTimeoutRef.current);
    activeRef.current = false;
    const elapsed = sessionStartRef.current != null
      ? Math.min(totalSecRef.current, Math.floor((Date.now() - sessionStartRef.current) / 1000))
      : elapsedSec;
    finishSession(elapsed, false);
  }
  function dismissCompletion() {
    setCompletion(null);
    setElapsedSec(0);
  }

  // Lets a player spend banked points to instantly finish whichever figure
  // is next-in-line for a given pantheon — an active alternative to the
  // passive, automatic per-session investment from the Focus screen.
  function spendToUnlock(pKey) {
    const list = itemsFor(pKey);
    const tgt = list.find((it) => !unlocked.includes(it.id));
    if (!tgt) return;
    const already = invested[tgt.id] || 0;
    const remaining = tgt.cost - already;
    if (bankedPoints < remaining) return;
    setBankedPoints((b) => b - remaining);
    setInvested((inv) => ({ ...inv, [tgt.id]: tgt.cost }));
    setUnlocked((u) => [...u, tgt.id]);
    setSpendCelebration(tgt);
  }

  if (!loaded) return null;
  if (!onboardingDone) {
    return <Onboarding T={T} mode={mode} toggleMode={toggleMode} onFinish={() => setOnboardingDone(true)} />;
  }

  const mm = String(Math.floor((totalSec - elapsedSec) / 60)).padStart(2, "0");
  const ss = String((totalSec - elapsedSec) % 60).padStart(2, "0");
  const sessionProgress = totalSec > 0 ? Math.min(1, elapsedSec / totalSec) : 0;
  const phraseIndex = Math.floor(elapsedSec / 300);
  const currentPhrase = ENCOURAGEMENT[phraseIndex % ENCOURAGEMENT.length];

  return (
    <div style={{ fontFamily: "Georgia, serif", background: T.bg, minHeight: "100vh", color: T.text }}
      className="w-full flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: "100vh" }}>

        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Moon size={18} color={T.gold} />
            <span style={{ letterSpacing: "0.12em" }} className="text-sm uppercase">Pantheon</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm" style={{ color: T.gold }}>
              <Sparkles size={14} />
              <span style={{ fontFamily: "'Courier New', monospace" }}>{lifetimePoints}</span>
            </div>
            <button onClick={toggleMode} style={{ color: T.textDim }}>
              {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>

        {tab === "focus" && (
          <div className="px-4">
            <div
              className="relative overflow-hidden"
              style={{
                background: sessionActive ? mixHex(SKY.cosmos, "#0E0D22", sessionProgress) : SKY.cosmos,
                borderRadius: T.isFrame ? 24 : 0,
                margin: T.isFrame ? "4px 0 16px" : "0 -16px",
                paddingBottom: 28,
                transition: "background 1s linear",
              }}>
              <div className="absolute inset-0 overflow-hidden">
                <Twinkles />
                {shootingStar && (
                  <div
                    key={shootingStar.id}
                    style={{
                      position: "absolute",
                      top: `${shootingStar.y}%`,
                      left: shootingStar.fromLeft ? "-10%" : "110%",
                      width: 2, height: 2, borderRadius: "50%",
                      background: SKY.parchment,
                      boxShadow: `0 0 6px 1px ${SKY.parchment}`,
                      animation: `shoot-${shootingStar.fromLeft ? "right" : "left"} 1.1s linear forwards`,
                    }}
                  />
                )}
                <style>{`
                  @keyframes shoot-right { from { transform: translateX(0); opacity: 1; } to { transform: translateX(135vw); opacity: 0; } }
                  @keyframes shoot-left { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-135vw); opacity: 0; } }
                  @keyframes breathe { 0%, 100% { transform: scale(0.92); opacity: 0.25; } 50% { transform: scale(1.12); opacity: 0.5; } }
                  @keyframes milestone-pulse { 0% { opacity: 0; transform: scale(0.85); } 30% { opacity: 0.9; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.3); } }
                `}</style>
              </div>

              {!sessionActive && !completion && (
                <div className="relative z-10 flex flex-col items-center w-full px-6">
                  <div className="flex gap-1.5 flex-wrap justify-center mt-5">
                    {Object.entries(PANTHEONS).map(([key, p]) => {
                      const done = itemsFor(key).every((it) => unlocked.includes(it.id));
                      return (
                        <button key={key} onClick={() => setPantheonKey(key)}
                          className="px-3 py-1.5 rounded-full text-xs"
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            background: pantheonKey === key ? SKY.gold : "rgba(255,255,255,0.07)",
                            color: pantheonKey === key ? SKY.cosmos : SKY.mist,
                            border: `1px solid ${pantheonKey === key ? SKY.gold : "rgba(255,255,255,0.12)"}`,
                            opacity: done ? 0.5 : 1,
                          }}>
                          {p.label}{done ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>

                  {companion && (
                    <div className="flex items-center gap-1.5 mt-3" style={{ opacity: 0.8 }}>
                      <Constellation item={companion} progress={1} size={22} />
                      <span className="text-[10px]" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif" }}>
                        with {companion.name}
                      </span>
                    </div>
                  )}

                  <p className="text-xs mt-5" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif", letterSpacing: "0.08em" }}>
                    FOCUSING TOWARD
                  </p>
                  {target ? (
                    <>
                      <h2 className="text-2xl mt-2" style={{ color: SKY.gold, fontFamily: "Georgia, serif" }}>{target.name}</h2>
                      <p className="text-xs mb-2" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif" }}>
                        {target.pantheonLabel} · {target.tier}
                      </p>
                      <Constellation item={target} progress={baseProgress} size={200} ghost glow />
                      <p className="text-sm mt-3 text-center px-6" style={{ color: SKY.mist, fontFamily: "system-ui, sans-serif" }}>
                        "{target.desc}"
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif" }}>
                        {investedSoFar}/{target.cost} points charted
                      </p>
                    </>
                  ) : (
                    <p className="mt-10 text-center" style={{ color: SKY.mist, fontFamily: "system-ui, sans-serif" }}>
                      This pantheon is fully charted.
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap justify-center mt-6">
                    {DURATIONS.map((d) => (
                      <button key={d.mins} onClick={() => setSelectedMins(d.mins)}
                        className="px-3 py-2 rounded-full text-xs flex flex-col items-center"
                        style={{
                          background: selectedMins === d.mins ? SKY.gold : "rgba(255,255,255,0.06)",
                          color: selectedMins === d.mins ? SKY.cosmos : SKY.mist,
                          fontFamily: "system-ui, sans-serif",
                          border: `1px solid ${selectedMins === d.mins ? SKY.gold : "rgba(255,255,255,0.1)"}`,
                          minWidth: 64,
                        }}>
                        <span style={{ fontWeight: 600 }}>{d.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{d.sub}</span>
                      </button>
                    ))}
                  </div>

                  <button onClick={startSession} disabled={!target}
                    className="mt-6 rounded-full flex items-center justify-center gap-2 px-8 py-4"
                    style={{ background: SKY.gold, color: SKY.cosmos, boxShadow: "0 0 24px rgba(232,197,71,0.45)", fontFamily: "system-ui, sans-serif", fontWeight: 600, opacity: target ? 1 : 0.4 }}>
                    <Play size={16} fill={SKY.cosmos} /> Begin
                  </button>
                </div>
              )}

              {sessionActive && (
                <div className="relative z-10 flex flex-col items-center w-full mt-8">
                  {companion && (
                    <div className="flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ animation: "breathe 4s ease-in-out infinite" }}>
                        <Constellation item={companion} progress={1} size={26} />
                      </div>
                      <span className="text-[11px]" style={{ color: SKY.mist, fontFamily: "system-ui, sans-serif" }}>
                        {companion.name} is with you
                      </span>
                    </div>
                  )}

                  <div className="relative" style={{ width: 230, height: 230 }}>
                    <svg viewBox="0 0 230 230" width={230} height={230} className="absolute top-0 left-0" style={{ overflow: "visible" }}>
                      <circle cx="115" cy="115" r="108" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                      <circle cx="115" cy="115" r="108" fill="none" stroke={SKY.gold} strokeWidth="3"
                        strokeDasharray={2 * Math.PI * 108}
                        strokeDashoffset={2 * Math.PI * 108 * (1 - sessionProgress)}
                        strokeLinecap="round" transform="rotate(-90 115 115)"
                        style={{ transition: "stroke-dashoffset 1s linear" }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Constellation item={target} progress={liveProgress} size={190} ghost glow />
                    </div>
                    {milestoneFlash && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
                        <div style={{ width: 210, height: 210, borderRadius: "50%", border: `1px solid ${SKY.gold}`, animation: "milestone-pulse 1.6s ease-out forwards" }} />
                      </div>
                    )}
                  </div>

                  <p className="mt-5 text-4xl" style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", color: SKY.parchment }}>{mm}:{ss}</p>
                  <p className="text-xs mt-1 text-center px-10" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif", minHeight: 16 }}>
                    {currentPhrase}
                  </p>

                  <button onClick={endEarly} className="mt-8 text-xs underline" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif" }}>
                    end early — keep what you've earned
                  </button>
                </div>
              )}

              {completion && (
                <div className="relative z-10 flex flex-col items-center w-full mt-10">
                  <div className="rounded-2xl px-6 py-7 flex flex-col items-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,197,71,0.25)" }}>
                    <Sparkles size={28} color={SKY.gold} />
                    <p className="mt-3 text-sm text-center" style={{ color: SKY.mist, fontFamily: "system-ui, sans-serif" }}>
                      {completion.full ? "Full session complete" : "A smaller offering, gladly accepted"}
                    </p>
                    <p className="text-2xl mt-1" style={{ color: SKY.gold }}>+{completion.earned} points</p>
                    {completion.newlyUnlocked && (
                      <div className="mt-5 flex flex-col items-center">
                        <p className="text-xs" style={{ color: SKY.mistDim, fontFamily: "system-ui, sans-serif" }}>NEWLY CHARTED</p>
                        <Constellation item={completion.newlyUnlocked} progress={1} size={140} glow />
                        <p className="mt-1" style={{ color: SKY.coral }}>{completion.newlyUnlocked.name}</p>
                      </div>
                    )}
                    <button onClick={dismissCompletion} className="mt-6 rounded-full px-6 py-2 text-sm"
                      style={{ background: SKY.gold, color: SKY.cosmos, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "codex" && (
          <div className="flex-1 px-5 pt-5 pb-28" style={{ background: T.codexPageBg, borderRadius: "24px 24px 0 0", marginTop: 8 }}>
            {companion && (
              <div className="rounded-xl p-3 mb-6 flex items-center gap-3" style={{ background: T.cardBg, border: `1px solid ${tierColor(companion.tier)}` }}>
                <div style={{ background: SKY.cosmos, borderRadius: 10, padding: 4 }}>
                  <Constellation item={companion} progress={1} size={44} glow />
                </div>
                <div>
                  <p className="text-[10px] uppercase" style={{ color: T.codexHeader, letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif" }}>Companion</p>
                  <p style={{ fontFamily: "Georgia, serif", color: T.text }}>{companion.name}</p>
                </div>
              </div>
            )}
            <div className="rounded-xl p-3 mb-6 flex items-center justify-between" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
              <div>
                <p className="text-[10px] uppercase" style={{ color: T.codexHeader, letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif" }}>Banked points</p>
                <p style={{ fontFamily: "Georgia, serif", color: SKY.gold, fontSize: 18 }}>{bankedPoints}</p>
              </div>
              <p className="text-[11px] text-right" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif", maxWidth: 160 }}>
                spend below to instantly unlock a pantheon's next figure
              </p>
            </div>

            <div className="flex justify-between mb-6 px-1">
              {TIER_LEGEND.map(({ tier, min, max }) => (
                <div key={tier} className="flex flex-col items-center gap-1">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierColor(tier) }} />
                  <span className="text-[10px]" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>{tier}</span>
                  <span className="text-[9px]" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif", opacity: 0.7 }}>{min}–{max} pts</span>
                </div>
              ))}
            </div>
            {Object.entries(PANTHEONS).map(([key, p]) => {
              const list = itemsFor(key);
              const unlockedCount = list.filter((it) => unlocked.includes(it.id)).length;
              const next = list.find((it) => !unlocked.includes(it.id));
              const nextInvested = next ? (invested[next.id] || 0) : 0;
              const nextRemaining = next ? next.cost - nextInvested : 0;
              const canAfford = next && bankedPoints >= nextRemaining;
              return (
                <div key={key} className="mb-7">
                  <p className="text-xs uppercase mb-2" style={{ color: T.codexHeader, letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif" }}>
                    {p.label} · {unlockedCount}/{list.length}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {list.map((it) => {
                      const isUnlocked = unlocked.includes(it.id);
                      const isNext = next && it.id === next.id;
                      const Wrapper = isUnlocked ? "button" : "div";
                      return (
                        <Wrapper key={it.id} onClick={isUnlocked ? () => setViewingItem(it) : undefined}
                          className="rounded-xl p-3 flex flex-col items-center relative"
                          style={{ background: T.cardBg, border: `1px solid ${isUnlocked ? tierColor(it.tier) : (isNext ? SKY.gold : T.cardBorder)}`, cursor: isUnlocked ? "pointer" : "default" }}>
                          {companionId === it.id && (
                            <div className="absolute top-1.5 right-1.5"><Star size={12} fill={SKY.gold} color={SKY.gold} /></div>
                          )}
                          {isUnlocked ? (
                            <div style={{ background: SKY.cosmos, borderRadius: 10, padding: 6 }}>
                              <Constellation item={it} progress={1} size={64} glow />
                            </div>
                          ) : isNext ? (
                            <div style={{ background: SKY.cosmos, borderRadius: 10, padding: 6 }}>
                              <Constellation item={it} progress={nextInvested / it.cost} size={64} ghost />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center" style={{ width: 64, height: 64, background: T.lockBoxBg, borderRadius: 10 }}>
                              <Lock size={20} color={T.textDim} />
                            </div>
                          )}
                          <p className="mt-2 text-sm" style={{ fontFamily: "Georgia, serif", color: isUnlocked ? T.text : T.textDim }}>
                            {isUnlocked ? it.name : "???"}
                          </p>
                          <p className="text-[10px]" style={{ color: isUnlocked ? tierColor(it.tier) : T.textDim, fontFamily: "system-ui, sans-serif" }}>
                            {it.tier}
                          </p>
                          {isNext && (
                            <>
                              <p className="text-[10px] mt-1" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
                                {nextInvested}/{it.cost} pts
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); spendToUnlock(key); }}
                                disabled={!canAfford}
                                className="mt-2 w-full rounded-full py-1.5 text-[10px]"
                                style={{
                                  background: canAfford ? SKY.gold : "transparent",
                                  color: canAfford ? SKY.cosmos : T.textDim,
                                  border: `1px solid ${canAfford ? SKY.gold : T.cardBorder}`,
                                  fontFamily: "system-ui, sans-serif", fontWeight: 600,
                                  opacity: canAfford ? 1 : 0.7,
                                }}>
                                {canAfford ? `Unlock for ${nextRemaining} pts` : `Need ${nextRemaining - bankedPoints} more`}
                              </button>
                            </>
                          )}
                        </Wrapper>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button onClick={() => setOnboardingDone(false)}
              className="w-full text-center text-xs mt-2 mb-2 underline"
              style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
              Replay intro
            </button>
          </div>
        )}

        {tab === "tracker" && (
          <Tracker T={T} sessionLog={sessionLog} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} />
        )}

        {viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setViewingItem(null)}>
            <div className="rounded-2xl p-6 w-full max-w-sm flex flex-col items-center relative"
              style={{ background: T.cardBg, maxHeight: "85vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setViewingItem(null)} className="absolute top-4 right-4" style={{ color: T.textDim }}>
                <X size={18} />
              </button>
              <div style={{ background: SKY.cosmos, borderRadius: 14, padding: 10 }}>
                <Constellation item={viewingItem} progress={1} size={120} glow />
              </div>
              <h3 className="text-xl mt-3" style={{ fontFamily: "Georgia, serif", color: T.text }}>{viewingItem.name}</h3>
              <p className="text-xs mb-3" style={{ color: tierColor(viewingItem.tier), fontFamily: "system-ui, sans-serif" }}>
                {viewingItem.pantheonLabel} · {viewingItem.tier}
              </p>
              <p className="text-sm leading-relaxed text-center" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
                {viewingItem.lore}
              </p>
              <button
                onClick={() => setCompanionId(companionId === viewingItem.id ? null : viewingItem.id)}
                className="mt-5 rounded-full px-5 py-2.5 text-sm flex items-center gap-2"
                style={{ background: companionId === viewingItem.id ? "transparent" : SKY.gold,
                  border: companionId === viewingItem.id ? `1px solid ${T.cardBorder}` : "none",
                  color: companionId === viewingItem.id ? T.textDim : SKY.cosmos,
                  fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
                <Star size={14} fill={companionId === viewingItem.id ? "none" : SKY.cosmos} />
                {companionId === viewingItem.id ? "Remove as companion" : "Set as companion"}
              </button>
            </div>
          </div>
        )}

        {spendCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setSpendCelebration(null)}>
            <div className="rounded-2xl px-6 py-7 w-full max-w-sm flex flex-col items-center"
              style={{ background: T.cardBg, border: "1px solid rgba(232,197,71,0.25)" }}
              onClick={(e) => e.stopPropagation()}>
              <Sparkles size={28} color={SKY.gold} />
              <p className="mt-3 text-sm text-center" style={{ color: T.textDim, fontFamily: "system-ui, sans-serif" }}>
                Charted with banked points
              </p>
              <div className="mt-5 flex flex-col items-center">
                <div style={{ background: SKY.cosmos, borderRadius: 14, padding: 10 }}>
                  <Constellation item={spendCelebration} progress={1} size={140} glow />
                </div>
                <p className="mt-3 text-xl" style={{ fontFamily: "Georgia, serif", color: SKY.coral }}>{spendCelebration.name}</p>
                <p className="text-xs" style={{ color: tierColor(spendCelebration.tier), fontFamily: "system-ui, sans-serif" }}>
                  {spendCelebration.pantheonLabel} · {spendCelebration.tier}
                </p>
              </div>
              <button onClick={() => setSpendCelebration(null)} className="mt-6 rounded-full px-6 py-2 text-sm"
                style={{ background: SKY.gold, color: SKY.cosmos, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
                Continue
              </button>
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 flex justify-center">
          <div className="w-full max-w-md flex justify-around py-4 px-6" style={{ background: T.navBg, borderTop: `1px solid ${T.cardBorder}` }}>
            <button onClick={() => setTab("focus")} className="flex flex-col items-center gap-1" style={{ color: tab === "focus" ? T.gold : T.textDim }}>
              <Star size={18} fill={tab === "focus" ? T.gold : "none"} />
              <span className="text-[10px]" style={{ fontFamily: "system-ui, sans-serif" }}>Focus</span>
            </button>
            <button onClick={() => setTab("codex")} className="flex flex-col items-center gap-1" style={{ color: tab === "codex" ? T.gold : T.textDim }}>
              <Sparkles size={18} />
              <span className="text-[10px]" style={{ fontFamily: "system-ui, sans-serif" }}>Codex</span>
            </button>
            <button onClick={() => setTab("tracker")} className="flex flex-col items-center gap-1" style={{ color: tab === "tracker" ? T.gold : T.textDim }}>
              <Calendar size={18} />
              <span className="text-[10px]" style={{ fontFamily: "system-ui, sans-serif" }}>Tracker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
