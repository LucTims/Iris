// Habillages propres à la vidéo « 3 idées de livres pour le secteur bancaire » (réponse à un commentaire) :
// question en bulle, une carte par idée (couverture + points qui s'affichent un à un), récapitulatif, bulle finale.
// Usage (sandbox Higgsfield) : node banque-3-idees-habillage.mjs <dossier-sortie>
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join('fonts', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862', navy: '#1E2A44', gold: '#D9A441' };
const css = `
@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:J;font-weight:600;src:url(${f('plus-jakarta-sans-latin-600-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased}`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const mark = (h, ring, pupil, stem = ring) => `<svg viewBox="0 0 59 271" height="${h}" style="display:block"><circle cx="29" cy="29" r="29" fill="${ring}"/><circle cx="29" cy="29" r="15" fill="${pupil}"/><path d="M54 75 5 118l9 153h29z" fill="${stem}"/></svg>`;

// Couverture de livre en maquette (titre lisible, petite marque Iris en pied).
const cover = (title, bg, fg, accent, w = 190) => {
  const h = Math.round(w * 1.5);
  return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:6px 12px 12px 6px;background:${bg};box-shadow:-6px 0 0 rgba(0,0,0,.18) inset,0 18px 40px rgba(0,0,0,.35);padding:${w * .1}px ${w * .09}px;display:flex;flex-direction:column;justify-content:space-between;flex:none">
    <div style="width:${w * .28}px;height:5px;background:${accent};border-radius:3px"></div>
    <div style="font-family:N;font-size:${w * .125}px;line-height:1.08;color:${fg}">${title}</div>
    <div style="display:flex;align-items:center;gap:6px">${mark(w * .12, accent, fg === '#fff' ? C.ink : fg)}<div style="font-size:${w * .06}px;font-weight:800;color:${fg};opacity:.8;letter-spacing:.06em">GUIDE PRATIQUE</div></div>
  </div>`;
};

const check = (t) => `<div style="display:flex;align-items:center;gap:18px;margin-top:20px">
  <div style="width:42px;height:42px;border-radius:50%;background:${C.brand};color:#fff;font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">✓</div>
  <div style="font-size:36px;font-weight:800;line-height:1.15;color:${C.ink}">${t}</div></div>`;

const card = (n, who, title, coverHtml, points) => page(`
<div style="position:absolute;left:56px;right:56px;top:210px;background:${C.ground};border-radius:34px;padding:36px 40px 40px;box-shadow:0 18px 50px rgba(0,0,0,.35)">
  <div style="display:flex;gap:30px;align-items:flex-start">
    <div style="flex:1">
      <div style="display:inline-block;background:${C.brand};color:#fff;font-size:24px;font-weight:800;letter-spacing:.07em;padding:9px 20px;border-radius:999px">IDÉE N°${n} · ${who}</div>
      <div style="font-family:N;font-size:58px;line-height:1.06;color:${C.ink};margin-top:22px">« ${title} »</div>
    </div>
    ${coverHtml}
  </div>
  ${points.map(check).join('')}
</div>`);

const IDEES = [
  {
    key: 'i1', n: 1, who: 'POUR TOUT LE MONDE', title: 'Comment obtenir un crédit du premier coup',
    cover: cover('Obtenir un crédit du premier coup', C.navy, '#fff', C.gold),
    points: ['Les relevés des derniers mois', 'La capacité de remboursement', 'Ton apport', 'Les erreurs qui font refuser un dossier'],
  },
  {
    key: 'i2', n: 2, who: 'POUR TOUT LE MONDE', title: 'Les frais cachés de ton compte bancaire',
    cover: cover('Les frais cachés de ton compte bancaire', C.brand, '#fff', C.ground),
    points: ['Tenue de compte, agios, frais de carte', 'Où part ton argent chaque mois', 'Comment payer moins'],
  },
  {
    key: 'i3', n: 3, who: 'POUR LES PROS', title: 'Chef d’agence : tenir ses objectifs sans épuiser son équipe',
    cover: cover('Chef d’agence : tenir ses objectifs', '#EFE6DA', C.ink, C.brand),
    points: ['Le brief du matin', 'Le suivi du portefeuille clients', 'La gestion des réclamations'],
  },
];

// Question de l'abonné, en bulle (texte seul : ni pseudo ni photo).
const question = page(`
<div style="position:absolute;left:72px;right:120px;top:250px">
  <div style="position:relative;background:${C.ground};border-radius:30px;padding:26px 34px 30px;box-shadow:0 14px 44px rgba(0,0,0,.35)">
    <div style="font-size:24px;font-weight:600;color:${C.muted}">💬 Votre question</div>
    <div style="font-family:N;font-size:58px;line-height:1.08;color:${C.ink};margin-top:6px">« Je fais dans le secteur <em style="color:${C.brand}">bancaire et management</em>, quel livre puis-je écrire ? »</div>
    <div style="position:absolute;left:70px;bottom:-24px;width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-top:26px solid ${C.ground}"></div>
  </div>
</div>`);

const recap = page(`
<div style="position:absolute;left:56px;right:56px;top:210px;background:${C.ground};border-radius:34px;padding:36px 40px 44px;box-shadow:0 18px 50px rgba(0,0,0,.35);text-align:center">
  <div style="display:inline-block;background:${C.brand};color:#fff;font-size:24px;font-weight:800;letter-spacing:.07em;padding:9px 20px;border-radius:999px">À ÉCRIRE DÈS CE SOIR</div>
  <div style="font-family:N;font-size:62px;line-height:1.05;color:${C.ink};margin-top:18px">3 livres, <em style="color:${C.brand}">1 seul métier</em></div>
  <div style="display:flex;justify-content:center;gap:28px;margin-top:34px">${IDEES.map((i) => i.cover.replace('width:190px;height:285px', 'width:250px;height:375px')).join('')}</div>
</div>`);

const comment = page(`
<div style="position:absolute;left:72px;right:150px;top:240px">
  <div style="position:relative;background:${C.ground};border-radius:32px;padding:30px 36px 34px;box-shadow:0 14px 44px rgba(0,0,0,.35)">
    <div style="font-size:26px;font-weight:600;color:${C.muted}">💬 Dis-moi en commentaire</div>
    <div style="font-family:N;font-size:66px;line-height:1.05;color:${C.ink};margin-top:6px">Quel est <em style="color:${C.brand}">ton métier&nbsp;?</em></div>
    <div style="font-size:28px;font-weight:800;color:${C.ink};margin-top:16px">Je te réponds en vidéo.</div>
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
await shot(question, 'question.png');
// Une image par état : titre seul, puis chaque point ajouté (i1-0 … i1-4).
for (const i of IDEES) {
  for (let k = 0; k <= i.points.length; k++) await shot(card(i.n, i.who, i.title, i.cover, i.points.slice(0, k)), `${i.key}-${k}.png`);
}
await shot(recap, 'recap.png');
await shot(comment, 'comment.png');
await b.close();
console.log('habillage banque ok');
