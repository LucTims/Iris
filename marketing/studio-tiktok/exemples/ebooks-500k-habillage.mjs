// Habillages propres à la vidéo « 3 ebooks pour viser 500K » :
// cartes Ebook N°1/2/3 avec le prix, pastille « Enregistre », grand « 500K » final.
// Usage (sandbox Higgsfield) : node ebooks-500k-habillage.mjs <dossier-sortie>
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join('fonts', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616' };
const css = `
@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:J;font-weight:600;src:url(${f('plus-jakarta-sans-latin-600-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased}`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

// Carte en haut de l'écran : numéro, titre court, fourchette de prix.
const card = (n, title, price) => page(`
<div style="position:absolute;left:72px;right:150px;top:240px;display:flex;align-items:stretch;border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)">
  <div style="background:${C.brand};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 30px">
    <div style="font-size:22px;font-weight:800;letter-spacing:.14em">EBOOK</div>
    <div style="font-family:N;font-size:96px;line-height:.9">${n}</div>
  </div>
  <div style="flex:1;background:${C.ground};padding:24px 30px;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:34px;font-weight:800;line-height:1.15;color:${C.ink}">${title}</div>
    <div style="margin-top:12px;display:inline-flex;align-self:flex-start;font-size:28px;font-weight:800;color:${C.brand};border:3px solid ${C.brand};border-radius:999px;padding:6px 18px">${price}</div>
  </div>
</div>`);

const save = page(`
<div style="position:absolute;left:72px;top:250px;display:flex;align-items:center;gap:16px;padding:18px 32px 18px 22px;border-radius:999px;background:${C.ground};box-shadow:0 10px 30px rgba(0,0,0,.25)">
  <div style="font-size:46px">📌</div>
  <div style="font-size:34px;font-weight:800;color:${C.ink}">Enregistre cette vidéo</div>
</div>`);

const cta = page(`
<div style="position:absolute;left:0;right:0;top:250px;display:flex;flex-direction:column;align-items:center;gap:18px">
  <div style="position:relative;background:${C.ground};border-radius:36px;padding:22px 56px 26px;box-shadow:0 14px 44px rgba(0,0,0,.35)">
    <div style="font-size:26px;font-weight:600;color:#6B6862;text-align:center">💬 Écris en commentaire</div>
    <div style="font-size:150px;font-weight:800;line-height:1;letter-spacing:-0.03em;color:${C.brand};text-align:center">500K</div>
    <div style="position:absolute;left:70px;bottom:-26px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-top:28px solid ${C.ground}"></div>
  </div>
</div>`);

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const shot = async (html, file) => {
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, file), omitBackground: true });
};
fs.mkdirSync(out, { recursive: true });
await shot(card('1', 'Vendre sur WhatsApp, TikTok & Facebook', '2 000 – 5 000 F'), 'card1.png');
await shot(card('2', 'Gérer son argent avec un petit revenu', '2 000 – 4 000 F'), 'card2.png');
await shot(card('3', 'Gagner sa vie avec les services en ligne', '3 000 – 7 000 F'), 'card3.png');
await shot(save, 'save.png');
await shot(cta, 'cta.png');
await b.close();
console.log('habillage 500K ok');
