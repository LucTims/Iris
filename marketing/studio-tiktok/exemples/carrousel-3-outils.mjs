// Carrousel « 3 outils pour créer et (vraiment) vendre tes produits digitaux en 2026 » (1080×1440).
// Photos de bureau générées avec un écran vierge, puis vraie page d'accueil de chaque outil
// incrustée en perspective (coins trouvés par outils/coins-ecran.py), et texte en haut sur le ciel.
// Usage (sandbox Higgsfield) : node carrousel-3-outils.mjs
// Attendus : fonts/, deskA.png, deskB.png, phone.png, corners.json, chariow.svg, tiktok.svg,
// home-iris.png, home-chariow.png (1440×838 @2x), home-tiktok.png (390×849 @2x, fil flouté).
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const f = (n) => `data:font/woff2;base64,${fs.readFileSync('fonts/' + n).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862' };
const css = `@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}`;
const page = (w, h, body, bg = 'transparent') => `<!doctype html><html><head><meta charset="utf-8"><style>${css} html,body{width:${w}px;height:${h}px;background:${bg}}</style></head><body>${body}</body></html>`;
const mark = (h, ring = C.brand, pupil = C.ink, stem = ring) => `<svg viewBox="0 0 59 271" height="${h}" style="display:block"><circle cx="29" cy="29" r="29" fill="${ring}"/><circle cx="29" cy="29" r="15" fill="${pupil}"/><path d="M54 75 5 118l9 153h29z" fill="${stem}"/></svg>`;
const chariow = `data:image/svg+xml;base64,${fs.readFileSync('chariow.svg').toString('base64')}`;
const tkPath = fs.readFileSync('tiktok.svg', 'utf8').match(/ d="([^"]+)"/)[1];
const tk = (s) => `<svg viewBox="-2 -2 28 28" width="${s}" height="${s}"><path d="${tkPath}" fill="#25F4EE" transform="translate(-0.7,-0.7)"/><path d="${tkPath}" fill="#FE2C55" transform="translate(0.7,0.7)"/><path d="${tkPath}" fill="#fff"/></svg>`;
const corners = JSON.parse(fs.readFileSync('corners.json', 'utf8'));

// Contenu des écrans, rendu à la taille de l'écran ×2.
const shot = (n, w, h) => page(w, h, `<img src="data:image/png;base64,${fs.readFileSync(`home-${n}.png`).toString('base64')}" style="width:${w}px;height:${h}px;object-fit:cover;object-position:top">`, '#fff');
const SCREENS = {
  // Pages d'accueil réelles, capturées le jour même (le fil TikTok est flouté : vidéos de tiers).
  iris: (w, h) => shot('iris', w, h),
  chariow: (w, h) => shot('chariow', w, h),
  tiktok: (w, h) => shot('tiktok', w, h),
  // Couverture : les trois outils en icônes d'application.
  trio: (w, h) => {
    const tile = (inner, bg) => `<div style="width:${h * .34}px;height:${h * .34}px;border-radius:${h * .07}px;background:${bg};display:flex;align-items:center;justify-content:center;box-shadow:0 ${h * .015}px ${h * .05}px rgba(0,0,0,.15)">${inner}</div>`;
    const lab = (t) => `<div style="font-size:${h * .055}px;font-weight:800;color:${C.ink};margin-top:${h * .04}px;text-align:center">${t}</div>`;
    const chariowIcon = `<div style="width:${h * .2}px;height:${h * .2}px;overflow:hidden"><img src="${chariow}" style="height:${h * .2}px;width:auto;max-width:none"></div>`;
    return page(w, h, `<div style="height:100%;display:flex;align-items:center;justify-content:center;gap:${w * .06}px">
      <div>${tile(mark(h * .24), C.ground)}${lab('Iris')}</div>
      <div>${tile(chariowIcon, '#fff')}${lab('Chariow')}</div>
      <div>${tile(tk(h * .2), '#000')}${lab('TikTok')}</div></div>`, '#EFE9E2');
  },
  fin: (w, h) => page(w, h, `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${h * .06}px">${mark(h * .45, C.ground, C.ink, C.ground)}<div style="font-size:${h * .075}px;font-weight:800;color:${C.ground}">irisboom.online</div></div>`, C.brand),
};

