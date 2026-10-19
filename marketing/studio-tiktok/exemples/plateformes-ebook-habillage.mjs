// Habillages propres à la vidéo « 5 plateformes pour vendre ton ebook » :
// cartes Plateforme N°1 à 5, pastille « Enregistre », question finale en commentaire.
// Usage (sandbox Higgsfield) : node plateformes-ebook-habillage.mjs <dossier-sortie>
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join('fonts', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862' };
const css = `
@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:J;font-weight:600;src:url(${f('plus-jakarta-sans-latin-600-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased}`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

const PLATFORMS = [
  ['Chariow', 'Mobile money · sans abonnement'],
  ['Maketou', 'Simple · un lien à partager'],
  ['Systeme.io', 'Tunnel de vente · e-mails'],
  ['Selar', 'Vendre au-delà de ton pays'],
  ['Amazon Kindle', 'Ton livre dans le monde entier'],
];

// Carte en haut de l'écran : numéro, nom de la plateforme, atout principal, progression 1 à 5.
const card = (n, name, perk) => page(`
<div style="position:absolute;left:72px;right:150px;top:240px;display:flex;align-items:stretch;border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)">
  <div style="background:${C.brand};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 30px">
    <div style="font-size:20px;font-weight:800;letter-spacing:.14em">N°</div>
    <div style="font-family:N;font-size:104px;line-height:.9">${n}</div>
  </div>
  <div style="flex:1;background:${C.ground};padding:22px 30px;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:20px;font-weight:800;letter-spacing:.14em;color:${C.muted}">PLATEFORME</div>
    <div style="font-family:N;font-size:66px;line-height:1.05;color:${C.ink}">${name}</div>
    <div style="margin-top:10px;font-size:26px;font-weight:800;color:${C.brand}">${perk}</div>
    <div style="margin-top:14px;display:flex;gap:8px">${[1, 2, 3, 4, 5].map((k) =>
      `<div style="height:8px;flex:1;border-radius:4px;background:${k <= n ? C.brand : '#E4E1DC'}"></div>`).join('')}</div>
  </div>
</div>`);

const save = page(`
<div style="position:absolute;left:72px;top:250px;display:flex;align-items:center;gap:16px;padding:18px 32px 18px 22px;border-radius:999px;background:${C.ground};box-shadow:0 10px 30px rgba(0,0,0,.25)">
  <div style="font-size:46px">📌</div>
  <div style="font-size:34px;font-weight:800;color:${C.ink}">Enregistre cette vidéo</div>
</div>`);

// Question finale : bulle de commentaire avec les 5 noms.
const comment = page(`
<div style="position:absolute;left:72px;right:150px;top:240px">
  <div style="position:relative;background:${C.ground};border-radius:32px;padding:30px 36px 34px;box-shadow:0 14px 44px rgba(0,0,0,.35)">
    <div style="font-size:26px;font-weight:600;color:${C.muted}">💬 Dis-moi en commentaire</div>
    <div style="font-family:N;font-size:62px;line-height:1.05;color:${C.ink};margin-top:6px">Lesquelles tu <em style="color:${C.brand}">connaissais&nbsp;?</em></div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">${PLATFORMS.map(([p]) =>
      `<div style="font-size:24px;font-weight:800;color:${C.ink};border:3px solid ${C.ink};border-radius:999px;padding:6px 16px">${p}</div>`).join('')}</div>
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
for (const [i, [name, perk]] of PLATFORMS.entries()) await shot(card(i + 1, name, perk), `card${i + 1}.png`);
await shot(save, 'save.png');
await shot(comment, 'comment.png');
await b.close();
console.log('habillage plateformes ok');
