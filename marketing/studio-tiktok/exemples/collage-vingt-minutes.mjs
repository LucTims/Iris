// Vidéo « 20 minutes » en collage papier (1080×1920, 30 i/s, 23,7 s, voix Fatou).
// Fatou, infirmière, rentre tard et fatiguée… et pourtant elle a écrit un livre : elle raconte 20 minutes,
// le « i » d'Iris (œil photo tramé + bande de papier orange) écrit avec elle, une heure plus tard le livre est fini.
// Six tableaux :
//   1 · cobalt « FATOU, INFIRMIÈRE… FATIGUÉE » (horloge 23 h 40, garde de 12 h) ;
//   2 · orange « ET POURTANT… UN LIVRE. » puis « EN 20 MINUTES » (minuteur qui fait le tour) ;
//   3 · jaune « ELLE RACONTE, IRIS ÉCRIT. » (ses mots volent vers l'œil, les pages s'empilent) ;
//   4 · cobalt « 1 HEURE PLUS TARD » (l'horloge fait un tour, le livre apparaît, deux jauges imprimées) ;
//   5 · orange « AUJOURD'HUI, SON SAVOIR AIDE LES PARENTS. » (Fatou et son livre) ;
//   6 · cobalt « ET TOI… TU AS 20 MIN CE SOIR ? », puis le « i » rejoint « Iris ».
// Chaque image est calculée par frame(t) puis capturée : rendu déterministe.
// Usage : node collage-vingt-minutes.mjs <dossier> [t1,t2,…]
//   <dossier>/fonts/ : Archivo Black 400 et Plus Jakarta Sans 800 ;
//   <dossier>/p/ : front, profile, book (découpes tramées produites par paper.py) ;
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
const DURATION = 23.7;
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(dir, p)).toString('base64')}`;
const font = (n) => data(path.join('fonts', n), 'font/woff2');
const png = (n) => data(n, 'image/png');

// Horloge en papier : cadran crème, 12 graduations, aiguilles d'encre.
const clock = (id, size) => {
  const c = size / 2, R = c - 10;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6, r1 = R - 26, r2 = R - (i % 3 ? 44 : 60);
    return `<line x1="${c + r1 * Math.sin(a)}" y1="${c - r1 * Math.cos(a)}" x2="${c + r2 * Math.sin(a)}" y2="${c - r2 * Math.cos(a)}" stroke="#121110" stroke-width="${i % 3 ? 6 : 12}" stroke-linecap="round"/>`;
  }).join('');
  return `<svg id="${id}" class="abs" width="${size}" height="${size}" style="overflow:visible;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">
    <circle cx="${c}" cy="${c}" r="${R}" fill="#FBF8F1" stroke="#121110" stroke-width="${size / 36}"/>${ticks}
    <line id="${id}H" x1="${c}" y1="${c}" x2="${c}" y2="${c - R * .5}" stroke="#121110" stroke-width="${size / 30}" stroke-linecap="round"/>
    <line id="${id}M" x1="${c}" y1="${c}" x2="${c}" y2="${c - R * .78}" stroke="#121110" stroke-width="${size / 48}" stroke-linecap="round"/>
    <line id="${id}S" x1="${c}" y1="${c + R * .12}" x2="${c}" y2="${c - R * .82}" stroke="#FF6728" stroke-width="${size / 110}" stroke-linecap="round"/>
    <circle cx="${c}" cy="${c}" r="${size / 34}" fill="#FF6728"/></svg>`;
};
// Couverture du livre de Fatou (la couleur change selon le fond).
const book = (id, bg, fg, style) => `<div id="${id}" class="h" style="${style};width:380px;height:510px;background:${bg};border-radius:6px 14px 14px 6px;box-shadow:inset -12px 0 0 rgba(0,0,0,.14);padding:44px 36px;text-transform:none;white-space:normal">
  <div style="width:84px;height:84px;border-radius:50%;background:${fg};display:flex;align-items:center;justify-content:center;font-family:A;font-size:72px;line-height:1;color:${bg}">+</div>
  <div style="font-family:A;font-size:50px;line-height:1.02;color:${fg};margin-top:40px;text-transform:uppercase">Les gestes qui sauvent</div>
  <div style="font-family:J;font-weight:800;font-size:24px;letter-spacing:.12em;color:${fg};position:absolute;left:36px;bottom:40px">PAR FATOU</div></div>`;

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
.word{position:absolute;left:0;top:0;font-family:J;font-weight:800;font-size:30px;letter-spacing:.05em;color:var(--ink);background:var(--orange);padding:9px 16px 7px;white-space:nowrap;visibility:hidden;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.18))}
.sheet{position:absolute;left:0;top:0;width:300px;height:200px;background:var(--paper);visibility:hidden;box-shadow:3px 4px 0 rgba(0,0,0,.16)}
.lbl{font-family:J;font-weight:800;font-size:31px;letter-spacing:.07em;text-transform:uppercase;color:var(--cream);margin-bottom:12px;white-space:nowrap}
.trk{position:relative;width:900px;height:56px;border:5px solid var(--cream);border-radius:4px}
#grain{position:absolute;left:0;top:0;width:1080px;height:1920px;mix-blend-mode:multiply;z-index:50}
</style></head><body>

<!-- 1 · fatiguée -->
<div id="s1" class="scene">
  <img id="front" class="cut" src="${png('p/front.png')}" style="left:40px;top:680px;width:1000px">
  <div id="h1a" class="h" style="left:64px;top:190px;font-size:150px;color:var(--cream)">Fatou,</div>
  <div id="h1b" class="h" style="left:64px;top:340px;font-size:130px;color:var(--yellow)">infirmière</div>
  <div id="h1c" class="h" style="left:64px;top:230px;font-size:150px;color:var(--cream)">fatiguée…</div>
  <div id="c1" class="chip" style="left:70px;top:500px;background:var(--ink);color:var(--cream)">GARDE · 12 H</div>
  <div class="abs" style="left:790px;top:470px">${clock('k1', 230)}</div>
</div>

<!-- 2 · et pourtant… en 20 minutes -->
<div id="s2" class="scene">
  <div id="h2a" class="h" style="left:64px;top:220px;font-size:130px;color:var(--cream)">Et pourtant…</div>
  <div id="h2b" class="h" style="left:64px;top:370px;font-size:150px;color:var(--yellow)">un livre.</div>
  ${book('b2', '#2252FF', '#F4EEDF', 'left:350px;top:760px')}
  <div id="h2c" class="h" style="left:64px;top:230px;font-size:110px;color:var(--cream)">En 20 minutes</div>
  <svg id="tm" class="abs" width="640" height="640" style="left:220px;top:760px;overflow:visible;filter:drop-shadow(8px 10px 0 rgba(0,0,0,.22));visibility:hidden">
    <rect x="270" y="-34" width="100" height="40" rx="10" fill="#121110"/>
    <circle cx="320" cy="320" r="300" fill="#FBF8F1" stroke="#121110" stroke-width="16"/>
    <circle id="tmArc" cx="320" cy="320" r="258" fill="none" stroke="#2252FF" stroke-width="40" transform="rotate(-90 320 320)"/>
    <text x="320" y="370" text-anchor="middle" font-family="A" font-size="200" fill="#121110">20</text>
    <text x="320" y="440" text-anchor="middle" font-family="J" font-weight="800" font-size="52" letter-spacing="6" fill="#121110">MIN</text>
  </svg>
</div>

<!-- 3 · elle raconte, Iris écrit -->
<div id="s3" class="scene">
  <img id="prof" class="cut" src="${png('p/profile.png')}" style="left:-330px;top:760px;width:1000px">
  <div id="sheets"></div>
  <div id="words"></div>
  <div id="h3a" class="h" style="left:64px;top:206px;font-size:106px;color:var(--ink)">Elle raconte,</div>
  <div id="h3b" class="h" style="left:64px;top:330px;font-size:140px;color:var(--ink)">Iris écrit.</div>
  <div id="c3" class="chip" style="left:70px;top:500px;background:var(--ink);color:var(--cream)">PAGES : <span id="cnt">0</span></div>
</div>

<!-- 4 · une heure plus tard -->
<div id="s4" class="scene">
  <div class="abs" style="left:240px;top:750px">${clock('k4', 600)}</div>
  ${book('b4', '#FF6728', '#121110', 'left:350px;top:725px')}
  <div id="h4a" class="h" style="left:64px;top:190px;font-size:170px;color:var(--cream)">1 heure</div>
  <div id="h4b" class="h" style="left:64px;top:350px;font-size:140px;color:var(--yellow)">plus tard</div>
  <div id="h4c" class="h" style="left:64px;top:250px;font-size:150px;color:var(--yellow)">Livre fini.</div>
  <div id="tk1" class="h" style="left:80px;top:1290px;filter:none"><div class="lbl">Elle raconte · 20 min</div><div class="trk"><div style="position:absolute;left:6px;top:6px;width:290px;bottom:6px;background:var(--cream)"></div></div></div>
  <div id="tk2" class="h" style="left:80px;top:1420px;filter:none"><div class="lbl">Livre fini · 1 h</div><div class="trk"><div style="position:absolute;left:6px;top:6px;right:6px;bottom:6px;background:var(--yellow)"></div></div></div>
</div>

<!-- 5 · aujourd'hui -->
<div id="s5" class="scene">
  <div id="bkW" class="abs">
    <img id="bk" class="cut" src="${png('p/book.png')}" style="left:40px;top:720px;width:1000px">
    <div id="bl" class="h" style="left:436px;top:1268px;width:190px;padding:20px 12px 16px;background:var(--cobalt);font-size:26px;line-height:1.05;color:var(--cream);text-align:center;white-space:normal">Les gestes qui sauvent</div>
  </div>
  <div id="h5a" class="h" style="left:64px;top:190px;font-size:110px;color:var(--cream)">Aujourd’hui,</div>
  <div id="h5b" class="h" style="left:64px;top:310px;font-size:96px;color:var(--cream)">son savoir aide</div>
  <div id="h5c" class="h" style="left:64px;top:410px;font-size:130px;color:var(--yellow)">les parents.</div>
</div>

<!-- 6 · et toi ? -->
<div id="s6" class="scene">
  <div id="h6a" class="h" style="left:64px;top:260px;font-size:200px;color:var(--cream)">Et toi…</div>
  <div id="h6b" class="h" style="left:64px;top:480px;font-size:120px;color:var(--cream)">tu as 20 min</div>
  <div id="h6c" class="h" style="left:64px;top:610px;font-size:160px;color:var(--yellow)">ce soir ?</div>
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

// Aiguilles : angles en degrés (0 = midi).
const hands = (id, h, m, s) => {
  const c = $('#' + id).getAttribute('width') / 2;
  $('#' + id + 'H').setAttribute('transform', 'rotate(' + h + ' ' + c + ' ' + c + ')');
  $('#' + id + 'M').setAttribute('transform', 'rotate(' + m + ' ' + c + ' ' + c + ')');
  $('#' + id + 'S').setAttribute('transform', 'rotate(' + s + ' ' + c + ' ' + c + ')');
};
const arc = $('#tmArc'), ARC = 2 * Math.PI * 258;
arc.style.strokeDasharray = ARC;

// Ses mots s'envolent de sa bouche vers l'œil ; à chaque mot, des pages tombent du « i » sur la pile.
const MOUTH = [375, 1242], EYE = [850, 760];
const WORDS = ['FIÈVRE', 'BRÛLURE', 'ÉTOUFFEMENT', 'MORSURE', 'PREMIERS GESTES'];
const W0 = (i) => 10.5 + i * .3;
$('#words').innerHTML = WORDS.map((w) => '<div class="word">' + w + '</div>').join('');
const words = [...document.querySelectorAll('.word')];
const NS = 10, S0 = (k) => 10.95 + k * .14;
const sr = rng(31);
const SHEET = Array.from({ length: NS }, () => (sr() - .5) * 9);
$('#sheets').innerHTML = Array.from({ length: NS }, () => {
  let h = '';
  for (let y = 26; y < 180; y += 26) h += '<div class="abs" style="left:26px;top:' + y + 'px;width:' + (150 + sr() * 100) + 'px;height:6px;border-radius:3px;background:rgba(18,17,16,.45)"></div>';
  return '<div class="sheet">' + h + '</div>';
}).join('');
const sheets = [...document.querySelectorAll('.sheet')];

// Collé d'un coup : arrive grand, s'écrase avec un léger rebond ; sort en glissant hors champ.
function slap(sel, t, t0, { rot = 0, out = 99, dir = [0, -1] } = {}) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const p = P(t, t0, t0 + .26), q = eio(P(t, out, out + .24));
  el.style.visibility = t >= t0 && q < 1 ? 'visible' : 'hidden';
  el.style.opacity = Math.min(1, p * 6);
  el.style.transform = 'translate(' + dir[0] * q * 1300 + 'px,' + dir[1] * q * 1300 + 'px) scale(' + (1.55 - .55 * bo(p, 2.2)) + ') rotate(' + (rot + (1 - p) * 7) + 'deg)';
}

// Regard de l'œil : chaque repère [temps, x, y] est rejoint en 0,16 s.
const LOOK = [[0, 0, 0], [10.6, -15, 8], [12.6, -10, 12], [15.9, -15, 9], [19.7, 0, 0], [23.25, -13, -2], [23.5, 0, 0]];
const BLINKS = [17, 20.2];
const IRIS_C = 582 * 249 / 1164;   // centre de l'iris dans l'image affichée

let lockS, lockX, lockY;
window.frame = (t) => {
  if (lockS === undefined) {
    const r = $('#ph').getBoundingClientRect();
    lockS = r.height / 944; lockX = r.left + 100 * lockS; lockY = r.top + 100 * lockS;
  }
  document.body.style.background = t < 4.3 ? C.cobalt : t < 9.15 ? C.orange : t < 12.45 ? C.yellow : t < 15.45 ? C.cobalt : t < 19.3 ? C.orange : C.cobalt;
  [['s1', t < 4.3], ['s2', t >= 4.3 && t < 9.15], ['s3', t >= 9.15 && t < 12.45], ['s4', t >= 12.45 && t < 15.45], ['s5', t >= 15.45 && t < 19.3], ['s6', t >= 19.3]]
    .forEach(([id, on]) => { $('#' + id).style.display = on ? 'block' : 'none'; });

  // 1 · Fatou rentre de garde ; l'horloge marque 23 h 40.
  const fIn = bo(P(t, 0, .5)), fOut = eio(P(t, 4.05, 4.3));
  $('#front').style.transform = 'translateY(' + ((1 - fIn) * 1200 + fOut * 1300) + 'px) rotate(' + (1 - fIn) * 4 + 'deg)';
  slap('#h1a', t, .3, { rot: -2, out: 3 });
  slap('#h1b', t, .86, { rot: 2, out: 3.02 });
  slap('#h1c', t, 3.14, { rot: -2, out: 4.08 });
  slap('#c1', t, 2.08, { rot: -3, out: 4.1 });
  slap('#k1', t, 2.38, { rot: 6, out: 4.12 });
  hands('k1', 350, 240, Math.floor(t) * 6);

  // 2 · et pourtant… un livre ; puis le minuteur de 20 minutes fait le tour.
  slap('#h2a', t, 4.34, { rot: -2, out: 7.3 });
  slap('#h2b', t, 5.82, { rot: 2, out: 7.32 });
  slap('#b2', t, 5.46, { rot: -4, out: 7.3, dir: [.6, -1] });
  slap('#h2c', t, 8.08, { rot: -2 });
  slap('#tm', t, 7.44, { rot: 3 });
  arc.style.strokeDashoffset = ARC * (1 - eio(P(t, 8.2, 9)));

  // 3 · elle raconte, Iris écrit : les mots volent vers l'œil, les pages tombent sur la pile.
  const prIn = bo(P(t, 9.15, 9.6));
  $('#prof').style.transform = 'translateX(' + (prIn - 1) * 1000 + 'px)';
  slap('#h3a', t, 9.4, { rot: -2, out: 12.25 });
  slap('#h3b', t, 10.52, { rot: 2, out: 12.27 });
  slap('#c3', t, 10.9, { rot: -3, out: 12.3 });
  let front = null;
  words.forEach((el, i) => {
    const a = W0(i), p = P(t, a, a + .5), e = eio(p);
    el.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
    const x = L(MOUTH[0], EYE[0], e), y = L(MOUTH[1], EYE[1], e) - 160 * Math.sin(Math.PI * e);
    el.style.opacity = 1 - P(e, .8, 1);
    el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + L(1, .3, e) + ') rotate(' + (1 - e) * -8 + 'deg)';
    if (p > 0 && p < 1) front = [x, y];
  });
  let landed = 0;
  sheets.forEach((el, k) => {
    const a = S0(k), p = P(t, a, a + .26), e = bo(p, 1.2);
    el.style.visibility = t >= a ? 'visible' : 'hidden';
    if (p >= 1) landed++;
    const x = L(EYE[0], 840, e) - 150, y = L(1266, 1470 - k * 7, e) - 100;
    el.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + SHEET[k] * e + 'deg) scale(' + L(.3, 1, Math.min(e, 1)) + ')';
  });
  $('#cnt').textContent = Math.round(48 * landed / NS);

  // 4 · une heure plus tard : l'horloge fait un tour, puis le livre arrive avec deux jauges imprimées.
  slap('#h4a', t, 12.62, { rot: -2, out: 13.95 });
  slap('#h4b', t, 12.9, { rot: 2, out: 13.97 });
  slap('#h4c', t, 14, { rot: -2, out: 15.3 });
  slap('#k4', t, 12.62, { rot: -4, out: 14, dir: [-1, 0] });
  const turn = eio(P(t, 12.9, 13.9));
  hands('k4', 350 + 30 * turn, 240 + 360 * turn, 360 * 5 * turn);
  slap('#b4', t, 14.26, { rot: -3, out: 15.3, dir: [0, -1] });
  slap('#tk1', t, 14.6, { out: 15.3, dir: [-1, 0] });
  slap('#tk2', t, 14.9, { out: 15.32, dir: [-1, 0] });

  // 5 · aujourd'hui, son savoir aide les parents.
  const bIn = bo(P(t, 15.45, 15.9)), bOut = eio(P(t, 19.1, 19.35));
  $('#bkW').style.transform = 'translateY(' + ((1 - bIn) * 1200 + bOut * 1300) + 'px)';
  slap('#bl', t, 16, { rot: -4 });
  slap('#h5a', t, 15.5, { rot: -2, out: 19.1 });
  slap('#h5b', t, 16.46, { rot: 1, out: 19.12 });
  slap('#h5c', t, 17.56, { rot: -2, out: 19.14 });

  // 6 · et toi ?
  slap('#h6a', t, 19.52, { rot: -3, out: 21.85 });
  slap('#h6b', t, 20.48, { rot: 1, out: 21.87 });
  slap('#h6c', t, 21.12, { rot: -2, out: 21.89 });
  slap('#ris', t, 22.25);
  const u = eo(P(t, 22.6, 23.1));
  $('#url').style.visibility = t >= 22.6 ? 'visible' : 'hidden';
  $('#url').style.opacity = u; $('#url').style.transform = 'translateY(' + (1 - u) * 24 + 'px)';

  // Le « i » : position du centre de l'œil (cx, cy) et échelle s.
  let cx, cy, s, rot = 0, sl = 1;
  if (t < 12.45) {
    const p = P(t, 10.36, 10.62); cx = EYE[0]; cy = EYE[1]; s = .6; rot = (1 - p) * 7; sl = 1.55 - .55 * bo(p, 2.2);
  } else if (t < 15.45) {
    const p = bo(P(t, 12.45, 12.85)); cx = L(850, 960, p); cy = L(760, 560, p); s = L(.6, .42, p);
  } else if (t < 19.3) {
    const p = bo(P(t, 15.45, 15.85)); cx = L(960, 950, p); cy = L(560, 640, p); s = L(.42, .45, p);
  } else if (t < 21.9) {
    const p = bo(P(t, 19.3, 19.7)); cx = L(950, 820, p); cy = L(640, 1250, p); s = L(.45, .6, p);
  } else {
    const p = bo(P(t, 21.9, 22.35)); cx = L(820, lockX, p); cy = L(1250, lockY, p); s = L(.6, lockS, p);
  }
  const ich = $('#ich');
  ich.style.visibility = t >= 10.36 ? 'visible' : 'hidden';
  ich.style.transform = 'translate(' + (cx - 100) + 'px,' + (cy - 100) + 'px) scale(' + s * sl + ') rotate(' + rot + 'deg)';

  // Regard, clignements, clin d'œil.
  let lx = 0, ly = 0;
  for (const [k, x, y] of LOOK) { if (t < k) break; const p = eio(P(t, k, k + .16)); lx = L(lx, x, p); ly = L(ly, y, p); }
  if (front) { const dx = front[0] - cx, dy = front[1] - cy, n = Math.hypot(dx, dy) || 1; lx = 16 * dx / n; ly = 16 * dy / n; }
  let lid = t < 10.45 ? 1 : 1 - eo(P(t, 10.45, 10.6));
  BLINKS.forEach((b) => { const p = P(t, b, b + .18); if (p > 0 && p < 1) lid = Math.max(lid, 1 - Math.abs(2 * p - 1)); });
  const w = P(t, 22.9, 23.35);
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
