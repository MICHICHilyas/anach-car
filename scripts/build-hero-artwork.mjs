/**
 * Génère les visuels de secours du Hero.
 *
 * Ces silhouettes grand format (1200 × 520) tiennent la comparaison à la
 * taille d'un Hero, là où les vignettes du catalogue ne le peuvent pas.
 * Elles sont conçues pour être REMPLACÉES par de vraies photos dès que
 * l'agence en fournit : voir src/config/hero.ts.
 */
import { writeFileSync } from "node:fs";

const W = 1200;
const H = 520;
const GROUND = 430;

/** Profils latéraux, du plus bas au plus haut de caisse. */
const BODIES = {
  citadine: {
    path: `M 96 402
      C 74 360, 84 320, 128 304
      L 236 286
      C 274 280, 298 266, 318 242
      L 378 174
      C 398 150, 426 138, 462 136
      L 676 132
      C 728 132, 768 144, 798 170
      L 872 234
      L 1000 252
      C 1066 260, 1102 294, 1106 342
      C 1109 374, 1100 396, 1078 402 Z`,
    wheels: [
      { cx: 312, r: 76 },
      { cx: 884, r: 76 },
    ],
    windows: [
      `M 400 186 L 452 160 L 630 156 L 630 214 L 396 218 Z`,
      `M 660 156 L 776 160 L 838 218 L 660 216 Z`,
    ],
  },
  berline: {
    path: `M 84 404
      C 62 362, 72 320, 116 302
      L 232 282
      C 272 276, 296 262, 316 238
      L 388 178
      C 410 158, 440 148, 478 146
      L 728 142
      C 780 142, 818 154, 846 180
      L 918 244
      L 1044 258
      C 1112 266, 1134 296, 1136 342
      C 1138 376, 1126 398, 1102 404 Z`,
    wheels: [
      { cx: 306, r: 74 },
      { cx: 912, r: 74 },
    ],
    windows: [
      `M 408 192 L 468 168 L 660 164 L 660 220 L 404 224 Z`,
      `M 692 164 L 820 168 L 886 224 L 692 222 Z`,
    ],
  },
  suv: {
    path: `M 90 394
      C 70 348, 80 300, 126 282
      L 236 262
      C 274 256, 296 240, 314 214
      L 372 132
      C 392 106, 420 92, 458 90
      L 748 86
      C 802 86, 842 100, 872 128
      L 946 202
      L 1060 220
      C 1124 230, 1152 268, 1154 320
      C 1156 358, 1144 386, 1118 394 Z`,
    wheels: [
      { cx: 312, r: 92 },
      { cx: 916, r: 92 },
    ],
    windows: [
      `M 396 146 L 452 116 L 668 112 L 668 184 L 392 188 Z`,
      `M 700 112 L 848 118 L 916 188 L 700 186 Z`,
    ],
  },
  utilitaire: {
    path: `M 88 396
      C 68 350, 78 302, 122 284
      L 220 264
      C 254 258, 274 242, 290 216
      L 336 132
      C 352 106, 378 92, 414 90
      L 470 88
      C 498 88, 516 106, 516 134
      L 516 218
      L 1064 224
      C 1126 230, 1156 266, 1158 318
      C 1160 356, 1148 388, 1122 396 Z`,
    wheels: [
      { cx: 300, r: 82 },
      { cx: 930, r: 82 },
    ],
    windows: [`M 350 144 L 400 118 L 486 116 L 486 190 L 346 194 Z`],
  },
};

function svg(name, body) {
  const wheels = body.wheels
    .map(
      (w) => `
    <g>
      <circle cx="${w.cx}" cy="${GROUND - w.r + 46}" r="${w.r}" fill="#04212e"/>
      <circle cx="${w.cx}" cy="${GROUND - w.r + 46}" r="${w.r}" fill="none" stroke="url(#rim)" stroke-width="6"/>
      <circle cx="${w.cx}" cy="${GROUND - w.r + 46}" r="${w.r * 0.46}" fill="none" stroke="url(#rim)" stroke-width="9" opacity=".85"/>
      <circle cx="${w.cx}" cy="${GROUND - w.r + 46}" r="${w.r * 0.13}" fill="#3fbdb6" opacity=".9"/>
    </g>`,
    )
    .join("");

  const arches = body.wheels
    .map(
      (w) =>
        `<circle cx="${w.cx}" cy="${GROUND - w.r + 46}" r="${w.r + 14}" fill="#000"/>`,
    )
    .join("");

  const windows = body.windows
    .map((d) => `<path d="${d}" fill="url(#glass)" opacity=".55"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"
     aria-label="Illustration d'un véhicule ${name}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eaf7f6"/>
      <stop offset="0.45" stop-color="#9fd8d4"/>
      <stop offset="1" stop-color="#1c7f80"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#06202c"/>
      <stop offset="1" stop-color="#0c4e56"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bfeae7"/>
      <stop offset="1" stop-color="#2b8f8c"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#17a29c" stop-opacity=".38"/>
      <stop offset="1" stop-color="#17a29c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#02141d" stop-opacity=".65"/>
      <stop offset="1" stop-color="#02141d" stop-opacity="0"/>
    </radialGradient>
    <mask id="arches">
      <rect width="${W}" height="${H}" fill="#fff"/>
      ${arches}
    </mask>
  </defs>

  <!-- Halo : ancre la voiture dans le fond sombre du Hero -->
  <ellipse cx="620" cy="290" rx="540" ry="250" fill="url(#halo)"/>
  <!-- Ombre portée au sol -->
  <ellipse cx="620" cy="${GROUND + 62}" rx="470" ry="34" fill="url(#shadow)"/>

  <g mask="url(#arches)">
    <path d="${body.path}" fill="url(#body)"/>
    ${windows}
    <!-- Ligne de caisse : reflet le long du flanc -->
    <path d="${body.path}" fill="none" stroke="#ffffff" stroke-width="2.5" opacity=".35"/>
  </g>
  ${wheels}
</svg>
`;
}

for (const [name, body] of Object.entries(BODIES)) {
  const file = `public/images/hero/${name}.svg`;
  writeFileSync(file, svg(name, body));
  console.log(`  ${file}`);
}
console.log("Visuels de secours du Hero générés.");
