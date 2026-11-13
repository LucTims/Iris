// Fabrique un épisode « Devine son métier » de bout en bout, sans intervention : c'est ce que lance GitHub Actions.
//   1. images OpenAI si OPENAI_API_KEY est fourni, sinon ElevenLabs (forfait Pro) — 1K, qualité moyenne : portrait, même personne qui tient un livre, bande de 3 indices ;
//   2. détourage gratuit (rembg) + trame papier (paper.py) ;
//   3. voix de la révélation (une seule prise, avec les instants de chaque mot) ; voix des indices et de la fin réutilisées ;
//   4. animation calée sur les mots (gabarit.mjs), bande son (son.py), encodage ffmpeg ;
//   5. envoi de la vidéo à n8n, qui la range dans Supabase Storage et la poste sur Telegram avec les boutons.
// Entrées (variables d'environnement) :
//   EPISODE_JSON  {"idee_id":1,"essai":1,"contenu":{…}}  (contenu = ligne automatisations.iris_idees)
//   ELEVENLABS_API_KEY, N8N_RAPPEL_URL, N8N_RAPPEL_SECRET
//   OUTILS  dossier préparé par studio-tiktok/outils/installer.sh (fonts/, grain.png, paper.py)
// Usage : node produire.mjs <dossier de travail> [--sans-envoi]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(ICI, 'ressources');
const W = path.resolve(process.argv[2] || 'travail');
const SANS_ENVOI = process.argv.includes('--sans-envoi');
const env = (k, def) => {
  const v = process.env[k] ?? def;
  if (v === undefined) throw new Error(`variable ${k} manquante`);
  return v;
};
const EP = JSON.parse(env('EPISODE_JSON'));
const C = EP.contenu;
const OUTILS = path.resolve(env('OUTILS'));
const XI = 'https://api.elevenlabs.io';
const VOIX = 'Vza9yt3uSx3RXnRx6YfI';   // Fatou : la voix de toute la série
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts = {}) => String(execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opts }) ?? '');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
for (const d of ['raw', 'cut', 'p', 'fonts']) fs.mkdirSync(path.join(W, d), { recursive: true });

async function xi(method, url, body) {
  for (let essai = 1; ; essai++) {
    const r = await fetch(XI + url, {
      method, headers: { 'xi-api-key': env('ELEVENLABS_API_KEY'), 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    // On ne relance que les refus temporaires (trop de requêtes, panne) : une génération lancée est déjà facturée.
    if ((r.status === 429 || r.status >= 500) && essai < 4) { await sleep(5000 * essai); continue; }
    const txt = await r.text();
    if (!r.ok) throw new Error(`ElevenLabs ${method} ${url} → ${r.status} ${txt.slice(0, 400)}`);
    return JSON.parse(txt);
  }
}

// Image : création puis attente du résultat (interrogé au plus toutes les 3 s).
// Images OpenAI (si OPENAI_API_KEY est fourni) : pas besoin du forfait Pro d'ElevenLabs. Qualité moyenne.
async function imageOpenAI(nom, prompt, aspect, ref, fichier) {
  const size = aspect === '3:1' ? '1536x1024' : '1024x1024';
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const headers = { authorization: `Bearer ${env('OPENAI_API_KEY')}` };
  let r;
  for (let essai = 1; ; essai++) {
    if (ref) {
      const form = new FormData();
      form.append('model', model); form.append('prompt', prompt); form.append('size', size); form.append('quality', 'medium');
      form.append('image[]', new Blob([fs.readFileSync(ref)], { type: 'image/png' }), 'reference.png');
      r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
    } else {
      r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt, size, quality: 'medium', n: 1 }),
      });
    }
    if ((r.status === 429 || r.status >= 500) && essai < 4) { await sleep(8000 * essai); continue; }
    break;
  }
  const txt = await r.text();
  if (!r.ok) throw new Error(`OpenAI image ${nom} → ${r.status} ${txt.slice(0, 400)}`);
  const d = JSON.parse(txt).data?.[0];
  const buf = d?.b64_json ? Buffer.from(d.b64_json, 'base64') : Buffer.from(await (await fetch(d.url)).arrayBuffer());
  const brut = path.join(W, 'raw', nom + '.src');
  fs.writeFileSync(brut, buf);
  run('ffmpeg', ['-v', 'error', '-y', '-i', brut, fichier]);
  log('image', nom, 'ok (OpenAI)');
  return fichier;
}

