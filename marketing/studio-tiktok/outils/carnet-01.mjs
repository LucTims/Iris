// Carrousel « Les carnets d'Iris » N°1 (1080×1920, 7 slides).
// Usage (sandbox Higgsfield) : node carnet-01.mjs <dossier-sortie>
// Polices attendues dans ./fonts (Plus Jakarta Sans 400/600/700/800, Newsreader 400 normal/italique).
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
const ff = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join('fonts', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862', line: '#E6E2DC' };
const fonts = [400, 600, 700, 800].map((w) =>
  `@font-face{font-family:Jakarta;font-weight:${w};src:url(${ff(`plus-jakarta-sans-latin-${w}-normal.woff2`)})}`).join('') +
  `@font-face{font-family:Newsreader;font-weight:400;src:url(${ff('newsreader-latin-400-normal.woff2')})}` +
  `@font-face{font-family:Newsreader;font-style:italic;font-weight:400;src:url(${ff('newsreader-latin-400-italic.woff2')})}`;
const mark = (h, body = C.brand, pupil = C.ink) => `
<svg viewBox="0 0 59 271" height="${h}" style="display:block">
  <circle cx="29" cy="29" r="29" fill="${body}"/>
  <circle cx="29" cy="29" r="15" fill="${pupil}"/>
  <path d="M54 75 5 118l9 153h29z" fill="${body}"/>
</svg>`;
const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Jakarta,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.serif{font-family:Newsreader,serif}
</style></head><body>${body}</body></html>`;

const W = 1080, H = 1920;

// ---------- Carrousel « Les carnets d'Iris » ----------
const slideShell = (n, total, inner, bg = C.ground, fg = C.ink) => page(W, H, `
<div style="width:100%;height:100%;background:${bg};color:${fg};position:relative;padding:210px 120px 0 96px;display:flex;flex-direction:column">
  <div style="display:flex;align-items:center;gap:14px">${mark(46, bg === C.brand ? C.ground : C.brand, C.ink)}
    <span style="font-size:22px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;opacity:.75">Les carnets d’Iris · N°1</span></div>
  <div style="flex:0 0 1230px;display:flex;flex-direction:column;justify-content:center">${inner}</div>
  <div style="position:absolute;left:96px;top:1520px;display:flex;gap:10px">
    ${Array.from({ length: total }, (_, i) => `<span style="width:${i === n ? 44 : 14}px;height:14px;border-radius:7px;background:${i === n ? (bg === C.brand ? C.ground : C.brand) : (bg === C.ground ? C.line : 'rgba(255,255,255,.3)')}"></span>`).join('')}
  </div>
</div>`);

const signs = [
  ['Il commence par', '« Dans un monde en constante évolution… »', 'Ton lecteur décroche avant la fin de la première page.'],
  ['Aucun exemple vécu.', 'Que des généralités.', 'Or c’est ton histoire qui rend ton livre crédible.'],
  ['La même idée revient', 'au chapitre 2… et au chapitre 4.', 'Ton lecteur a l’impression de tourner en rond.'],
  ['On ne sait pas', 'à qui il parle.', 'Un débutant et un expert n’ont pas besoin des mêmes mots.'],
  ['Et surtout :', 'on ne t’y retrouve pas.', 'Ni ta voix, ni ta façon d’expliquer, ni ce qui te rend unique.'],
];
const total = signs.length + 2;
const designs2 = [];
designs2.push({ name: 'carrousel-01-couverture', html: slideShell(0, total, `
  <div style="margin-top:0">
    <div style="font-size:40px;color:${C.muted};line-height:1.4;margin-bottom:48px">Tu as relu ton ebook à 1 h du matin…<br>et quelque chose clochait ?</div>
    <div class="serif" style="font-size:148px;line-height:1;letter-spacing:-0.025em">5 signes que ton ebook a été écrit <em style="color:${C.brand}">par une IA.</em></div>
    <div style="margin-top:70px;font-size:30px;font-weight:700;color:${C.brand}">Glisse  →</div>
  </div>`) });
signs.forEach(([a, b, c], i) => {
  const dark = i === signs.length - 1;
  designs2.push({ name: `carrousel-0${i + 2}-signe-${i + 1}`, html: slideShell(i + 1, total, `
  <div style="margin-top:0">
    <div class="serif" style="font-size:300px;line-height:.8;color:${dark ? C.ground : C.brand};opacity:${dark ? .9 : 1}">${i + 1}</div>
    <div style="font-size:72px;font-weight:800;line-height:1.12;letter-spacing:-0.02em;margin-top:70px">${a}</div>
    <div class="serif" style="font-size:84px;line-height:1.08;font-style:italic;margin-top:12px;color:${dark ? C.ground : C.ink}">${b}</div>
    <div style="font-size:40px;line-height:1.45;margin-top:56px;max-width:820px;color:${dark ? 'rgba(255,255,255,.85)' : C.muted}">${c}</div>
  </div>`, dark ? C.brand : C.ground, dark ? '#FFFFFF' : C.ink) });
});
designs2.push({ name: 'carrousel-07-fin', html: slideShell(total - 1, total, `
  <div style="margin-top:0">
    <div style="font-size:40px;line-height:1.4;color:rgba(248,248,247,.7)">Ce n’est pas toi le problème.<br>C’est la méthode.</div>
    <div class="serif" style="font-size:128px;line-height:1;letter-spacing:-0.025em;margin-top:56px">Ton savoir mérite <em style="color:${C.brand}">d’être lu.</em></div>
    <div style="margin-top:80px;display:inline-flex;align-items:center;gap:18px;padding:26px 40px;border-radius:999px;background:${C.brand};color:#fff;font-size:34px;font-weight:700">📌  Enregistre ce carnet</div>
    <div style="margin-top:36px;font-size:30px;color:rgba(248,248,247,.6)">Écris « DÉMO » sur notre WhatsApp</div>
  </div>`, C.ink, C.ground) });

const b = await pw.chromium.launch();
fs.mkdirSync(outDir, { recursive: true });
for (const d of designs2) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(d.html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(outDir, `${d.name}.png`) });
  await p.close();
}
await b.close();
console.log('carnet ok', designs2.length, 'slides');
