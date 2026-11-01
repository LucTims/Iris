// Vidéo « Devine son métier » (épisode 1 : Koffi, mécanicien moto) en collage papier (1080×1920, 30 i/s, 23,5 s).
// Format quiz pour faire commenter dès les premières secondes, pensé comme une série (un métier par épisode).
// Six tableaux :
//   1 · cobalt « DEVINE SON MÉTIER » + compte à rebours papier 3, 2, 1 ;
//   2 · jaune « 3 INDICES · 1 MÉTIER » : clé à molette, chambre à air, casque, que l'œil du « i » regarde un à un,
//       puis « TU TROUVES ? » avec un minuteur de réflexion ;
//   3 · orange révélation « C'EST KOFFI ! MÉCANICIEN MOTO » (20 ans de métier) ;
//   4 · cobalt « CE QU'IL SAIT, DES MILLIERS DE MOTARDS LE CHERCHENT » : leurs questions en bulles ;
//   5 · jaune « AVEC IRIS, UN LIVRE. » : Koffi et « Entretenir sa moto soi-même » ;
//   6 · cobalt « TON MÉTIER AUSSI VAUT UN LIVRE » + trois cases « INDICE ? » à remplir en commentaire, puis « Iris ».
// Chaque image est calculée par frame(t) puis capturée : rendu déterministe.
// Usage : node collage-devine-son-metier.mjs <dossier> [t1,t2,…]
//   <dossier>/fonts/ : Archivo Black 400 et Plus Jakarta Sans 800 ;
//   <dossier>/p/ : front, book, cle, chambre, casque (découpes tramées produites par outils/paper.py) ;
//   <dossier>/eye.png (œil tramé, iris centré) ; <dossier>/grain.png (grain papier 1080×1920, multiplié par-dessus).
//   Sans liste de temps : toutes les images dans <dossier>/frames/ ; avec une liste : <dossier>/check/.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '/'));
const pw = require('playwright');

const dir = process.argv[2] || '.';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const FPS = 30;
const DURATION = 23.5;
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(dir, p)).toString('base64')}`;
const font = (n) => data(path.join('fonts', n), 'font/woff2');
const png = (n) => data(n, 'image/png');

// Indice : découpe tramée + étiquette « INDICE n ».
const clue = (id, n, img, style, w) => `<div id="${id}" class="h" style="${style};width:${w}px;text-transform:none">
  <img src="${png(img)}" style="display:block;width:${w}px">
  <div class="tag" style="position:absolute;left:24px;top:-10px">INDICE ${n}</div></div>`;
// Question de motard, en bulle de papier.
const BUBBLES = [['MA MOTO CALE ?', 80, 620, -4], ['VIDANGE : QUAND ?', 470, 770, 3], ['PNEU CREVÉ ?', 110, 930, 2],
  ['UN BRUIT BIZARRE ?', 470, 1090, -3], ['LES FREINS GRINCENT ?', 80, 1250, 3], ['BATTERIE À PLAT ?', 470, 1410, -2]];
const bubble = ([q, x, y], i) => `<div id="q${i}" class="h bub" style="left:${x}px;top:${y}px">${q}<div class="tail"></div></div>`;
// Case vide à remplir par le spectateur.
const slot = (i) => `<div id="s6c${i}" class="h" style="left:${70 + i * 330}px;top:600px;width:290px;height:220px;border:6px dashed var(--cream);border-radius:14px;filter:none;text-transform:none">
  <div style="position:absolute;left:0;right:0;top:22px;text-align:center;font-family:J;font-weight:800;font-size:30px;letter-spacing:.08em;color:var(--cream)">INDICE ${i + 1}</div>
  <div style="position:absolute;left:0;right:0;top:70px;text-align:center;font-family:A;font-size:120px;line-height:1;color:var(--yellow)">?</div></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${font('archivo-black-latin-400-normal.woff2')})}