async function image(nom, prompt, aspect, ref) {
  const fichier = path.join(W, 'raw', nom + '.png');
  if (fs.existsSync(fichier)) return fichier;
  if (process.env.OPENAI_API_KEY) return imageOpenAI(nom, prompt, aspect, ref, fichier);
  const body = { model_id: 'gpt-image-2.5-sunburst', prompt, aspect_ratio: aspect, resolution: '1K', quality: 'medium' };
  if (ref) body.images = [{ type: 'inline_base64', content_base64: fs.readFileSync(ref).toString('base64'), mime_type: 'image/png' }];
  let g = await xi('POST', '/v1/flows/image', body);
  const t0 = Date.now();
  while (!g.content_url) {
    if (g.status === 'failed') throw new Error(`image ${nom} refusée : ${g.failure_reason || 'sans raison'}`);
    if (Date.now() - t0 > 6 * 60e3) throw new Error(`image ${nom} : délai dépassé`);
    await sleep(3000);
    g = await xi('GET', '/v1/flows/image/' + g.id);
  }
  const r = await fetch(g.content_url);
  if (!r.ok) throw new Error(`téléchargement ${nom} → ${r.status}`);
  const brut = path.join(W, 'raw', nom + '.src');
  fs.writeFileSync(brut, Buffer.from(await r.arrayBuffer()));
  run('ffmpeg', ['-v', 'error', '-y', '-i', brut, fichier]);   // jpg/webp/png → png
  log('image', nom, 'ok');
  return fichier;
}

// Voix de la révélation : une prise, avec l'instant de chaque caractère.
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize',
  'quatorze', 'quinze', 'seize'];
const DIZAINES = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
function enLettres(n) {
  if (n <= 16) return UNITES[n];
  if (n < 20) return 'dix-' + UNITES[n - 10];
  if (n < 70) {
    const d = Math.floor(n / 10), u = n % 10;
    return DIZAINES[d] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + UNITES[u]);
  }
  return String(n);
}

// « de femmes », mais « d'apprentis » : élision devant une voyelle ou un h muet.
const dePublic = (p) => (/^[aeiouyhàâéèêëîïôûœ]/i.test(p) ? "d'" : 'de ') + p;

async function voix() {
  const il = C.genre === 'f' ? 'elle' : 'il';
  const texte = `C'est ${C.nom}, ${C.metier} depuis ${enLettres(C.annees)} ans. Ce qu'${il} sait, des milliers ${dePublic(C.public)} `
    + `le cherchent. Avec Iris, ${il} en a fait un livre.`;
  const cache = path.join(W, 'voix.json');
  let res;
  if (fs.existsSync(cache)) res = JSON.parse(fs.readFileSync(cache, 'utf8'));
  else {
    for (const model_id of ['eleven_v4', 'eleven_multilingual_v2']) {
      try {
        res = await xi('POST', `/v1/text-to-speech/${VOIX}/with-timestamps?output_format=mp3_44100_128`,
          { text: texte, model_id, language_code: 'fr', voice_settings: { stability: .5, similarity_boost: .8, style: .3 } });
        break;
      } catch (e) {
        log('voix', model_id, 'échec :', e.message.slice(0, 200));
      }
    }
    if (!res) throw new Error('aucune voix générée');
    fs.writeFileSync(cache, JSON.stringify(res));
  }
  fs.writeFileSync(path.join(W, 'voix-b.mp3'), Buffer.from(res.audio_base64, 'base64'));
  const al = res.alignment;
  const chars = al.characters.join('').toLowerCase();
  let from = 0;
  // Instant du début d'un morceau de phrase, cherché dans l'ordre du texte.
  const at = (s) => {
    const i = chars.indexOf(s.toLowerCase(), from);
    if (i < 0) throw new Error(`mot « ${s} » introuvable dans l'alignement`);
    from = i + 1;
    return al.character_start_times_seconds[i];
  };
  const mots = {
    nom: at(C.nom), metier: at(C.metier), annees: at(enLettres(C.annees)), ceQu: at('ce qu'),
    milliers: at('des milliers'), public: at(C.public), avec: at('avec iris'), livre: at('livre'),
  };
  mots.fin = Math.max(...al.character_end_times_seconds);
  log('voix ok', JSON.stringify(mots));
  return mots;
}

