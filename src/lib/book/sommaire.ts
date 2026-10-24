import { assignChapterLabels, type ChapterNoun } from "@/lib/book/chapter-heading";

/**
 * Sommaire généré par Iris — lecture et mise en forme.
 *
 * Format stocké (chapitre « Sommaire », HTML de l'éditeur) :
 *   <h1>Sommaire</h1>
 *   <ul>
 *     <li><p><strong>Chapitre 1 : Titre</strong></p>
 *         <p><em>Aperçu facultatif (récits)</em></p>
 *         <ul><li><p>Intertitre</p></li>…</ul></li>
 *   </ul>
 * Comme dans un livre publié : un titre par chapitre, ses grandes sections en
 * retrait. L'ancien format « <strong>Titre</strong> — aperçu » reste lisible.
 */

export interface SommaireEntry {
  title: string;
  /** Aperçu en prose (récits, ou ancien format). */
  brief: string;
  /** Intertitres prévus (sous-liste). */
  sections: string[];
}

function clean(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const isTocTitle = (t: string) => /^\s*(sommaire|table des mati)/i.test(t);

/**
 * Découpe la PREMIÈRE liste du HTML en entrées de premier niveau, avec leurs
 * sous-éléments. Parcours par balises (pas de regex imbriquées) : robuste aux
 * listes dans les listes.
 */
function topLevelItems(html: string): { own: string; children: string[] }[] {
  const parts = html.split(/(<\/?(?:ul|ol|li)\b[^>]*>)/i);
  const items: { own: string; children: string[] }[] = [];
  let listDepth = 0;
  let started = false;
  let current: { own: string; children: string[] } | null = null;
  let child: string | null = null;

  for (const part of parts) {
    if (!part) continue;
    const tag = part.match(/^<(\/?)(ul|ol|li)\b/i);
    if (tag) {
      const closing = tag[1] === "/";
      const name = tag[2].toLowerCase();
      if (name === "ul" || name === "ol") {
        if (!closing) {
          if (listDepth === 0 && started) break; // seule la première liste compte
          listDepth += 1;
          started = true;
        } else {
          listDepth = Math.max(0, listDepth - 1);
        }
      } else if (!closing) {
        if (listDepth === 1) current = { own: "", children: [] };
        else if (listDepth === 2) child = "";
      } else {
        if (listDepth === 1 && current) {
          items.push(current);
          current = null;
        } else if (listDepth === 2 && child !== null && current) {
          current.children.push(child);
          child = null;
        }
      }
      continue;
    }
    if (listDepth === 2 && child !== null) child += part;
    else if (listDepth === 1 && current) current.own += part;
  }
  return items;
}

export function parseSommaire(html: string): SommaireEntry[] {
  if (!html) return [];
  const entries: SommaireEntry[] = [];
  for (const item of topLevelItems(html)) {
    const strong = item.own.match(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/i);
    let title: string;
    let brief: string;
    if (strong) {
      title = clean(strong[2]);
      brief = clean(item.own.replace(strong[0], "")).replace(/^[\s—–:-]+/, "").trim();
    } else {
      const text = clean(item.own);
      const sep = text.split(/\s[—–-]\s/);
      title = sep[0].trim();
      brief = sep.length > 1 ? sep.slice(1).join(" — ").trim() : "";
    }
    const sections = item.children.map(clean).filter((t) => t.length > 1);
    if (title.length > 1 && !isTocTitle(title)) entries.push({ title, brief, sections });
  }

  if (entries.length === 0) {
    // Repli : sommaire rédigé en intertitres plutôt qu'en liste.
    for (const m of html.matchAll(/<(?:h2|h3)[^>]*>([\s\S]*?)<\/(?:h2|h3)>/gi)) {
      const title = clean(m[1]);
      if (title.length > 2 && !/sommaire|table des mati/i.test(title)) entries.push({ title, brief: "", sections: [] });
    }
  }

  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.title) ? false : (seen.add(e.title), true))).slice(0, 24);
}

/** Consigne donnée à la rédaction d'un chapitre à partir de son entrée de sommaire. */
export function sommaireBrief(entry: SommaireEntry): string {
  if (entry.brief && entry.sections.length) return `${entry.brief} Sections prévues : ${entry.sections.join(" ; ")}.`;
  if (entry.brief) return entry.brief;
  if (entry.sections.length) return `Sections prévues : ${entry.sections.join(" ; ")}.`;
  return "";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Remet un sommaire généré au format d'un livre publié : étiquettes définitives
 * (« Chapitre 3 : … », « Introduction », jamais de double préfixe), intertitres
 * en retrait, aperçus éventuels en italique sur leur propre ligne. Renvoie le
 * HTML d'origine si la structure n'est pas reconnue.
 */
export function formatSommaireHtml(html: string, noun: ChapterNoun = "Chapitre"): string {
  const entries = parseSommaire(html);
  if (entries.length < 2) return html;
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const tocTitle = heading && /table des mati/i.test(clean(heading[1])) ? "Table des matières" : "Sommaire";
  const labels = assignChapterLabels(entries.map((e) => ({ title: e.title })), noun);

  const items = entries.map((e, i) => {
    const sub = e.sections.length
      ? `<ul>${e.sections.map((s) => `<li><p>${esc(s)}</p></li>`).join("")}</ul>`
      : "";
    const brief = e.brief ? `<p><em>${esc(e.brief)}</em></p>` : "";
    return `<li><p><strong>${esc(labels[i].heading)}</strong></p>${brief}${sub}</li>`;
  });
  return `<h1>${tocTitle}</h1><ul>${items.join("")}</ul>`;
}