@font-face{font-family:J;font-weight:800;src:url(${font('plus-jakarta-sans-latin-800-normal.woff2')})}
:root{--cobalt:#2252FF;--orange:#FF6728;--yellow:#FFE14A;--ink:#121110;--cream:#F4EEDF;--paper:#FBF8F1}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:var(--cobalt);-webkit-font-smoothing:antialiased}
.abs{position:absolute;left:0;top:0}
.scene{position:absolute;left:0;top:0;width:1080px;height:1920px;display:none}
.h{position:absolute;font-family:A;text-transform:uppercase;line-height:.92;letter-spacing:-.01em;white-space:nowrap;filter:drop-shadow(6px 8px 0 rgba(0,0,0,.22));transform-origin:50% 60%;visibility:hidden}
.cut{position:absolute;filter:drop-shadow(8px 10px 0 rgba(0,0,0,.24))}
.chip{position:absolute;font-family:J;font-weight:800;font-size:38px;letter-spacing:.06em;padding:12px 24px 10px;white-space:nowrap;filter:drop-shadow(5px 6px 0 rgba(0,0,0,.22));visibility:hidden}
.tag{font-family:J;font-weight:800;font-size:30px;letter-spacing:.08em;color:var(--ink);background:var(--orange);padding:9px 18px 7px;white-space:nowrap}
.bub{font-family:J;font-weight:800;font-size:40px;letter-spacing:.02em;color:var(--ink);background:var(--paper);padding:22px 30px 18px;border-radius:30px;line-height:1}
.bub .tail{position:absolute;left:46px;bottom:-24px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:26px solid var(--paper)}
#grain{position:absolute;left:0;top:0;width:1080px;height:1920px;mix-blend-mode:multiply;z-index:50}
</style></head><body>

<!-- 1 · devine son métier + 3, 2, 1 -->
<div id="s1" class="scene">
  <div id="h1a" class="h" style="left:64px;top:220px;font-size:230px;color:var(--cream)">Devine</div>
  <div id="h1b" class="h" style="left:64px;top:446px;font-size:136px;color:var(--yellow)">son métier</div>
  <div id="c1" class="chip" style="left:70px;top:620px;background:var(--ink);color:var(--cream)">ÉPISODE 1</div>
  ${[3, 2, 1].map((n) => `<div id="n${n}" class="h" style="left:290px;top:880px;width:500px;height:500px;border-radius:50%;background:var(--orange);color:var(--cream);font-size:380px;line-height:500px;text-align:center">${n}</div>`).join('')}
</div>

<!-- 2 · trois indices, un métier -->
<div id="s2" class="scene">
  ${clue('k1', 1, 'p/cle.png', 'left:60px;top:600px', 460)}
  ${clue('k2', 2, 'p/chambre.png', 'left:540px;top:980px', 440)}
  ${clue('k3', 3, 'p/casque.png', 'left:100px;top:1250px', 380)}
  <div id="h2a" class="h" style="left:64px;top:200px;font-size:150px;color:var(--ink)">3 indices</div>
  <div id="h2b" class="h" style="left:64px;top:350px;font-size:150px;color:var(--orange)">1 métier</div>
  <div id="h2c" class="h" style="left:64px;top:226px;font-size:116px;color:var(--ink)">Tu trouves ?</div>
  <div id="c2" class="chip" style="left:70px;top:380px;background:var(--ink);color:var(--cream)">TA RÉPONSE EN COMMENTAIRE</div>
  <svg id="pie" class="abs" width="260" height="260" style="left:660px;top:1420px;overflow:visible;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">
    <circle cx="130" cy="130" r="124" fill="#FBF8F1" stroke="#121110" stroke-width="8"/>
    <path id="wedge" fill="#2252FF"/>
    <text x="130" y="178" text-anchor="middle" font-family="A" font-size="140" fill="#121110">?</text>
  </svg>
</div>

<!-- 3 · révélation -->
<div id="s3" class="scene">
  <img id="front" class="cut" src="${png('p/front.png')}" style="left:40px;top:700px;width:1000px">
  <div id="h3a" class="h" style="left:64px;top:200px;font-size:120px;color:var(--cream)">C’est Koffi !</div>
  <div id="h3b" class="h" style="left:64px;top:330px;font-size:86px;color:var(--yellow)">mécanicien moto</div>
  <div id="c3" class="chip" style="left:70px;top:470px;background:var(--ink);color:var(--cream)">20 ANS DE MÉTIER</div>
</div>

<!-- 4 · des milliers de motards le cherchent -->
<div id="s4" class="scene">
  ${BUBBLES.map(bubble).join('')}
  <div id="h4a" class="h" style="left:64px;top:200px;font-size:110px;color:var(--cream)">Ce qu’il sait,</div>
  <div id="h4b" class="h" style="left:64px;top:320px;font-size:130px;color:var(--yellow)">des milliers</div>
  <div id="h4c" class="h" style="left:70px;top:460px;font-size:54px;color:var(--cream)">de motards le cherchent.</div>
</div>

<!-- 5 · avec Iris, un livre -->
<div id="s5" class="scene">
  <div id="bkW" class="abs">
    <img class="cut" src="${png('p/book.png')}" style="left:40px;top:720px;width:1000px">
    <div id="bl" class="h" style="left:432px;top:1252px;width:200px;padding:18px 12px 14px;background:var(--cobalt);font-size:25px;line-height:1.05;color:var(--cream);text-align:center;white-space:normal">Entretenir sa moto soi-même</div>
  </div>
  <div id="h5a" class="h" style="left:64px;top:200px;font-size:130px;color:var(--ink)">Avec Iris,</div>
  <div id="h5b" class="h" style="left:64px;top:340px;font-size:160px;color:var(--orange)">un livre.</div>
</div>

<!-- 6 · à toi -->
<div id="s6" class="scene">
  <div id="h6a" class="h" style="left:64px;top:200px;font-size:92px;color:var(--cream)">Ton métier aussi</div>
  <div id="h6b" class="h" style="left:64px;top:310px;font-size:104px;color:var(--yellow)">vaut un livre.</div>
  ${[0, 1, 2].map(slot).join('')}
  <div id="c6a" class="chip" style="left:70px;top:880px;background:var(--cream);color:var(--ink)">METS 3 INDICES EN COMMENTAIRE</div>
  <div id="c6b" class="chip" style="left:70px;top:970px;background:var(--yellow);color:var(--ink);font-size:48px">ON DEVINE !</div>
</div>

<!-- signature : le « i » rejoint « ris » -->
<div id="lock" class="abs" style="width:1080px;top:600px;display:flex;justify-content:center;align-items:flex-end;gap:24px">
  <div id="ph" style="width:94px;height:443px;flex:none"></div>
  <div id="ris" style="font-family:A;font-size:360px;line-height:.78;color:var(--cream);filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">ris</div>
</div>
<div id="url" class="abs" style="width:1080px;top:1110px;text-align:center;font-family:J;font-weight:800;font-size:46px;color:var(--cream);letter-spacing:.02em;visibility:hidden">irisboom.online</div>

<!-- le « i » personnage : barre de papier orange + œil -->
<div id="ich" class="abs" style="width:200px;height:944px;transform-origin:100px 100px;z-index:10;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">
  <svg class="abs" width="200" height="944" style="overflow:visible"><path id="stemW" fill="#FBF8F1"/><path id="stemO" fill="#FF6728"/></svg>
  <div id="dot" class="abs" style="width:200px;height:200px;transform-origin:100px 100px">
    <svg class="abs" width="200" height="200" style="overflow:visible"><path id="ring" fill="#FBF8F1"/></svg>
    <div class="abs" style="left:8px;top:8px;width:184px;height:184px;border-radius:50%;overflow:hidden;background:var(--cream)">
      <img id="eye" src="${png('eye.png')}" style="position:absolute;width:249px;height:249px">
      <div id="lidT" class="abs" style="width:184px;height:94px;background:var(--ink)"></div>
      <div id="lidB" class="abs" style="top:90px;width:184px;height:94px;background:var(--ink)"></div>
    </div>
  </div>
</div>

<img id="grain" src="${png('grain.png')}">

<script>
const C = { cobalt: '#2252FF', orange: '#FF6728', yellow: '#FFE14A' };
const P = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const L = (a, b, p) => a + (b - a) * p;
const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const eio = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// Arrivée rapide avec léger dépassement.
const bo = (x, c = 1.6) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2));
const $ = (s) => document.querySelector(s);