// Instants de toute la vidéo : début fixe (voix des indices réutilisée), puis calés sur la voix.
function timeline(m) {
  // Temps de réflexion après « Tu trouves ? » : le minuteur tourne REFLEXION secondes à partir de 5,7 s.
  const REFLEXION = 10, b0 = 5.7 + REFLEXION + .1, r = (x) => Math.round(x * 1000) / 1000;
  const T = { b0 };
  for (const k of ['nom', 'metier', 'annees', 'ceQu', 'milliers', 'public', 'livre']) T[k] = r(b0 + m[k]);
  T.s4 = r(T.ceQu - .1);
  T.s5 = r(b0 + m.avec - .15);
  const q0 = T.s4 + .35, pas = Math.max(.15, Math.min(.35, (T.s5 - .3 - q0) / 6));
  T.q = Array.from({ length: 6 }, (_, i) => r(q0 + i * pas));
  const c0 = r(b0 + m.fin + .45);   // « À toi : donne-nous trois indices… »
  Object.assign(T, {
    c0, s6: r(c0 - .05), aToi: r(c0 + .18), slots: [c0 + 1.38, c0 + 1.66, c0 + 1.95].map(r), c6a: r(c0 + 2.38),
    c6b: r(c0 + 2.8), vide: r(c0 + 3.6), lock: r(c0 + 3.75), ris: r(c0 + 4.1), clin: r(c0 + 5.05), fin: r(c0 + 6.35),
  });
  T.sortie = T.lock;
  const claques = [.1, .35, .6, 2.3, 2.72, 3.7, 4.5, 4.98, 5.6, 5.7, T.nom, T.metier, T.annees, T.ceQu, T.milliers, T.public,
    T.s5 + .25, T.s5 + .75, T.livre, T.aToi, T.aToi + .57, ...T.slots, T.c6a, T.c6b, T.ris];
  const son = {
    duree: T.fin, musique: path.join(RES, 'musique-quiz.mp3'),
    voix: [[path.join(RES, 'voix-indices.mp3'), 2.3], [path.join(W, 'voix-b.mp3'), b0], [path.join(RES, 'voix-a-toi.mp3'), c0]],
    cues: {
      claques, bulles: T.q, bips: [[.8, 880], [1.3, 880], [1.8, 880], [2.3, 1320]],
      // Tic-tac toutes les demi-secondes, qui s'accélère sur les 3 dernières secondes.
      tics: [...Array.from({ length: (REFLEXION - 3) * 2 }, (_, k) => 5.7 + k * .5),
        ...Array.from({ length: 12 }, (_, k) => 5.7 + REFLEXION - 3 + k * .25)], souffles: [0, 2.25, b0, T.s4, T.s5, T.s6, T.lock],
      tada: b0 + .15, clin: T.clin + .02,
    },
  };
  return { T, son };
}

// Découpe tramée ; renvoie la taille de l'image produite.
const papier = (src, dst, taille, cellule) => {
  const [, w, h] = run('python3', [path.join(OUTILS, 'paper.py'), src, dst, String(taille), String(cellule)]).trim().split(/\s+/);
  return [Number(w), Number(h)];
};