// Texte des diapositives, en haut sur le ciel.
const shadow = 'text-shadow:0 2px 3px rgba(0,0,0,.55),0 0 18px rgba(0,0,0,.45),0 0 2px rgba(0,0,0,.8)';
const pill = (t) => `<div style="display:inline-block;background:${C.brand};color:#fff;font-size:28px;font-weight:800;letter-spacing:.08em;padding:10px 24px;border-radius:999px;margin-bottom:22px;box-shadow:0 6px 20px rgba(0,0,0,.3)">${t}</div>`;
const text = (inner, top = 150) => `<div style="position:absolute;left:60px;right:60px;top:${top}px;text-align:center;color:#fff;${shadow}">${inner}</div>`;
const tool = (n, verb, name, line) => text(`${pill(`OUTIL N°${n} · ${verb}`)}<div style="font-size:84px;font-weight:800;line-height:1">${name}</div><div style="font-size:46px;font-weight:800;line-height:1.2;margin-top:14px">${line}</div>`, n === 3 ? 90 : 150);
const SLIDES = [
  ['01-couverture', 'deskB', 'trio', text(`${pill('À ENREGISTRER 📌')}<div style="font-size:64px;font-weight:800;line-height:1.12">3 outils pour créer et <span style="background:${C.brand};text-shadow:none;padding:0 12px;border-radius:12px">(vraiment)</span> vendre tes produits digitaux en 2026</div>`, 110)],
  ['02-iris', 'deskA', 'iris', tool(1, 'CRÉER', 'Iris', 'Écrire ton ebook : plan, chapitres et couverture')],
  ['03-chariow', 'deskA', 'chariow', tool(2, 'VENDRE', 'Chariow', 'Ta boutique + paiements en mobile money')],
  ['04-tiktok', 'phone', 'tiktok', tool(3, 'FAIRE CONNAÎTRE', 'TikTok', 'Montrer ton produit à des milliers de personnes, sans payer de pub')],
  ['05-fin', 'deskB', 'fin', text(`<div style="font-size:40px;font-weight:800;line-height:1.3;opacity:.95">Créer → Vendre → Faire connaître</div><div style="font-size:66px;font-weight:800;line-height:1.12;margin-top:24px">Enregistre ce carrousel 📌</div><div style="font-size:46px;font-weight:800;line-height:1.2;margin-top:22px">Lequel tu utilises déjà ?<br>Dis-le en commentaire 👇</div>`, 110)],
];

const b = await pw.chromium.launch();
fs.mkdirSync('out', { recursive: true });
for (const [name, photo, screen, overlay] of SLIDES) {
  const [tl, tr, br, bl] = corners[photo];
  const w = Math.max(tr[0] - tl[0], br[0] - bl[0]), h = Math.max(bl[1] - tl[1], br[1] - tr[1]);
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.setContent(SCREENS[screen](w, h)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({ path: `out/${name}-screen.png` }); await p.close();
  const pts = `0,0 ${tl.join()} ${w * 2},0 ${tr.join()} ${w * 2},${h * 2} ${br.join()} 0,${h * 2} ${bl.join()}`;
  // Écran incrusté en perspective, légèrement fondu dans la lumière de la photo (1536×2048).
  execFileSync('convert', [`${photo}.png`, '(', `out/${name}-screen.png`, '-alpha', 'set', '-virtual-pixel', 'transparent',
    '-define', 'distort:viewport=1536x2048+0+0', '-distort', 'Perspective', pts, '+repage', '-channel', 'A', '-evaluate', 'multiply', '0.94', '+channel', ')',
    '-compose', 'over', '-composite', '-resize', '1080x1440', `out/${name}-bg.jpg`]);
  const bg = `data:image/jpeg;base64,${fs.readFileSync(`out/${name}-bg.jpg`).toString('base64')}`;
  const q = await b.newPage({ viewport: { width: 1080, height: 1440 } });
  await q.setContent(page(1080, 1440, `<img src="${bg}" style="position:absolute;inset:0;width:1080px;height:1440px">
    <div style="position:absolute;left:0;right:0;top:0;height:640px;background:linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,0))"></div>${overlay}`));
  await q.evaluate(() => document.fonts.ready);
  await q.screenshot({ path: `out/${name}.png` }); await q.close();
  console.log('ok', name);
}
await b.close();
