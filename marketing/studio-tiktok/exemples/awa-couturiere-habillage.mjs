// Habillages propres à la vidéo « De la couture au livre : l'histoire d'Awa » :
// pastille « personnage d'exemple », bulle finale, étiquette du vrai site d'Iris.
// Usage (sandbox Higgsfield) : node awa-couturiere-habillage.mjs <dossier-sortie>
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
const exemple = page(`
<div style="position:absolute;left:72px;top:250px;display:flex;align-items:center;gap:14px;padding:16px 30px 16px 18px;border-radius:999px;background:${C.ground};box-shadow:0 10px 30px rgba(0,0,0,.25)">
  <div style="background:${C.brand};color:#fff;font-size:24px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:6px 16px">EXEMPLE</div>
  <div style="font-size:30px;font-weight:800;color:${C.ink}">Awa, couturière à Abidjan</div>
</div>`);
const comment = page(`
<div style="position:absolute;left:72px;right:150px;top:240px">
  <div style="position:relative;background:${C.ground};border-radius:32px;padding:30px 36px 34px;box-shadow:0 14px 44px rgba(0,0,0,.35)">
    <div style="font-size:26px;font-weight:600;color:${C.muted}">💬 Dis-moi en commentaire</div>
    <div style="font-family:N;font-size:62px;line-height:1.05;color:${C.ink};margin-top:6px">Quelle compétence rêves-tu de <em style="color:${C.brand}">monétiser&nbsp;?</em></div>
    <div style="position:absolute;left:70px;bottom:-26px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-top:28px solid ${C.ground}"></div>
  </div>
</div>`);
// Étiquette posée sur le plan du vrai site (web-iris.mp4, défilement de la page d'accueil en vue mobile).
const pill = page(`
<div style="position:absolute;left:0;right:0;top:1440px;display:flex;justify-content:center"><div style="display:flex;align-items:center;gap:16px;padding:14px 30px 14px 14px;border-radius:999px;background:${C.ground};box-shadow:0 10px 30px rgba(0,0,0,.4)">
<div style="background:${C.brand};color:#fff;font-size:26px;font-weight:800;border-radius:999px;padding:8px 18px">irisboom.online</div>
<div style="font-size:30px;font-weight:800;color:${C.ink}">Le vrai site d'Iris</div></div></div>`);
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const shot = async (html, file) => {
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, file), omitBackground: true });
};
fs.mkdirSync(out, { recursive: true });
await shot(exemple, 'exemple.png');
await shot(comment, 'comment.png');
await shot(pill, 'pill-web.png');
await b.close();
console.log('habillage Awa ok');
