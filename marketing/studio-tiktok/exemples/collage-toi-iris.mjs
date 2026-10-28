// Vidéo « Toi + Iris » en collage papier (1080×1920, 30 i/s, 17,5 s, voix Fatou).
// Awa, couturière, et le « i » d'Iris devenu personnage : son point est un œil photo tramé (il regarde, cligne,
// fait un clin d'œil), sa barre une bande de papier orange déchirée.
// Quatre compositions reliées par des raccords :
//   1 · cobalt « PAGE BLANCHE ?! » → la page du carnet tourne, le « i » s'y colle ;
//   2 · jaune « TOI + IRIS » : tes mots (ruban orange) et le plan (ruban bleu) se rejoignent dans la cible ;
//   3 · orange « CHAPITRE PAR CHAPITRE » : on plonge dans la cible, l'œil regarde les chapitres s'écrire ;
//   4 · cobalt « TON SAVOIR. TON LIVRE. » : Awa et son livre, puis le « i » rejoint le mot « Iris ».
// Chaque image est calculée par frame(t) puis capturée : rendu déterministe.
// Usage : node collage-toi-iris.mjs <dossier> [t1,t2,…]
//   <dossier>/fonts/ : Archivo Black 400 et Plus Jakarta Sans 800 ;
//   <dossier>/p/ : front, surprise, profile, book (découpes tramées produites par paper.py) ;
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
const DURATION = 17.5;
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(dir, p)).toString('base64')}`;
const font = (n) => data(path.join('fonts', n), 'font/woff2');
const png = (n) => data(n, 'image/png');

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
.chip{position:absolute;font-family:J;font-weight:800;font-size:40px;letter-spacing:.06em;padding:12px 24px 10px;white-space:nowrap;filter:drop-shadow(5px 6px 0 rgba(0,0,0,.22));visibility:hidden}
.page{position:absolute;background:var(--paper)}
.lines{background-image:repeating-linear-gradient(to bottom,transparent 0 56px,rgba(34,82,255,.22) 56px 59px);background-position:0 120px}
.lbl{font-family:J;font-weight:800;font-size:31px;letter-spacing:.07em;text-transform:uppercase;color:var(--cream);margin-bottom:12px;white-space:nowrap}
.trk{position:relative;width:920px;height:56px;border:5px solid var(--cream);border-radius:4px}
.lab{position:absolute;left:28px;top:20px;white-space:nowrap;font-family:A;font-size:42px;color:var(--ink);visibility:hidden}
#grain{position:absolute;left:0;top:0;width:1080px;height:1920px;mix-blend-mode:multiply;z-index:50}
</style></head><body>

<!-- 1 · page blanche -->
<div id="s1" class="scene">
  <div id="nb" class="abs" style="left:600px;top:720px;width:420px;height:560px">
    <div class="abs" style="width:420px;height:560px;background:var(--orange);border-radius:8px;box-shadow:8px 10px 0 rgba(0,0,0,.22)"></div>
    <div class="page" style="left:30px;top:18px;width:372px;height:524px"></div>
    <div id="pg1" class="page lines" style="left:30px;top:18px;width:372px;height:524px;transform-origin:left center;backface-visibility:hidden">
      <div id="chip0" class="chip" style="left:30px;top:40px;background:var(--ink);color:var(--cream);font-size:34px">MOTS : 0<span id="cur" style="display:inline-block;width:4px;height:32px;background:var(--cream);margin-left:8px;vertical-align:-4px"></span></div>
    </div>
  </div>
  <img id="awaF" class="cut" src="${png('p/front.png')}" style="left:-130px;top:720px;width:980px">
  <img id="awaS" class="cut" src="${png('p/surprise.png')}" style="left:-130px;top:720px;width:980px">
  <div id="h1a" class="h" style="left:70px;top:300px;font-size:124px;color:var(--cream)">Ton métier</div>
  <div id="h1b" class="h" style="left:84px;top:446px;font-size:66px;color:var(--ink);background:var(--yellow);padding:16px 26px 8px">Par cœur</div>
  <div id="h2a" class="h" style="left:64px;top:250px;font-size:210px;color:var(--cream)">Page</div>
  <div id="h2c" class="h" style="left:680px;top:200px;font-size:270px;color:var(--yellow)">?!</div>
  <div id="h2b" class="h" style="left:56px;top:460px;font-size:172px;color:var(--cream)">Blanche</div>
</div>

<!-- 2 · toi + Iris -->
<div id="s2" class="scene" style="transform-origin:560px 1480px">
  <img id="awaP" class="cut" src="${png('p/profile.png')}" style="left:-260px;top:640px;width:1000px">
  <svg class="abs" width="1080" height="1920" style="overflow:visible">
    <path id="rOw" d="M500 1228 C690 1220 720 1340 612 1418" stroke="#FBF8F1" stroke-width="60" fill="none"/>
    <path id="rO" d="M500 1228 C690 1220 720 1340 612 1418" stroke="#FF6728" stroke-width="44" fill="none"/>
    <path id="rBw" d="M806 838 C720 980 712 1220 640 1376" stroke="#FBF8F1" stroke-width="60" fill="none"/>
    <path id="rB" d="M806 838 C720 980 712 1220 640 1376" stroke="#2252FF" stroke-width="44" fill="none"/>
  </svg>
  <svg id="tgt" class="abs" width="240" height="240" style="left:440px;top:1360px;overflow:visible;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22))">
    <circle cx="120" cy="120" r="114" fill="#FBF8F1"/><circle cx="120" cy="120" r="106" fill="#FF6728"/>
    <circle cx="120" cy="120" r="72" fill="#121110"/><circle cx="120" cy="120" r="44" fill="#F4EEDF"/><circle cx="120" cy="120" r="18" fill="#FF6728"/>
  </svg>
  <div id="cm" class="chip" style="left:110px;top:1510px;background:var(--orange);color:var(--ink)">TES MOTS</div>
  <div id="cp" class="chip" style="left:470px;top:1030px;background:var(--cobalt);color:var(--cream)">LE PLAN</div>
  <div id="hT" class="h" style="left:64px;top:250px;font-size:168px;color:var(--ink)">Toi</div>
  <div id="hP" class="h" style="left:436px;top:236px;font-size:190px;color:var(--orange)">+</div>
  <div id="hI" class="h" style="left:618px;top:250px;font-size:168px;color:var(--ink)">Iris</div>
</div>

<!-- 3 · chapitre par chapitre -->
<div id="s3" class="scene">
  <div id="yr" class="abs" style="left:-40px;top:300px;width:1160px;height:196px;background:var(--yellow);transform-origin:50% 100%;box-shadow:6px 8px 0 rgba(0,0,0,.18)"></div>
  <div id="hC" class="h" style="left:66px;top:326px;font-size:150px;color:var(--ink);filter:none">Chapitre</div>
  <div id="hC2" class="h" style="left:70px;top:532px;font-size:92px;color:var(--cream)">par chapitre</div>
  <div id="bars"></div>
</div>

<!-- 4 · ton savoir, ton livre -->
<div id="s4" class="scene">
  <div id="awaW" class="abs">
    <img id="awaB" class="cut" src="${png('p/book.png')}" style="left:200px;top:860px;width:1000px">
    <div id="bl" class="h" style="left:612px;top:1440px;width:150px;padding:18px 10px 14px;background:var(--orange);font-size:27px;line-height:1.05;color:var(--ink);text-align:center;white-space:normal">Le savoir d’Awa</div>
  </div>
  <div id="hS" class="h" style="left:64px;top:236px;font-size:112px;color:var(--cream)">Ton savoir.</div>
  <div id="hL" class="h" style="left:64px;top:366px;font-size:112px;color:var(--yellow)">Ton livre.</div>
  <div id="tk1" class="h" style="left:66px;top:540px;filter:none"><div class="lbl">Avant · écrit 0 %</div><div class="trk"></div></div>
  <div id="tk2" class="h" style="left:66px;top:676px;filter:none"><div class="lbl">Avec Iris · écrit 100 %</div><div class="trk"><div style="position:absolute;left:6px;top:6px;right:6px;bottom:6px;background:var(--yellow)"></div></div></div>
</div>

<!-- signature : le « i » rejoint « ris » -->
<div id="lock" class="abs" style="width:1080px;top:600px;display:flex;justify-content:center;align-items:flex-end;gap:24px">
  <div id="ph" style="width:94px;height:443px;flex:none"></div>
  <div id="ris" style="font-family:A;font-size:360px;line-height:.78;color:var(--cream);filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">ris</div>
</div>
<div id="url" class="abs" style="width:1080px;top:1110px;text-align:center;font-family:J;font-weight:800;font-size:46px;color:var(--cream);letter-spacing:.02em;visibility:hidden">irisboom.online</div>

<!-- le « i » personnage : barre de papier orange + œil -->
<div id="ich" class="abs" style="width:200px;height:944px;transform-origin:100px 100px;z-index:10;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">
  <svg id="stem" class="abs" width="200" height="944" style="overflow:visible;transform-origin:100px 259px"><path id="stemW" fill="#FBF8F1"/><path id="stemO" fill="#FF6728"/></svg>
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

// Chapitres : barres de papier crème au bout déchiré.
const BARS = [860, 700, 800, 620, 760];
$('#bars').innerHTML = BARS.map((w, i) => {
  const r = rng(40 + i), pts = [[0, 0], [w - 18, 0]];
  for (let y = 10; y < 88; y += 11) pts.push([w - 18 + r() * 22, y]);
  pts.push([w - 18, 88], [0, 88]);
  return '<div class="abs" style="left:100px;top:' + (1010 + i * 112) + 'px;filter:drop-shadow(6px 7px 0 rgba(0,0,0,.2))">'
    + '<div class="abs bar" style="width:' + w + 'px;height:88px;background:#FBF8F1;transform-origin:left center;clip-path:polygon(' + pts.map((p) => p[0].toFixed(0) + 'px ' + p[1].toFixed(0) + 'px').join(',') + ')"></div>'
    + '<div class="lab">CH. ' + (i + 1) + '</div></div>';
}).join('');
const bars = [...document.querySelectorAll('.bar')], labs = [...document.querySelectorAll('.lab')];
['rO', 'rOw', 'rB', 'rBw'].forEach((id) => { const el = $('#' + id), l = el.getTotalLength(); el.dataset.l = l; el.style.strokeDasharray = l; });
const draw = (id, p) => { const el = $('#' + id); el.style.strokeDashoffset = el.dataset.l * (1 - p); el.style.visibility = p > 0 ? 'visible' : 'hidden'; };

// Collé d'un coup : arrive grand, s'écrase avec un léger rebond ; sort en glissant hors champ.
function slap(sel, t, t0, { rot = 0, out = 99, dir = [0, -1] } = {}) {
  const el = $(sel);
  const p = P(t, t0, t0 + .26), q = eio(P(t, out, out + .24));
  el.style.visibility = t >= t0 && q < 1 ? 'visible' : 'hidden';
  el.style.opacity = Math.min(1, p * 6);
  el.style.transform = 'translate(' + dir[0] * q * 1300 + 'px,' + dir[1] * q * 1300 + 'px) scale(' + (1.55 - .55 * bo(p, 2.2)) + ') rotate(' + (rot + (1 - p) * 7) + 'deg)';
}

// Regard de l'œil : chaque repère [temps, x, y] est rejoint en 0,16 s.
const LOOK = [[0, 0, 0], [5.4, -14, 3], [5.72, 14, 3], [6.1, -16, 6], [9.25, -9, 15], [10.5, 0, 0], [13.3, 16, 5], [14.9, 0, 0], [16.85, -14, -2], [17.1, 12, -2]];
const BLINKS = [7.9, 14.05, 17.32];
const IRIS_C = 582 * 249 / 1164;   // centre de l'iris dans l'image affichée

let lockS, lockX, lockY;
window.frame = (t) => {
  if (lockS === undefined) {
    const r = $('#ph').getBoundingClientRect();
    lockS = r.height / 944; lockX = r.left + 100 * lockS; lockY = r.top + 100 * lockS;
  }
  document.body.style.background = t < 5.9 ? C.cobalt : t < 10.45 ? C.yellow : t < 12.55 ? C.orange : C.cobalt;
  [['s1', t < 5.9], ['s2', t >= 5.9 && t < 10.45], ['s3', t >= 10.45 && t < 12.62], ['s4', t >= 12.55]].forEach(([id, on]) => { $('#' + id).style.display = on ? 'block' : 'none'; });

  // 1 · Awa entre par la gauche, le carnet par la droite ; elle est surprise sur « blanche ».
  const aIn = bo(P(t, 0, .5)), aOut = eio(P(t, 3.95, 4.3)), surprised = t >= 3.25;
  const pop = surprised ? 1 + .05 * (1 - eo(P(t, 3.25, 3.45))) : 1;
  const awa = 'translateX(' + ((aIn - 1) * 1100 - aOut * 1100) + 'px) rotate(' + (-2 - (1 - aIn) * 6) + 'deg) scale(' + pop + ')';
  $('#awaF').style.transform = $('#awaS').style.transform = awa;
  $('#awaF').style.visibility = surprised ? 'hidden' : 'visible';
  $('#awaS').style.visibility = surprised ? 'visible' : 'hidden';
  const nIn = bo(P(t, .12, .6)), nC = eio(P(t, 3.95, 4.35));
  $('#nb').style.transform = 'translate(' + ((1 - nIn) * 900 + nC * -265) + 'px,' + nC * -60 + 'px) rotate(' + L(5, 2, nC) + 'deg) scale(' + L(1, 1.3, nC) + ')';
  $('#pg1').style.transform = 'perspective(1600px) rotateY(' + -178 * eio(P(t, 4.3, 4.65)) + 'deg)';
  $('#cur').style.opacity = Math.floor(t * 2.4) % 2 ? 0 : 1;
  slap('#chip0', t, 1.6, { rot: -3 });
  slap('#h1a', t, .83, { rot: -2, out: 2.15 });
  slap('#h1b', t, 1.35, { rot: -4, out: 2.2 });
  slap('#h2a', t, 2.81, { rot: -3, out: 3.95 });
  slap('#h2b', t, 3.25, { rot: 2, out: 4 });
  slap('#h2c', t, 3.5, { rot: 10, out: 4.05 });

  // 2 · Toi + Iris : les deux rubans convergent dans la cible, puis on plonge dedans.
  const zoom = L(1, 18, eio(P(t, 10.15, 10.45)));
  $('#s2').style.transform = 'scale(' + zoom + ')';
  const pIn = bo(P(t, 6, 6.5));
  $('#awaP').style.transform = 'translateX(' + (pIn - 1) * 1000 + 'px) rotate(' + (pIn - 1) * 5 + 'deg)';
  slap('#hT', t, 6.52, { rot: -3 });
  slap('#hI', t, 9.2, { rot: 2 });
  slap('#hP', t, 9.95);
  slap('#cm', t, 7.25, { rot: -5 });
  slap('#cp', t, 9.55, { rot: 4 });
  $('#tgt').style.transform = 'scale(' + bo(P(t, 6.7, 7)) * (1 + .14 * Math.sin(Math.PI * P(t, 9.95, 10.15))) + ')';
  const ro = eio(P(t, 6.75, 8.4)), rb = eio(P(t, 9.25, 9.9));
  draw('rO', ro); draw('rOw', ro); draw('rB', rb); draw('rBw', rb);

  // 3 · chapitre par chapitre : le ruban jaune claque, les barres poussent une à une.
  const ex = eio(P(t, 12.4, 12.6));
  $('#yr').style.transform = 'translateY(' + -ex * 900 + 'px) rotate(-2.5deg) scaleY(' + bo(P(t, 10.5, 10.8)) + ')';
  slap('#hC', t, 10.7, { rot: -2, out: 12.4 });
  slap('#hC2', t, 11.3, { rot: 1, out: 12.42 });
  let front = null;
  BARS.forEach((w, i) => {
    const t0 = 10.9 + i * .3, p = bo(P(t, t0, t0 + .42));
    bars[i].style.transform = 'translateX(' + -ex * 1300 + 'px) scaleX(' + p + ')';
    const lab = labs[i];
    const q = P(t, t0, t0 + .2);
    lab.style.visibility = t >= t0 && ex < 1 ? 'visible' : 'hidden';
    lab.style.transform = 'translateX(' + -ex * 1300 + 'px) scale(' + (1.4 - .4 * bo(q, 2)) + ')';
    if (t >= t0) front = [100 + w * Math.min(p, 1), 1054 + i * 112];
  });

  // 4 · ton savoir, ton livre.
  const bIn = bo(P(t, 12.9, 13.35)), out4 = eio(P(t, 15.1, 15.4));
  $('#awaW').style.transform = 'translate(' + (1 - bIn) * 800 + 'px,' + out4 * 1200 + 'px) rotate(' + (1 - bIn) * 6 + 'deg)';
  slap('#bl', t, 13.9, { rot: -3 });
  slap('#hS', t, 13.1, { rot: -2, out: 15.1 });
  slap('#hL', t, 14.28, { rot: 2, out: 15.12 });
  slap('#tk1', t, 13.6, { out: 15.14, dir: [-1, 0] });
  slap('#tk2', t, 14.6, { out: 15.16, dir: [-1, 0] });
  slap('#ris', t, 15.42);
  const u = eo(P(t, 15.9, 16.4));
  $('#url').style.visibility = t >= 15.9 ? 'visible' : 'hidden';
  $('#url').style.opacity = u; $('#url').style.transform = 'translateY(' + (1 - u) * 24 + 'px)';

  // Le « i » : position du centre de l'œil (cx, cy), échelle s, barre visible ou non.
  let cx, cy, s, rot = 0, stem = 1, sl = 1;
  if (t < 5.95) {
    const p = P(t, 4.75, 5.01); cx = 545; cy = 720; s = .6; rot = 2 + (1 - p) * 7; sl = 1.55 - .55 * bo(p, 2.2);
  } else if (t < 10.15) {
    const p = bo(P(t, 5.95, 6.45)); cx = L(545, 860, p); cy = L(720, 760, p); s = L(.6, 1, p); rot = L(2, 0, p);
  } else if (t < 10.45) {
    cx = 560 + 300 * zoom; cy = 1480 - 720 * zoom; s = zoom;
  } else if (t < 12.45) {
    stem = 0; cx = 540; cy = 790; s = 1.55 * bo(P(t, 10.45, 10.8));
  } else if (t < 15.15) {
    const p = eio(P(t, 12.45, 12.85)); stem = bo(P(t, 12.85, 13.15));
    cx = L(540, 170, p); cy = L(790, 1010, p); s = L(1.55, .8, p);
  } else {
    const p = bo(P(t, 15.15, 15.6)); cx = L(170, lockX, p); cy = L(1010, lockY, p); s = L(.8, lockS, p);
  }
  const ich = $('#ich');
  ich.style.visibility = t >= 4.75 ? 'visible' : 'hidden';
  ich.style.transform = 'translate(' + (cx - 100) + 'px,' + (cy - 100) + 'px) scale(' + s * sl + ') rotate(' + rot + 'deg)';
  $('#stem').style.transform = 'scaleY(' + stem + ')';
  $('#stem').style.visibility = stem > 0 ? 'inherit' : 'hidden';

  // Regard, clignements, clin d'œil final.
  let lx = 0, ly = 0;
  for (const [k, x, y] of LOOK) { if (t < k) break; const p = eio(P(t, k, k + .16)); lx = L(lx, x, p); ly = L(ly, y, p); }
  if (front && t < 12.45) { const dx = front[0] - cx, dy = front[1] - cy, n = Math.hypot(dx, dy); lx = 16 * dx / n; ly = 16 * dy / n; }
  let lid = t < 5.05 ? 1 : 1 - eo(P(t, 5.05, 5.2));
  BLINKS.forEach((b) => { const p = P(t, b, b + .18); if (p > 0 && p < 1) lid = Math.max(lid, 1 - Math.abs(2 * p - 1)); });
  const w = P(t, 16.4, 16.85);
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