// Bords de papier déchiré : on subdivise chaque côté et on décale les points au hasard (graine fixe).
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function torn(pts, amp, step, seed) {
  const r = rng(seed), out = [];
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let k = 0; k < n; k++) { const u = k / n, j = k ? (r() - .5) * 2 * amp : 0; out.push([x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j]); }
  });
  return 'M' + out.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}
const circle = (cx, cy, R, n) => Array.from({ length: n }, (_, i) => [cx + R * Math.cos(i / n * 2 * Math.PI), cy + R * Math.sin(i / n * 2 * Math.PI)]);
// La barre reprend la forme du logo Iris (haut en biseau).
$('#stemO').setAttribute('d', torn([[186, 259], [17, 407], [48, 934], [148, 934]], 3, 22, 11));
$('#stemW').setAttribute('d', torn([[192, 249], [5, 403], [39, 944], [157, 944]], 5, 16, 23));
$('#ring').setAttribute('d', torn(circle(100, 100, 101, 40), 3.5, 9, 5));

// Minuteur de réflexion : secteur bleu qui remplit le cadran.
const wedge = (p) => {
  if (p <= 0) return '';
  if (p >= 1) return 'M130 130m-112 0a112 112 0 1 0 224 0a112 112 0 1 0 -224 0';
  const a = p * 2 * Math.PI, x = 130 + 112 * Math.sin(a), y = 130 - 112 * Math.cos(a);
  return 'M130 130L130 18A112 112 0 ' + (p > .5 ? 1 : 0) + ' 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Z';
};

