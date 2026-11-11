// Gabarit automatique « Devine son métier » en collage papier (1080×1920, 30 i/s), piloté par <dossier>/params.json.
// Même mise en scène que l'épisode 1 (studio-tiktok/exemples/collage-devine-son-metier.mjs), mais les textes, les images
// et les instants viennent de produire.mjs : la voix change à chaque épisode, l'animation se cale dessus.
// Usage : node gabarit.mjs <dossier> [t1,t2,…]
//   <dossier>/params.json : { T: {instants}, txt: {textes}, indices: [largeurs], couv: {x,y,w,h} } ;
//   <dossier>/fonts/, grain.png, eye.png ; <dossier>/p/ : front, book, indice1..3 (découpes tramées).
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
const P = JSON.parse(fs.readFileSync(path.join(dir, 'params.json'), 'utf8'));
const { T, txt } = P;
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(dir, p)).toString('base64')}`;
const font = (n) => data(path.join('fonts', n), 'font/woff2');
const png = (n) => data(n, 'image/png');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const clue = (id, n, img, style, w) => `<div id="${id}" class="h" style="${style};width:${w}px;text-transform:none">
  <img src="${png(img)}" style="display:block;width:${w}px">
  <div class="tag" style="position:absolute;left:24px;top:-10px">INDICE ${n}</div></div>`;
const POS = [[80, 620, -4], [470, 770, 3], [110, 930, 2], [470, 1090, -3], [80, 1250, 3], [470, 1410, -2]];
const bubble = (q, i) => `<div id="q${i}" class="h bub" style="left:${POS[i][0]}px;top:${POS[i][1]}px">${esc(q)}<div class="tail"></div></div>`;
const slot = (i) => `<div id="s6c${i}" class="h" style="left:${70 + i * 330}px;top:600px;width:290px;height:220px;border:6px dashed var(--cream);border-radius:14px;filter:none;text-transform:none">
  <div style="position:absolute;left:0;right:0;top:22px;text-align:center;font-family:J;font-weight:800;font-size:30px;letter-spacing:.08em;color:var(--cream)">INDICE ${i + 1}</div>
  <div style="position:absolute;left:0;right:0;top:70px;text-align:center;font-family:A;font-size:120px;line-height:1;color:var(--yellow)">?</div></div>`;
// Indices : centres approximatifs (pour le regard de l'œil) et positions de l'épisode 1.
const [w1, w2, w3] = P.indices;
const K = { k1: [60 + w1 / 2, 830], k2: [540 + w2 / 2, 1160], k3: [100 + w3 / 2, 1450] };
// Étiquette du livre posée sur la couverture détectée (coordonnées écran).
const cv = P.couv;

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

<div id="s1" class="scene">
  <div id="h1a" class="h fit" style="left:64px;top:220px;font-size:230px;color:var(--cream)">Devine</div>
  <div id="h1b" class="h fit" style="left:64px;top:446px;font-size:136px;color:var(--yellow)">son métier</div>
  <div id="c1" class="chip" style="left:70px;top:620px;background:var(--ink);color:var(--cream)">ÉPISODE ${esc(txt.episode)}</div>
  ${[3, 2, 1].map((n) => `<div id="n${n}" class="h" style="left:290px;top:880px;width:500px;height:500px;border-radius:50%;background:var(--orange);color:var(--cream);font-size:380px;line-height:500px;text-align:center">${n}</div>`).join('')}
</div>

<div id="s2" class="scene">
  ${clue('k1', 1, 'p/indice1.png', 'left:60px;top:600px', w1)}
  ${clue('k2', 2, 'p/indice2.png', 'left:540px;top:980px', w2)}
  ${clue('k3', 3, 'p/indice3.png', 'left:100px;top:1250px', w3)}
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

<div id="s3" class="scene">
  <img id="front" class="cut" src="${png('p/front.png')}" style="left:40px;top:700px;width:1000px">
  <div id="h3a" class="h fit" style="left:64px;top:200px;font-size:120px;color:var(--cream)">C’est ${esc(txt.nom)} !</div>
  <div id="h3b" class="h fit" style="left:64px;top:330px;font-size:86px;color:var(--yellow)">${esc(txt.metier)}</div>
  <div id="c3" class="chip" style="left:70px;top:470px;background:var(--ink);color:var(--cream)">${esc(txt.annees)} ANS DE MÉTIER</div>
</div>

<div id="s4" class="scene">
  ${txt.questions.map(bubble).join('')}
  <div id="h4a" class="h fit" style="left:64px;top:200px;font-size:110px;color:var(--cream)">${esc(txt.ceQu)}</div>
  <div id="h4b" class="h fit" style="left:64px;top:320px;font-size:130px;color:var(--yellow)">des milliers</div>
  <div id="h4c" class="h fit" style="left:70px;top:460px;font-size:54px;color:var(--cream)">de ${esc(txt.public)} le cherchent.</div>
</div>

<div id="s5" class="scene">
  <div id="bkW" class="abs">
    <img class="cut" src="${png('p/book.png')}" style="left:40px;top:720px;width:1000px">
    <div id="bl" class="h" style="left:${cv.x}px;top:${cv.y}px;width:${cv.w}px;padding:18px 12px 14px;background:var(--cobalt);font-size:30px;line-height:1.05;color:var(--cream);text-align:center;white-space:normal">${esc(txt.livre)}</div>
  </div>
  <div id="h5a" class="h" style="left:64px;top:200px;font-size:130px;color:var(--ink)">Avec Iris,</div>
  <div id="h5b" class="h" style="left:64px;top:340px;font-size:160px;color:var(--orange)">un livre.</div>
</div>

<div id="s6" class="scene">
  <div id="h6a" class="h" style="left:64px;top:200px;font-size:92px;color:var(--cream)">Ton métier aussi</div>
  <div id="h6b" class="h" style="left:64px;top:310px;font-size:104px;color:var(--yellow)">vaut un livre.</div>
  ${[0, 1, 2].map(slot).join('')}
  <div id="c6a" class="chip" style="left:70px;top:880px;background:var(--cream);color:var(--ink)">METS 3 INDICES EN COMMENTAIRE</div>
  <div id="c6b" class="chip" style="left:70px;top:970px;background:var(--yellow);color:var(--ink);font-size:48px">ON DEVINE !</div>
</div>

<div id="lock" class="abs" style="width:1080px;top:600px;display:flex;justify-content:center;align-items:flex-end;gap:24px">
  <div id="ph" style="width:94px;height:443px;flex:none"></div>
  <div id="ris" style="font-family:A;font-size:360px;line-height:.78;color:var(--cream);filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">ris</div>
</div>
<div id="url" class="abs" style="width:1080px;top:1110px;text-align:center;font-family:J;font-weight:800;font-size:46px;color:var(--cream);letter-spacing:.02em;visibility:hidden">irisboom.online</div>

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
const T = ${JSON.stringify(T)};
const C = { cobalt: '#2252FF', orange: '#FF6728', yellow: '#FFE14A' };
const P = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const L = (a, b, p) => a + (b - a) * p;
const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const eio = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const bo = (x, c = 1.6) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2));
const $ = (s) => document.querySelector(s);

// Les textes variables doivent tenir dans l'écran : on réduit la police jusqu'à ce qu'ils rentrent.
const shrink = (el, maxW, minPx) => {
  let fs = parseFloat(getComputedStyle(el).fontSize);
  while (el.offsetWidth > maxW && fs > minPx) { fs -= 2; el.style.fontSize = fs + 'px'; }
};
window.ajuster = () => {
const scenes = [...document.querySelectorAll('.scene')];
scenes.forEach((s) => { s.style.display = 'block'; });
document.querySelectorAll('.fit').forEach((el) => shrink(el, 1080 - el.offsetLeft - 40, 40));
document.querySelectorAll('.chip').forEach((el) => shrink(el, 1080 - el.offsetLeft - 40, 24));
document.querySelectorAll('.bub').forEach((el) => {
  // Le « i » occupe la droite de l'écran (x ≈ 910 à 1010) : les bulles s'arrêtent avant lui.
  shrink(el, 880 - 80, 28);
  if (el.offsetLeft + el.offsetWidth > 880) el.style.left = Math.max(60, 880 - el.offsetWidth) + 'px';
});
const bl = $('#bl'), blMaxH = ${Math.round(cv.h)};
for (let fs = 30; bl.offsetHeight > blMaxH && fs > 16; fs -= 1) bl.style.fontSize = fs + 'px';
scenes.forEach((s) => { s.style.display = 'none'; });
};

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
$('#stemO').setAttribute('d', torn([[186, 259], [17, 407], [48, 934], [148, 934]], 3, 22, 11));
$('#stemW').setAttribute('d', torn([[192, 249], [5, 403], [39, 944], [157, 944]], 5, 16, 23));
$('#ring').setAttribute('d', torn(circle(100, 100, 101, 40), 3.5, 9, 5));

const wedge = (p) => {
  if (p <= 0) return '';
  if (p >= 1) return 'M130 130m-112 0a112 112 0 1 0 224 0a112 112 0 1 0 -224 0';
  const a = p * 2 * Math.PI, x = 130 + 112 * Math.sin(a), y = 130 - 112 * Math.cos(a);
  return 'M130 130L130 18A112 112 0 ' + (p > .5 ? 1 : 0) + ' 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Z';
};

function slap(sel, t, t0, { rot = 0, out = 99, dir = [0, -1] } = {}) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const p = P(t, t0, t0 + .26), q = eio(P(t, out, out + .24));
  el.style.visibility = t >= t0 && q < 1 ? 'visible' : 'hidden';
  el.style.opacity = Math.min(1, p * 6);
  el.style.transform = 'translate(' + dir[0] * q * 1300 + 'px,' + dir[1] * q * 1300 + 'px) scale(' + (1.55 - .55 * bo(p, 2.2)) + ') rotate(' + (rot + (1 - p) * 7) + 'deg)';
}

const K = ${JSON.stringify(K)};
const LOOK = [[0, [0, 0]], [2.72, K.k1], [3.7, K.k2], [4.5, K.k3], [5.2, [0, 0]], [5.8, K.k1], [6.4, K.k3], [7, K.k2], [7.6, [0, 0]],
  [T.b0 + .3, [540, 1200]], [T.b0 + 1.4, [0, 0]], [T.q[0], [300, 900]], [T.q[2] + .2, [700, 1150]], [T.q[4] + .2, [300, 1350]],
  [T.s5 + .05, [0, 0]], [T.s5 + .65, [540, 1300]], [T.s6 + .15, [0, 0]], [T.slots[0] - .03, [200, 700]], [T.slots[1], [540, 700]],
  [T.slots[2], [870, 700]], [T.slots[2] + .5, [0, 0]]];
const BLINKS = [7.8, T.s4 + .25, T.s6 - .15, T.sortie - .35];
const IRIS_C = 582 * 249 / 1164;

let lockS, lockX, lockY;
window.frame = (t) => {
  if (lockS === undefined) {
    const r = $('#ph').getBoundingClientRect();
    lockS = r.height / 944; lockX = r.left + 100 * lockS; lockY = r.top + 100 * lockS;
  }
  document.body.style.background = t < 2.3 ? C.cobalt : t < T.b0 ? C.yellow : t < T.s4 ? C.orange : t < T.s5 ? C.cobalt : t < T.s6 ? C.yellow : C.cobalt;
  [['s1', t < 2.3], ['s2', t >= 2.3 && t < T.b0], ['s3', t >= T.b0 && t < T.s4], ['s4', t >= T.s4 && t < T.s5], ['s5', t >= T.s5 && t < T.s6], ['s6', t >= T.s6]]
    .forEach(([id, on]) => { $('#' + id).style.display = on ? 'block' : 'none'; });

  // 1 · devine son métier : 3, 2, 1 (fixe, la voix des indices ne change pas).
  slap('#h1a', t, .1, { rot: -3, out: 2.1 });
  slap('#h1b', t, .35, { rot: 2, out: 2.12 });
  slap('#c1', t, .6, { rot: -3, out: 2.14 });
  slap('#n3', t, .8, { rot: -6, out: 1.28, dir: [-1, 0] });
  slap('#n2', t, 1.3, { rot: 5, out: 1.78, dir: [1, 0] });
  slap('#n1', t, 1.8, { rot: -4, out: 2.16 });

  // 2 · trois indices, un métier (fixe).
  slap('#h2a', t, 2.3, { rot: -2, out: 4.85 });
  slap('#h2b', t, 3.7, { rot: 2, out: 4.87 });
  slap('#h2c', t, 4.98, { rot: -2 });
  slap('#c2', t, 5.7, { rot: -2 });
  slap('#k1', t, 2.72, { rot: -8 });
  slap('#k2', t, 3.7, { rot: 5 });
  slap('#k3', t, 4.5, { rot: -4 });
  slap('#pie', t, 5.6, { rot: 4 });
  $('#wedge').setAttribute('d', wedge(P(t, 5.7, T.b0 - .1)));

  // 3 · révélation, calée sur les mots de la voix.
  const fIn = bo(P(t, T.b0 + .1, T.b0 + .55), 2);
  $('#front').style.transform = 'translateY(' + (1 - fIn) * 1200 + 'px) rotate(' + (1 - fIn) * 5 + 'deg)';
  slap('#h3a', t, T.nom, { rot: -3 });
  slap('#h3b', t, T.metier, { rot: 2 });
  slap('#c3', t, T.annees, { rot: -3 });

  // 4 · les questions.
  slap('#h4a', t, T.ceQu, { rot: -2 });
  slap('#h4b', t, T.milliers, { rot: 2 });
  slap('#h4c', t, T.public, { rot: -1 });
  ${JSON.stringify(POS.map((q) => q[2]))}.forEach((r, i) => slap('#q' + i, t, T.q[i], { rot: r }));

  // 5 · avec Iris, un livre.
  const bIn = bo(P(t, T.s5, T.s5 + .45));
  $('#bkW').style.transform = 'translateY(' + (1 - bIn) * 1200 + 'px)';
  slap('#bl', t, T.s5 + .75, { rot: -4 });
  slap('#h5a', t, T.s5 + .25, { rot: -2 });
  slap('#h5b', t, T.livre, { rot: 2 });

  // 6 · à toi, puis la signature.
  slap('#h6a', t, T.aToi, { rot: -2, out: T.vide });
  slap('#h6b', t, T.aToi + .57, { rot: 2, out: T.vide + .02 });
  T.slots.forEach((a, i) => slap('#s6c' + i, t, a, { rot: [-3, 2, -2][i], out: T.vide + .05 + i * .02, dir: [0, 1] }));
  slap('#c6a', t, T.c6a, { rot: -2, out: T.vide + .1, dir: [-1, 0] });
  slap('#c6b', t, T.c6b, { rot: 3, out: T.vide + .12, dir: [-1, 0] });
  slap('#ris', t, T.ris);
  const u = eo(P(t, T.ris + .35, T.ris + .85));
  $('#url').style.visibility = t >= T.ris + .35 ? 'visible' : 'hidden';
  $('#url').style.opacity = u; $('#url').style.transform = 'translateY(' + (1 - u) * 24 + 'px)';

  let cx, cy, s, rot = 0, sl = 1;
  if (t < T.s6) {
    const p = P(t, 2.3, 2.56); cx = 960; cy = 560; s = .42; rot = (1 - p) * 7; sl = 1.55 - .55 * bo(p, 2.2);
  } else if (t < T.lock) {
    const p = bo(P(t, T.s6, T.s6 + .4)); cx = L(960, 880, p); cy = L(560, 1180, p); s = L(.42, .55, p);
  } else {
    const p = bo(P(t, T.lock, T.lock + .45)); cx = L(880, lockX, p); cy = L(1180, lockY, p); s = L(.55, lockS, p);
  }
  const ich = $('#ich');
  ich.style.visibility = t >= 2.3 ? 'visible' : 'hidden';
  ich.style.transform = 'translate(' + (cx - 100) + 'px,' + (cy - 100) + 'px) scale(' + s * sl + ') rotate(' + rot + 'deg)';

  let lx = 0, ly = 0;
  for (const [k, g] of LOOK) {
    if (t < k) break;
    let tx = 0, ty = 0;
    if (g[0] || g[1]) { const dx = g[0] - cx, dy = g[1] - cy, n = Math.hypot(dx, dy) || 1; tx = 16 * dx / n; ty = 16 * dy / n; }
    const p = eio(P(t, k, k + .16)); lx = L(lx, tx, p); ly = L(ly, ty, p);
  }
  let lid = t < 2.45 ? 1 : 1 - eo(P(t, 2.45, 2.6));
  BLINKS.forEach((b) => { const p = P(t, b, b + .18); if (p > 0 && p < 1) lid = Math.max(lid, 1 - Math.abs(2 * p - 1)); });
  const w = P(t, T.clin, T.clin + .45);
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
// Les tailles se mesurent une fois les polices chargées.
await p.evaluate(() => window.ajuster());
const outDir = path.join(dir, only ? 'check' : 'frames');
fs.mkdirSync(outDir, { recursive: true });
const times = only || Array.from({ length: Math.round(FPS * T.fin) }, (_, i) => i / FPS);
for (const [i, t] of times.entries()) {
  await p.evaluate((x) => window.frame(x), t);
  await p.screenshot({ path: path.join(outDir, only ? `t${t}.jpg` : `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await b.close();
console.log('ok', times.length, 'images');
