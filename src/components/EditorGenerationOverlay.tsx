"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Superposition affichée au-dessus du canevas de l'éditeur pendant qu'Iris
 * écrit ou réécrit le livre.
 *
 * Direction artistique : un MANUSCRIT qui s'écrit, pas une « IA » — pas
 * d'étincelles, de dégradés ni de halos. Une page posée sur une pile de
 * feuilles : le titre du chapitre se trace, les lignes s'écrivent une à une
 * derrière un curseur, puis la page se tourne et la suivante commence. La
 * seule couleur est la terracotta de la marque ; la signature est l'œil
 * d'Iris (le point du « i » du logo), dont la pupille respire.
 *
 * Respecte « réduire les animations » : page pleine et immobile.
 */

const DEFAULT_MESSAGES = [
  "Iris prépare votre manuscrit…",
  "Rédaction des chapitres…",
  "Mise en forme des pages…",
  "Peaufinage du style et du rythme…",
];

const ACCENT = "#C84B31"; // --color-secondary (terracotta éditoriale)
const INK = "#1F2937";

/* ------------------------------------------------------------------ *
 * Géométrie de la page (viewBox 160 × 124)
 * ------------------------------------------------------------------ */
const PAGE = { x: 36, y: 10, width: 88, height: 104 };
const LEFT = PAGE.x + 12;
const TITLE = { y: 24, w: 38 };
const FIRST_LINE_Y = 38;
const LINE_GAP = 8.6;
/** Longueurs des lignes : un paragraphe, une ligne vide, puis un second paragraphe. */
const LINES = [62, 58, 63, 41, 0, 60, 63, 52];

const TITLE_DURATION = 0.5;
const LINE_DURATION = 0.48;
const HOLD = 0.9;
const START = 0.25;

const drawnLines = LINES.map((w, i) => ({ w, i })).filter((l) => l.w > 0);
const lineStart = (order: number) => START + TITLE_DURATION + order * LINE_DURATION;
/** Durée d'une page complète, jusqu'au moment où elle se tourne. */
const PAGE_CYCLE_S = lineStart(drawnLines.length) + HOLD;

