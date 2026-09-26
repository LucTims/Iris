/**
 * MISE EN FORME DU TEXTE — combien d'encadrés, de citations détachées et de
 * séparateurs un livre peut contenir.
 *
 * CONSTAT : les encadrés colorés (« INFORMATION »), les citations en exergue
 * et les séparateurs d'étoiles étaient autorisés presque partout (1 à 3 par
 * chapitre « quand ça apporte de la valeur »). Le modèle en met donc
 * systématiquement : c'est utile dans un guide, mais dans un livre de
 * développement personnel ou un récit, cela transforme la page en diaporama.
 *
 * Trois niveaux, choisis par l'auteur (ou déduits du type d'ouvrage) :
 *   - « aucune » : prose pure — aucun encadré, aucune citation détachée ;
 *   - « sobre »  : au plus UN élément mis en valeur par chapitre ;
 *   - « riche »  : encadrés utiles d'un guide pratique.
 *
 * La consigne est donnée au modèle ET appliquée après coup, de façon
 * déterministe : ce qui dépasse le niveau choisi est rendu en paragraphe
 * ordinaire (le texte n'est jamais perdu). Les couleurs ajoutées par le
 * modèle (attributs style) sont retirées.
 */

import type { WorkType } from "@/lib/book/work-type";
import type { BookGenre } from "@/lib/ai/book-style";

export type EnrichmentLevel = "aucune" | "sobre" | "riche";

export const ENRICHMENT_LEVELS: { id: EnrichmentLevel; label: string; description: string }[] = [
  { id: "aucune", label: "Prose pure", description: "Aucun encadré ni citation détachée : le texte seul, comme un roman." },
  { id: "sobre", label: "Sobre", description: "Au plus un passage mis en valeur par chapitre, quand il le mérite." },
  { id: "riche", label: "Pratique", description: "Encadrés conseils, mises en garde et « À retenir », pour un guide." },
];

export function isEnrichmentLevel(v: unknown): v is EnrichmentLevel {
  return v === "aucune" || v === "sobre" || v === "riche";
}

/** Niveau par défaut selon la nature et la forme de l'ouvrage. */
export function defaultEnrichment(genre: BookGenre, workType: WorkType): EnrichmentLevel {
  if (workType === "storybook" || genre === "fiction") return "aucune";
  if (workType === "guide") return "riche";
  return "sobre";
}

/** Consigne de mise en forme donnée au modèle pour le niveau choisi. */
export function enrichmentRules(level: EnrichmentLevel, genre: BookGenre): string {
  const sceneBreak =
    genre === "fiction"
      ? `- Changement de scène : un simple <div class="section-divider section-divider-line"></div>, uniquement quand le temps ou le lieu change vraiment. Jamais d'étoiles.`
      : `- AUCUN séparateur décoratif (étoiles, ornements, points) : les sous-titres <h2> suffisent à rythmer la page.`;

  if (level === "aucune") {
    return `MISE EN FORME : PROSE PURE (choix de l'auteur).
- Uniquement des paragraphes <p>${genre === "fiction" ? "" : ", des sous-titres <h2> quand c'est utile"} et, au besoin, <em> pour une insistance.
- INTERDIT : encadrés <div class="callout">, citations détachées <div class="pull-quote">, chiffres mis en exergue <div class="key-figure">, tableaux, couleurs, emojis.
${sceneBreak}`;
  }
  if (level === "sobre") {
    return `MISE EN FORME : SOBRE (choix de l'auteur).
- La prose porte tout. Tu peux mettre en valeur AU PLUS UN passage dans tout le chapitre, et seulement s'il le mérite vraiment : soit une citation détachée <div class="pull-quote">…</div> (une phrase forte tirée de ton propre texte), soit un encadré <div class="callout callout-tip">…</div>. Aucun des deux n'est obligatoire.
- Pas de couleurs, pas d'emojis, pas de tableaux décoratifs.
${sceneBreak}`;
  }
  return `MISE EN FORME : PRATIQUE (choix de l'auteur).
- Encadrés utiles, là où ils font gagner du temps au lecteur (deux à quatre par chapitre au plus) : <div class="callout callout-tip">…</div> (conseil), callout-warning (mise en garde), callout-example (exemple), callout-info (à retenir).
- Au plus une citation détachée <div class="pull-quote">…</div>.
- Pas de couleurs ajoutées, pas d'emojis.
${sceneBreak}`;
}

const BLOCK_RE = /<div\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;

/** Contenu d'un bloc rendu en paragraphe(s) ordinaire(s). */
function asParagraphs(inner: string): string {
  const trimmed = inner.trim();
  if (!trimmed) return "";
  // Un titre d'encadré (« INFORMATION », « À retenir ») n'a plus de sens hors encadré.
  const withoutLabel = trimmed.replace(/^<(?:strong|b|h[3-6])[^>]*>[^<]{0,40}<\/(?:strong|b|h[3-6])>\s*(?::\s*)?/i, "");
  return /<p\b/i.test(withoutLabel) ? withoutLabel : `<p>${withoutLabel}</p>`;
}

/**
 * Applique le niveau choisi à un chapitre généré. Déterministe, sans perte de
 * texte : un élément en trop redevient un paragraphe.
 */
export function enforceEnrichment(html: string, level: EnrichmentLevel, genre: BookGenre): string {
  if (!html) return html;
  let highlights = 0; // callouts + pull-quotes conservés
  let callouts = 0;
  let pullQuotes = 0;
  let dividers = 0;

  let out = html.replace(BLOCK_RE, (whole, cls: string, inner: string) => {
    const c = cls.toLowerCase();
    if (/\bsection-divider\b/.test(c)) {
      if (genre !== "fiction") return "";
      dividers++;
      return dividers <= 4 ? `<div class="section-divider section-divider-line"></div>` : "";
    }
    if (/\bpull-quote\b/.test(c)) {
      const keep = level !== "aucune" && pullQuotes < 1 && (level === "riche" || highlights < 1);
      if (!keep) return asParagraphs(inner);
      pullQuotes++;
      highlights++;
      return whole;
    }
    if (/\bcallout\b/.test(c)) {
      const keep =
        level === "riche" ? callouts < 4 : level === "sobre" ? genre !== "fiction" && highlights < 1 : false;
      if (!keep) return asParagraphs(inner);
      callouts++;
      highlights++;
      return whole;
    }
    if (/\bkey-figure\b/.test(c) && level === "aucune") return asParagraphs(inner);
    return whole;
  });

  // Couleurs et surlignages ajoutés par le modèle : le livre reste en noir sur blanc.
  out = out.replace(/\sstyle="[^"]*(?:color|background)[^"]*"/gi, "");
  out = out.replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, "$1");
  return out;
}
