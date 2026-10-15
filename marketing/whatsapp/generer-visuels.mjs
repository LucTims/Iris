// Génère les visuels WhatsApp Business d'Iris (profil, couverture, catalogue).
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const [, , outDir, repo] = process.argv;
const here = path.dirname(new URL(import.meta.url).pathname);
const fs_ = (p) => `data:font/woff2;base64,${fs.readFileSync(path.join(here, 'node_modules/@fontsource', p)).toString('base64')}`;
const img = (name) => `data:image/webp;base64,${fs.readFileSync(path.join(repo, 'public/showcase', name)).toString('base64')}`;

const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862', line: '#E6E2DC', warm: '#F1ECE6' };

const fonts = [200, 400, 500, 600, 700, 800].map((w) =>
  `@font-face{font-family:Jakarta;font-weight:${w};src:url(${fs_(`plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff2`)})}`
).join('') + [400, 500].map((w) =>
  `@font-face{font-family:Newsreader;font-weight:${w};src:url(${fs_(`newsreader/files/newsreader-latin-${w}-normal.woff2`)})}` +
  `@font-face{font-family:Newsreader;font-style:italic;font-weight:${w};src:url(${fs_(`newsreader/files/newsreader-latin-${w}-italic.woff2`)})}`
).join('');

// Signe Iris (public/iris-mark.svg), couleurs paramétrables.
const mark = (h, body = C.brand, pupil = C.ink) => `
<svg viewBox="0 0 59 271" height="${h}" style="display:block">
  <circle cx="29" cy="29" r="29" fill="${body}"/>
  <circle cx="29" cy="29" r="15" fill="${pupil}"/>
  <path d="M54 75 5 118l9 153h29z" fill="${body}"/>
</svg>`;