async function principal() {
  const il = C.genre === 'f' ? 'woman' : 'man';
  const pro = `a West African ${il} ${C.age_en}, ${C.metier_en}, wearing ${C.tenue_en}`;
  const styleP = 'High-contrast studio photograph, evenly lit, plain flat light grey seamless background, sharp focus. No text anywhere.';
  log('épisode', C.episode, C.nom, C.metier, 'essai', EP.essai);

  const [portrait, bande] = await Promise.all([
    image('portrait', `Photo of ${pro}. Front view, from the waist up, confident warm smile, looking straight at the camera, `
      + `both arms visible, the whole head and shoulders inside the frame with space above the head. ${styleP}`, '1:1'),
    image('indices', `Three separate objects photographed side by side on a plain white background, evenly spaced, each one `
      + `centered in its own third of the image, not touching, not overlapping, nothing cut off: left: ${C.indices[0].prompt_en}; `
      + `middle: ${C.indices[1].prompt_en}; right: ${C.indices[2].prompt_en}. Product photography, soft even light, `
      + `high contrast, sharp focus. No text, no hands, no people.`, '3:1'),
  ]);
  const livre = await image('livre', `Use the reference image for the person: same face, same hair, same outfit. New photo: `
    + `front view, from the waist up, proud happy smile, holding a closed hardcover book upright with both hands in front `
    + `of the chest, the front cover faces the camera and is plain solid bright cobalt blue, completely blank, no title. `
    + styleP, '1:1', portrait);

  log('détourage');
  const py = path.join(ICI, 'images.py');
  run('python3', [py, 'detourer', portrait, path.join(W, 'cut', 'front.png')]);
  run('python3', [py, 'detourer', livre, path.join(W, 'cut', 'book.png')]);
  run('python3', [py, 'indices', bande, path.join(W, 'cut')]);
  const couv = JSON.parse(run('python3', [py, 'couverture', path.join(W, 'cut', 'book.png')]));

  papier(path.join(W, 'cut', 'front.png'), path.join(W, 'p', 'front.png'), 1400, 9);
  const [bw] = papier(path.join(W, 'cut', 'book.png'), path.join(W, 'p', 'book.png'), 1400, 9);
  // Largeur d'affichage des indices : celle de l'épisode 1, réduite si l'objet est très haut.
  const larg = [460, 440, 380], hmax = [420, 300, 380];
  const indices = [1, 2, 3].map((i) => {
    const [w, h] = papier(path.join(W, 'cut', `indice${i}.png`), path.join(W, 'p', `indice${i}.png`), 1100, 8);
    return Math.round(Math.min(larg[i - 1], hmax[i - 1] * w / h));
  });

  // Couverture : coordonnées dans la découpe → image tramée (réduite à 1400 px, marge de 70) → écran (largeur 1000 à x 40, y 720).
  let cv = { x: 432, y: 1252, w: 200, h: 200 };
  if (couv) {
    const k = Math.min(1, 1400 / Math.max(couv.W, couv.H)), f = 1000 / bw;
    const X = 40 + (70 + couv.x * couv.W * k) * f, Y = 720 + (70 + couv.y * couv.H * k) * f;
    const cw = couv.w * couv.W * k * f, ch = couv.h * couv.H * k * f;
    cv = { x: Math.round(X + cw * .08), y: Math.round(Y + ch * .2), w: Math.round(cw * .84), h: Math.round(ch * .6) };
  } else log('couverture non trouvée : étiquette au centre');

  const mots = await voix();
  const { T, son } = timeline(mots);
  const il2 = C.genre === 'f' ? 'elle' : 'il';
  fs.writeFileSync(path.join(W, 'params.json'), JSON.stringify({
    T, indices, couv: cv,
    txt: { episode: C.episode, nom: C.nom, metier: C.metier, annees: C.annees, public: C.public, dePublic: dePublic(C.public).replace("'", '’'), ceQu: `Ce qu’${il2} sait,`,
      livre: C.titre_livre, questions: C.questions },
  }, null, 1));
  fs.writeFileSync(path.join(W, 'son.json'), JSON.stringify(son));

  for (const f of fs.readdirSync(path.join(OUTILS, 'fonts'))) fs.copyFileSync(path.join(OUTILS, 'fonts', f), path.join(W, 'fonts', f));
  fs.copyFileSync(path.join(OUTILS, 'grain.png'), path.join(W, 'grain.png'));
  fs.copyFileSync(path.join(RES, 'oeil.png'), path.join(W, 'eye.png'));

  log('animation', T.fin, 's');
  run('node', [path.join(ICI, 'gabarit.mjs'), W], { stdio: 'inherit' });
  run('python3', [path.join(ICI, 'son.py'), path.join(W, 'son.json'), path.join(W, 'son.wav')]);
  const mp4 = path.join(W, 'video.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', path.join(W, 'frames', '%04d.jpg'), '-i', path.join(W, 'son.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-shortest', '-movflags', '+faststart', mp4]);
  log('vidéo', (fs.statSync(mp4).size / 1e6).toFixed(1), 'Mo');
  return { mp4, duree: T.fin };
}

const legende = () => `Devine son métier 🔎 Épisode ${C.episode} : tu avais trouvé ? `
  + `Ce qu'${C.genre === 'f' ? 'elle' : 'il'} sait vaut un livre… et ton métier aussi. `
  + `Donne-nous 3 indices sur le tien en commentaire, on devine ! 👇 #devinesonmetier #metier #livre #afrique #iris`;

// Rappel à n8n : la vidéo part avec (formulaire multipart), n8n la range dans Supabase Storage et l'envoie sur Telegram.
// Ainsi aucune clé Supabase n'est nécessaire côté GitHub.
async function rappel(corps, mp4) {
  if (SANS_ENVOI) return log('rappel (non envoyé)', JSON.stringify(corps));
  const form = new FormData();
  for (const [k, v] of Object.entries({ secret: env('N8N_RAPPEL_SECRET'), idee_id: EP.idee_id, essai: EP.essai, ...corps })) {
    form.append(k, String(v));
  }
  if (mp4) form.append('video', new Blob([fs.readFileSync(mp4)], { type: 'video/mp4' }), `episode-${C.episode}-${EP.idee_id}-${EP.essai}.mp4`);
  const r = await fetch(env('N8N_RAPPEL_URL'), { method: 'POST', body: form });
  log('rappel n8n', r.status);
  if (!r.ok) throw new Error(`rappel n8n → ${r.status} ${(await r.text()).slice(0, 300)}`);
}

let fini = false;
try {
  const { mp4, duree } = await principal();
  await rappel({ statut: 'ok', duree, legende: legende(), titre: `Devine son métier · épisode ${C.episode}` }, mp4);
  fini = true;
} catch (e) {
  console.error(e);
  if (!fini) try { await rappel({ statut: 'erreur', erreur: String(e.message || e).slice(0, 500) }); } catch (e2) { console.error(e2); }
  process.exit(1);
}