// Collé d'un coup : arrive grand, s'écrase avec un léger rebond ; sort en glissant hors champ.
function slap(sel, t, t0, { rot = 0, out = 99, dir = [0, -1] } = {}) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const p = P(t, t0, t0 + .26), q = eio(P(t, out, out + .24));
  el.style.visibility = t >= t0 && q < 1 ? 'visible' : 'hidden';
  el.style.opacity = Math.min(1, p * 6);
  el.style.transform = 'translate(' + dir[0] * q * 1300 + 'px,' + dir[1] * q * 1300 + 'px) scale(' + (1.55 - .55 * bo(p, 2.2)) + ') rotate(' + (rot + (1 - p) * 7) + 'deg)';
}

// Centres des indices (pour le regard) et repères du regard [temps, cible] : une cible est un point ou un décalage [x, y].
const K = { k1: [290, 830], k2: [760, 1160], k3: [290, 1450] };
const LOOK = [[0, [0, 0]], [2.72, K.k1], [3.7, K.k2], [4.5, K.k3], [5.2, [0, 0]], [5.8, K.k1], [6.4, K.k3], [7, K.k2], [7.6, [0, 0]],
  [8.6, [540, 1200]], [9.7, [0, 0]], [12.3, [300, 900]], [13.2, [700, 1150]], [14, [300, 1350]], [14.9, [0, 0]], [15.5, [540, 1300]],
  [17.4, [0, 0]], [18.5, [200, 700]], [18.8, [540, 700]], [19.1, [870, 700]], [19.6, [0, 0]]];
const BLINKS = [7.8, 12.1, 17.1, 20.4];
const IRIS_C = 582 * 249 / 1164;   // centre de l'iris dans l'image affichée