const page = (w, h, body, extraCss = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Jakarta,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.serif{font-family:Newsreader,serif}
${extraCss}
</style></head><body>${body}</body></html>`;

const wordmark = (color, size = 34) =>
  `<span style="font-weight:700;font-size:${size}px;letter-spacing:-0.02em;color:${color}">Iris</span>`;

const designs = [];

// ---------- Photos de profil (1080×1080, affichées en cercle) ----------
const profile = (name, bg, body, pupil) => designs.push({
  name, w: 1080, h: 1080,
  html: page(1080, 1080, `<div style="width:100%;height:100%;background:${bg};display:flex;align-items:center;justify-content:center">
    ${mark(640, body, pupil)}</div>`),
});
profile('profil-clair', C.ground, C.brand, C.ink);
profile('profil-terracotta', C.brand, C.ground, C.ink);
profile('profil-sombre', C.ink, C.brand, C.ink);

// ---------- Couverture (1640×856) ----------
designs.push({
  name: 'couverture', w: 1640, h: 856,
  html: page(1640, 856, `
  <div style="width:100%;height:100%;background:${C.ground};display:flex;position:relative">
    <div style="flex:1;padding:120px 0 0 150px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:44px">
        ${mark(58)}${wordmark(C.ink, 36)}
        <span style="width:1px;height:28px;background:${C.line};margin:0 6px"></span>
        <span style="font-size:20px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${C.brand}">Service client</span>
      </div>
      <h1 class="serif" style="font-weight:400;font-size:86px;line-height:1.02;letter-spacing:-0.02em">
        Écrivez le livre<br>que vous portez<br><em style="color:${C.brand}">en vous.</em></h1>
      <p style="margin-top:40px;font-size:26px;line-height:1.5;color:${C.muted};max-width:560px">
        Une question sur Iris ? Écrivez-nous ici, notre équipe vous répond.</p>
    </div>
    <div style="width:600px;padding:90px 130px 90px 0">
      <div style="width:100%;height:100%;border-radius:28px;overflow:hidden;background:url(${img('roman-litteraire.webp')}) center 30%/cover"></div>
    </div>
  </div>`),
});

// ---------- Catalogue (1080×1080) ----------
const packs = [
  { file: 'catalogue-1-pack-starter', name: 'Starter', price: '1 000', coins: '900', pages: '≈ 45', bonus: null,
    desc: 'Pour découvrir Iris et écrire un premier livre court.', theme: 'light' },
  { file: 'catalogue-2-pack-createur', name: 'Créateur', price: '3 500', coins: '4 000', pages: '≈ 200', bonus: '+500',
    desc: 'Un livre complet et des couvertures HD.', theme: 'brand', tag: 'Le plus choisi' },
  { file: 'catalogue-3-pack-auteur-pro', name: 'Auteur Pro', price: '5 000', coins: '7 500', pages: '≈ 375', bonus: '+2 500',
    desc: 'Pour les auteurs réguliers, la plus haute qualité.', theme: 'dark' },
];

for (const p of packs) {
  const t = {
    light: { bg: C.ground, fg: C.ink, mut: C.muted, line: C.line, mk: [C.brand, C.ink], acc: C.brand },
    brand: { bg: C.brand, fg: '#FFFFFF', mut: 'rgba(255,255,255,.78)', line: 'rgba(255,255,255,.28)', mk: [C.ground, C.ink], acc: '#FFFFFF' },
    dark: { bg: C.ink, fg: C.ground, mut: 'rgba(248,248,247,.62)', line: 'rgba(248,248,247,.16)', mk: [C.brand, C.ink], acc: C.brand },
  }[p.theme];
  const stat = (v, l) => `<div style="flex:1"><div style="font-size:44px;font-weight:700;letter-spacing:-0.02em">${v}</div>
    <div style="font-size:22px;color:${t.mut};margin-top:6px">${l}</div></div>`;
  designs.push({
    name: p.file, w: 1080, h: 1080,
    html: page(1080, 1080, `
    <div style="width:100%;height:100%;background:${t.bg};color:${t.fg};padding:96px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">${mark(54, ...t.mk)}${wordmark(t.fg, 34)}</div>
        ${p.tag ? `<span style="font-size:20px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:14px 24px;border-radius:999px;background:${C.ground};color:${C.brand}">${p.tag}</span>` : ''}
      </div>
      <div style="margin-top:auto">
        <div style="font-size:22px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${t.acc}">Pack</div>
        <div class="serif" style="font-size:118px;line-height:1;letter-spacing:-0.02em;margin-top:10px">${p.name}</div>
        <div style="font-size:28px;color:${t.mut};margin-top:22px;max-width:760px;line-height:1.4">${p.desc}</div>
      </div>
      <div style="display:flex;align-items:baseline;gap:18px;margin-top:56px">
        <span style="font-size:150px;font-weight:800;letter-spacing:-0.045em;line-height:.9">${p.price.replace(' ', '<span style="display:inline-block;width:.24em"></span>')}</span>
        <span style="font-size:40px;font-weight:600;color:${t.mut}">FCFA</span>
      </div>
      <div style="display:flex;gap:40px;margin-top:56px;padding-top:40px;border-top:2px solid ${t.line}">
        ${stat(p.coins, 'pièces')}${stat(p.pages, 'pages')}${p.bonus ? stat(p.bonus, 'pièces offertes') : stat('Sans', 'abonnement')}
      </div>
    </div>`),
  });
}

// Carte « Découvrir Iris »
designs.push({
  name: 'catalogue-0-decouvrir-iris', w: 1080, h: 1080,
  html: page(1080, 1080, `
  <div style="width:100%;height:100%;background:${C.ground};display:flex;flex-direction:column">
    <div style="height:500px;display:flex;gap:16px;padding:16px 16px 0">
      <div style="flex:1;border-radius:24px;background:url(${img('poesie-echos-du-coeur.webp')}) center/cover"></div>
      <div style="flex:1;border-radius:24px;background:url(${img('cuisine-africaine.webp')}) center/cover"></div>
      <div style="flex:1;border-radius:24px;background:url(${img('business-strategie.webp')}) center/cover"></div>
    </div>
    <div style="flex:1;padding:64px 96px 88px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:14px">${mark(50)}${wordmark(C.ink, 32)}</div>
      <div class="serif" style="font-size:84px;line-height:1.02;letter-spacing:-0.02em;margin-top:32px">De l’idée au <em style="color:${C.brand}">livre fini.</em></div>
      <div style="font-size:28px;line-height:1.45;color:${C.muted};margin-top:24px;max-width:820px">Écrivez, corrigez et publiez votre livre avec l’IA, à votre rythme.</div>
      <div style="margin-top:auto;display:flex;gap:14px;flex-wrap:wrap">
        ${['Écriture', 'Correction', 'Couverture', 'Export PDF'].map((s) =>
          `<span style="font-size:24px;font-weight:600;padding:14px 26px;border-radius:999px;border:2px solid ${C.line};color:${C.ink}">${s}</span>`).join('')}
      </div>
    </div>
  </div>`),
});

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
fs.mkdirSync(outDir, { recursive: true });
for (const d of designs) {
  const pg = await browser.newPage({ viewport: { width: d.w, height: d.h } });
  await pg.setContent(d.html, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(outDir, `${d.name}.png`) });
  await pg.close();
  console.log('ok', d.name);
}
await browser.close();
