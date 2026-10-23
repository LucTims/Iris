// Carrousel « Ton métier vaut un livre : la preuve en 7 exemples » (1080×1440).
// Une photo générée par métier, le titre du livre qu'il pourrait écrire et son public.
// Usage : node carrousel-7-metiers.mjs <dossier> (attend <dossier>/fonts/ et <dossier>/img/*.png)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '/'));
const pw = require('playwright');

const dir = process.argv[2] || '.';
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'fonts', n)).toString('base64')}`;
const img = (n) => `data:image/png;base64,${fs.readFileSync(path.join(dir, 'img', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862' };
const css = `@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:J;font-weight:600;src:url(${f('plus-jakarta-sans-latin-600-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1440px;overflow:hidden}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased}`;
const page = (body, bg = '#000') => `<!doctype html><html><head><meta charset="utf-8"><style>${css} body{background:${bg}}</style></head><body>${body}</body></html>`;
const mark = (h, ring = C.brand, pupil = C.ink, stem = ring) => `<svg viewBox="0 0 59 271" height="${h}" style="display:block"><circle cx="29" cy="29" r="29" fill="${ring}"/><circle cx="29" cy="29" r="15" fill="${pupil}"/><path d="M54 75 5 118l9 153h29z" fill="${stem}"/></svg>`;
const shadow = 'text-shadow:0 2px 3px rgba(0,0,0,.55),0 0 18px rgba(0,0,0,.45),0 0 2px rgba(0,0,0,.8)';
const pill = (t) => `<div style="display:inline-block;background:${C.brand};color:#fff;font-size:28px;font-weight:800;letter-spacing:.08em;padding:10px 24px;border-radius:999px;margin-bottom:20px;box-shadow:0 6px 20px rgba(0,0,0,.3);text-shadow:none">${t}</div>`;
const photo = (src, pos = 'center') => `<img src="${img(src)}" style="position:absolute;inset:0;width:1080px;height:1440px;object-fit:cover;object-position:${pos}">
<div style="position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.18) 70%,rgba(0,0,0,0))"></div>`;
const counter = (n) => `<div style="position:absolute;right:44px;top:44px;font-size:26px;font-weight:800;color:#fff;opacity:.9;${shadow}">${n}/9</div>`;

const METIERS = [
  ['couturiere.png', 'Couturière', 'Coudre sans patron : 30 modèles de boubous pas à pas', 'les apprenties couturières', 'center 20%'],
  ['eleveur.png', 'Éleveur', 'Réussir son élevage de poulets de chair', 'les jeunes qui veulent se lancer', 'center 30%'],
  ['comptable.png', 'Comptable', 'Les impôts de ta petite entreprise, expliqués simplement', 'les commerçants et entrepreneurs', 'center 30%'],
  ['coiffeuse.png', 'Coiffeuse', 'Tresses africaines : le guide complet de l’apprentie', 'les apprenties et les salons', 'center 30%'],
  ['infirmiere.png', 'Infirmière', 'Premiers secours à la maison : les gestes qui sauvent', 'les parents et les nounous', 'center 30%'],
  ['mecanicien.png', 'Mécanicien', 'Entretenir sa moto soi-même (et ne plus se faire arnaquer)', 'les conducteurs de moto-taxi', 'center 30%'],
  ['cuisiniere.png', 'Cuisinière', 'Lancer son maquis : 40 recettes qui font revenir les clients', 'ceux qui veulent ouvrir leur restaurant', 'center 30%'],
];

// Mise en page éditoriale : le texte dans un bandeau crème en haut, la photo en dessous,
// pour ne jamais masquer un visage.
const BAND = 540;
const metierSlide = ([src, name, title, reader, pos], i) => page(`
<img src="${img(src)}" style="position:absolute;left:0;top:${BAND}px;width:1080px;height:${1440 - BAND}px;object-fit:cover;object-position:${pos}">
<div style="position:absolute;left:0;right:0;top:0;height:${BAND}px;background:${C.ground};border-bottom:10px solid ${C.brand}"></div>
<div style="position:absolute;right:44px;top:44px;font-size:26px;font-weight:800;color:${C.muted}">${i + 2}/9</div>
<div style="position:absolute;left:64px;right:64px;top:64px;color:${C.ink}">
  ${pill(`MÉTIER N°${i + 1}`)}
  <div style="font-size:96px;font-weight:800;line-height:1;letter-spacing:-.01em">${name}</div>
  <div style="font-size:26px;font-weight:800;letter-spacing:.08em;color:${C.brand};margin-top:30px">📖 SON LIVRE</div>
  <div style="font-family:N;font-style:italic;font-size:54px;line-height:1.08;margin-top:8px">« ${title} »</div>
</div>
<div style="position:absolute;left:0;right:0;bottom:70px;display:flex;justify-content:center">
  <div style="display:flex;align-items:center;gap:14px;padding:16px 30px 16px 16px;border-radius:999px;background:${C.ground};box-shadow:0 10px 30px rgba(0,0,0,.4)">
    <div style="background:${C.ink};color:#fff;font-size:24px;font-weight:800;letter-spacing:.06em;border-radius:999px;padding:8px 18px">QUI L’ACHÈTE</div>
    <div style="font-size:32px;font-weight:800;color:${C.ink}">${reader}</div>
  </div>
</div>`);

const cover = page(`${photo('couverture.png')}${counter(1)}
<div style="position:absolute;left:60px;right:60px;top:120px;text-align:center;color:#fff;${shadow}">
  ${pill('À ENREGISTRER 📌')}
  <div style="font-size:104px;font-weight:800;line-height:1.02">Ton métier<br>vaut un <span style="background:${C.brand};text-shadow:none;padding:0 16px;border-radius:16px">livre.</span></div>
  <div style="font-family:N;font-style:italic;font-size:62px;line-height:1.1;margin-top:30px">La preuve en 7 exemples</div>
</div>
<div style="position:absolute;left:0;right:0;bottom:80px;display:flex;justify-content:center">
  <div style="padding:16px 34px;border-radius:999px;background:${C.ground};font-size:32px;font-weight:800;color:${C.ink};box-shadow:0 10px 30px rgba(0,0,0,.4)">Glisse pour voir le tien 👉</div>
</div>`);

const fin = page(`${counter(9)}
<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;color:${C.ground}">
  ${mark(230, C.ground, C.ink, C.ground)}
  <div style="font-size:72px;font-weight:800;line-height:1.08;margin-top:64px">Ton métier n’est pas dans la liste ?</div>
  <div style="font-family:N;font-style:italic;font-size:60px;line-height:1.12;margin-top:34px">Écris-le en commentaire 👇<br>je te propose le titre de ton livre.</div>
  <div style="margin-top:70px;padding:16px 36px;border-radius:999px;background:${C.ground};color:${C.brand};font-size:34px;font-weight:800">irisboom.online</div>
</div>`, C.brand);

const slides = [['01-couverture', cover], ...METIERS.map((m, i) => [`${String(i + 2).padStart(2, '0')}-${path.basename(m[0], '.png')}`, metierSlide(m, i)]), ['09-fin', fin]];

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1440 } });
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
for (const [name, html] of slides) {
  await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(dir, 'out', `${name}.jpg`), type: 'jpeg', quality: 92 });
  console.log('ok', name);
}
await b.close();