export default function EditorGenerationOverlay({
  label = "Iris écrit votre livre",
  messages = DEFAULT_MESSAGES,
  progress,
  onStop,
}: {
  label?: string;
  messages?: string[];
  /** Progression réelle (chapitres terminés / total) — affiche une barre déterminée. */
  progress?: { current: number; total: number } | null;
  /** Callback d'arrêt : affiche un bouton « Arrêter » (stop après le chapitre en cours). */
  onStop?: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  // « Rédaction 3/9… · 338 pièces utilisées » : le statut en titre, le
  // compteur de pièces sur une ligne discrète en dessous.
  const [title, ...metaParts] = label.split(" · ");
  const meta = metaParts.join(" · ");

  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 3200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#F9FAFB]/80 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-[340px] max-w-[86vw] flex-col items-center gap-6 rounded-2xl border border-neutral-200/80 bg-white px-7 pb-6 pt-7 shadow-[0_24px_60px_-24px_rgba(17,24,39,0.28)]"
      >
        <Manuscript reduceMotion={reduceMotion} />

        <div className="flex w-full flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-2">
            <IrisEye reduceMotion={reduceMotion} />
            <h3 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-neutral-900">{title}</h3>
          </div>
          <div className="relative h-4 w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0 text-[12px] font-medium text-neutral-500"
              >
                {messages[msgIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {pct != null ? (
          <div className="w-full space-y-2">
            <div className="flex items-baseline justify-between text-[11px] font-semibold tabular-nums text-neutral-500">
              <span>
                Chapitre {Math.min(progress!.current + 1, progress!.total)} sur {progress!.total}
              </span>
              <span>{pct} %</span>
            </div>
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-secondary"
                initial={false}
                animate={{ width: `${Math.max(pct, 2)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ) : (
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-neutral-100">
            {!reduceMotion && (
              <motion.div
                className="absolute inset-y-0 w-1/4 rounded-full bg-secondary/70"
                initial={{ left: "-25%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1], repeat: Infinity, repeatDelay: 0.2 }}
              />
            )}
          </div>
        )}

        {(meta || onStop) && (
          <div className="-mt-2 flex w-full items-center justify-between gap-3">
            <span className="text-[11px] tabular-nums text-neutral-400">{meta}</span>
            {onStop && (
              <button
                onClick={onStop}
                className="text-[12px] font-semibold text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
              >
                {pct != null ? "Arrêter après ce chapitre" : "Arrêter"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * La page qui s'écrit puis se tourne
 * ------------------------------------------------------------------ */
function Manuscript({ reduceMotion }: { reduceMotion: boolean }) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setPage((p) => p + 1), PAGE_CYCLE_S * 1000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <svg viewBox="0 0 160 124" className="h-[124px] w-[160px] overflow-visible" aria-hidden="true">
      {/* Pile de feuilles déjà écrites */}
      <rect {...PAGE} rx="3" fill="#F2EFEA" transform="rotate(-5 80 62) translate(-3 3)" />
      <rect {...PAGE} rx="3" fill="#F7F5F1" stroke="#ECE8E1" strokeWidth="0.75" transform="rotate(3 80 62) translate(2 2)" />

      <AnimatePresence>
        <motion.g
          key={page}
          initial={reduceMotion ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: -26, rotate: -7 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        >
          <WritingPage reduceMotion={reduceMotion} />
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}

function WritingPage({ reduceMotion }: { reduceMotion: boolean }) {
  const caret = caretKeyframes();
  return (
    <g>
      <rect {...PAGE} rx="3" fill="#FFFFFF" stroke="#E7E3DC" strokeWidth="0.75" />

      {/* Titre du chapitre */}
      <motion.rect
        x={LEFT}
        y={TITLE.y}
        height={3.5}
        rx={1.75}
        fill={ACCENT}
        initial={reduceMotion ? { width: TITLE.w } : { width: 0 }}
        animate={{ width: TITLE.w }}
        transition={{ delay: START, duration: TITLE_DURATION, ease: [0.45, 0, 0.55, 1] }}
      />

      {/* Lignes de texte, écrites une à une */}
      {drawnLines.map((line, order) => (
        <motion.rect
          key={line.i}
          x={LEFT}
          y={FIRST_LINE_Y + line.i * LINE_GAP}
          height={2.2}
          rx={1.1}
          fill="#CFC8BE"
          initial={reduceMotion ? { width: line.w } : { width: 0 }}
          animate={{ width: line.w }}
          transition={{ delay: lineStart(order), duration: LINE_DURATION, ease: "linear" }}
        />
      ))}

      {/* Curseur d'écriture */}
      {!reduceMotion && (
        <motion.rect
          width={1.3}
          height={6.5}
          rx={0.65}
          fill={ACCENT}
          initial={{ x: caret.x[0], y: caret.y[0], opacity: 0 }}
          animate={{ x: caret.x, y: caret.y, opacity: caret.opacity }}
          transition={{ duration: caret.duration, times: caret.times, ease: "linear" }}
        />
      )}

      {/* Numéro de page */}
      <rect x={PAGE.x + PAGE.width / 2 - 3} y={PAGE.y + PAGE.height - 6} width={6} height={1.6} rx={0.8} fill="#E2DDD5" />
    </g>
  );
}

/**
 * Trajectoire du curseur : il suit le titre puis chaque ligne, de gauche à
 * droite, en même temps que le trait se dessine, et s'efface en fin de page.
 */
function caretKeyframes() {
  const x: number[] = [];
  const y: number[] = [];
  const at: number[] = [];
  const opacity: number[] = [];
  const push = (px: number, py: number, t: number, o = 1) => {
    x.push(px);
    y.push(py);
    at.push(t);
    opacity.push(o);
  };

  push(LEFT, TITLE.y - 1.5, 0, 0);
  push(LEFT, TITLE.y - 1.5, START, 1);
  push(LEFT + TITLE.w + 1, TITLE.y - 1.5, START + TITLE_DURATION);
  drawnLines.forEach((line, order) => {
    const ly = FIRST_LINE_Y + line.i * LINE_GAP - 2.2;
    push(LEFT, ly, lineStart(order));
    push(LEFT + line.w + 1, ly, lineStart(order) + LINE_DURATION);
  });
  const end = lineStart(drawnLines.length);
  const duration = end + HOLD * 0.6;
  push(x[x.length - 1], y[y.length - 1], duration, 0);

  return { x, y, opacity, times: at.map((t) => t / duration), duration };
}

/* ------------------------------------------------------------------ *
 * L'œil d'Iris : le point du « i » du logo, pupille qui respire
 * ------------------------------------------------------------------ */
function IrisEye({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={ACCENT} />
      <motion.circle
        cx="10"
        cy="10"
        r="4.6"
        fill={INK}
        animate={reduceMotion ? undefined : { r: [4.6, 3.4, 4.6] }}
        transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
      />
    </svg>
  );
}