let lockS, lockX, lockY;
window.frame = (t) => {
  if (lockS === undefined) {
    const r = $('#ph').getBoundingClientRect();
    lockS = r.height / 944; lockX = r.left + 100 * lockS; lockY = r.top + 100 * lockS;
  }
  document.body.style.background = t < 2.3 ? C.cobalt : t < 8.3 ? C.yellow : t < 11.85 ? C.orange : t < 14.85 ? C.cobalt : t < 17.25 ? C.yellow : C.cobalt;
  [['s1', t < 2.3], ['s2', t >= 2.3 && t < 8.3], ['s3', t >= 8.3 && t < 11.85], ['s4', t >= 11.85 && t < 14.85], ['s5', t >= 14.85 && t < 17.25], ['s6', t >= 17.25]]
    .forEach(([id, on]) => { $('#' + id).style.display = on ? 'block' : 'none'; });

  // 1 · devine son métier : 3, 2, 1.
  slap('#h1a', t, .1, { rot: -3, out: 2.1 });
  slap('#h1b', t, .35, { rot: 2, out: 2.12 });
  slap('#c1', t, .6, { rot: -3, out: 2.14 });
  slap('#n3', t, .8, { rot: -6, out: 1.28, dir: [-1, 0] });
  slap('#n2', t, 1.3, { rot: 5, out: 1.78, dir: [1, 0] });
  slap('#n1', t, 1.8, { rot: -4, out: 2.16 });

  // 2 · trois indices, un métier ; « tu trouves ? » et le minuteur de réflexion.
  slap('#h2a', t, 2.3, { rot: -2, out: 4.85 });
  slap('#h2b', t, 3.7, { rot: 2, out: 4.87 });
  slap('#h2c', t, 4.98, { rot: -2 });
  slap('#c2', t, 5.7, { rot: -2 });
  slap('#k1', t, 2.72, { rot: -8 });
  slap('#k2', t, 3.7, { rot: 5 });
  slap('#k3', t, 4.5, { rot: -4 });
  slap('#pie', t, 5.6, { rot: 4 });
  $('#wedge').setAttribute('d', wedge(P(t, 5.7, 8.2)));

  // 3 · révélation.
  const fIn = bo(P(t, 8.4, 8.85), 2);
  $('#front').style.transform = 'translateY(' + (1 - fIn) * 1200 + 'px) rotate(' + (1 - fIn) * 5 + 'deg)';
  slap('#h3a', t, 9.09, { rot: -3 });
  slap('#h3b', t, 9.79, { rot: 2 });
  slap('#c3', t, 10.87, { rot: -3 });

  // 4 · les questions des motards.
  slap('#h4a', t, 11.95, { rot: -2 });
  slap('#h4b', t, 12.99, { rot: 2 });
  slap('#h4c', t, 13.69, { rot: -1 });
  ${JSON.stringify(BUBBLES.map((q) => q[3]))}.forEach((r, i) => slap('#q' + i, t, 12.3 + i * .35, { rot: r }));

  // 5 · avec Iris, un livre.
  const bIn = bo(P(t, 14.85, 15.3));
  $('#bkW').style.transform = 'translateY(' + (1 - bIn) * 1200 + 'px)';
  slap('#bl', t, 15.6, { rot: -4 });
  slap('#h5a', t, 15.1, { rot: -2 });
  slap('#h5b', t, 16.53, { rot: 2 });

  // 6 · à toi : trois cases à remplir en commentaire, puis la signature.
  slap('#h6a', t, 17.33, { rot: -2, out: 20.75 });
  slap('#h6b', t, 17.9, { rot: 2, out: 20.77 });
  [18.53, 18.81, 19.1].forEach((a, i) => slap('#s6c' + i, t, a, { rot: [-3, 2, -2][i], out: 20.8 + i * .02, dir: [0, 1] }));
  slap('#c6a', t, 19.53, { rot: -2, out: 20.85, dir: [-1, 0] });
  slap('#c6b', t, 19.95, { rot: 3, out: 20.87, dir: [-1, 0] });
  slap('#ris', t, 21.25);
  const u = eo(P(t, 21.6, 22.1));
  $('#url').style.visibility = t >= 21.6 ? 'visible' : 'hidden';
  $('#url').style.opacity = u; $('#url').style.transform = 'translateY(' + (1 - u) * 24 + 'px)';

  // Le « i » : position du centre de l'œil (cx, cy) et échelle s.
  let cx, cy, s, rot = 0, sl = 1;
  if (t < 17.25) {
    const p = P(t, 2.3, 2.56); cx = 960; cy = 560; s = .42; rot = (1 - p) * 7; sl = 1.55 - .55 * bo(p, 2.2);
  } else if (t < 20.9) {
    const p = bo(P(t, 17.25, 17.65)); cx = L(960, 880, p); cy = L(560, 1180, p); s = L(.42, .55, p);
  } else {
    const p = bo(P(t, 20.9, 21.35)); cx = L(880, lockX, p); cy = L(1180, lockY, p); s = L(.55, lockS, p);
  }
  const ich = $('#ich');
  ich.style.visibility = t >= 2.3 ? 'visible' : 'hidden';
  ich.style.transform = 'translate(' + (cx - 100) + 'px,' + (cy - 100) + 'px) scale(' + s * sl + ') rotate(' + rot + 'deg)';

  // Regard (vers un point de l'écran, ou décalage nul = la caméra), clignements, clin d'œil.
  let lx = 0, ly = 0;
  for (const [k, g] of LOOK) {
    if (t < k) break;
    let tx = 0, ty = 0;
    if (g[0] || g[1]) { const dx = g[0] - cx, dy = g[1] - cy, n = Math.hypot(dx, dy) || 1; tx = 16 * dx / n; ty = 16 * dy / n; }
    const p = eio(P(t, k, k + .16)); lx = L(lx, tx, p); ly = L(ly, ty, p);
  }
  let lid = t < 2.45 ? 1 : 1 - eo(P(t, 2.45, 2.6));
  BLINKS.forEach((b) => { const p = P(t, b, b + .18); if (p > 0 && p < 1) lid = Math.max(lid, 1 - Math.abs(2 * p - 1)); });
  const w = P(t, 22.2, 22.65);
  if (w > 0 && w < 1) lid = Math.max(lid, w < .3 ? w / .3 : w < .7 ? 1 : (1 - w) / .3);
  $('#dot').style.transform = 'rotate(' + (w > 0 && w < 1 ? -8 * Math.sin(Math.PI * w) : 0) + 'deg)';
  $('#eye').style.left = 92 - IRIS_C + lx + 'px'; $('#eye').style.top = 92 - IRIS_C + ly + 'px';
  $('#lidT').style.transform = 'translateY(' + -(1 - lid) * 101 + '%)';
  $('#lidB').style.transform = 'translateY(' + (1 - lid) * 101 + '%)';
};
</script></body></html>`;

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
const outDir = path.join(dir, only ? 'check' : 'frames');
fs.mkdirSync(outDir, { recursive: true });
const times = only || Array.from({ length: Math.round(FPS * DURATION) }, (_, i) => i / FPS);
for (const [i, t] of times.entries()) {
  await p.evaluate((x) => window.frame(x), t);
  await p.screenshot({ path: path.join(outDir, only ? `t${t}.jpg` : `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await b.close();
console.log('ok', times.length, 'images');
