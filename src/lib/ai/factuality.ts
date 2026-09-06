/**
 * FACTUALITÉ — la règle qui empêche Iris d'inventer des chiffres.
 *
 * CE QUI S'EST RÉELLEMENT PASSÉ. Les consignes de rédaction contenaient cette
 * ligne :
 *
 *     Chiffre marquant : <div class="key-figure">85% des entreprises…</div> (1-2 max)
 *
 * Un modèle de langage ne distingue pas un EXEMPLE DE MISE EN FORME d'une
 * CONSIGNE DE CONTENU. On lui montrait un pourcentage et on lui en demandait
 * « 1 à 2 par chapitre » : il a donc produit, chapitre après chapitre, des
 * pourcentages plausibles et faux. Le livre « L'Audace de Réussir » en contient
 * sept, dont « 85 % des entreprises mondiales prévoient… » — une recopie quasi
 * littérale de l'exemple du prompt. Ce n'était pas une dérive du modèle : le
 * système la commandait.
 *
 * DEUXIÈME CAUSE. `SEARCH_GROUNDING_INSTRUCTION` (« cite tes sources entre
 * crochets quand tu mentionnes un chiffre ») était injectée dès que la
 * recherche web était activée — même quand le pré-flight n'avait RIEN ramené
 * (clé Gemini morte, délai dépassé, outil indisponible). On demandait donc au
 * modèle de citer des sources qu'il n'avait pas : il les a inventées.
 *
 * LA RÈGLE ICI. Aucun exemple chiffré n'apparaît jamais dans un prompt, et le
 * droit d'avancer un chiffre dépend de la présence RÉELLE de données vérifiées.
 * Sans données : pas de statistique, point. Un livre sans chiffre inventé vaut
 * infiniment mieux qu'un livre qui en affiche sept.
 *
 * RÈGLE DE MAINTENANCE. Aucun texte de ce module destiné au modèle ne doit
 * contenir de chiffre d'exemple — pas même pour ILLUSTRER une interdiction.
 * Écrire « n'invente pas de pourcentage comme 70 % des dirigeants » replante
 * exactement le motif qu'on cherche à supprimer. Un test échoue si un chiffre
 * réapparaît dans un prompt (voir __tests__/factuality.test.ts).
 */

/** Le chapitre dispose-t-il de vraies données issues de la recherche web ? */
export function hasGroundedData(searchContext: string | undefined | null): boolean {
  return !!(searchContext && searchContext.trim().length > 0);
}

/**
 * Consignes de factualité à injecter dans TOUT prompt de rédaction non
 * fictionnelle. Le texte change selon qu'on dispose ou non de données réelles.
 */
export function factualityRules(searchContext?: string | null): string {
  if (hasGroundedData(searchContext)) {
    return `EXIGENCE DE FACTUALITÉ (données vérifiées disponibles) :
- Tu disposes ci-dessus de données factuelles issues de recherches web. Ce sont les SEULES sources chiffrées que tu as le droit d'utiliser.
- Chaque chiffre, date, pourcentage ou nom propre que tu avances doit provenir de ces données. Cite la source entre crochets : « … [Source: nom, année] ».
- N'extrapole pas au-delà de ce que disent ces données, et n'en arrondis pas les valeurs pour les rendre plus frappantes.
- Pour tout ce qui n'est pas couvert par ces données, raisonne et explique SANS chiffrer.`;
  }

  return `EXIGENCE DE FACTUALITÉ (aucune donnée vérifiée disponible) :
- Tu n'as accès à AUCUNE source vérifiée pour ce chapitre. Tu dois donc écrire SANS AUCUN CHIFFRE.
- INTERDIT : les pourcentages, les statistiques d'étude, les parts de marché, les montants, les classements chiffrés, et toute date précise que tu ne pourrais pas garantir.
- INTERDIT AUSSI : attribuer une citation, une étude ou une déclaration à une personne ou à une institution réelle. Un chiffre inventé assorti d'une source crédible est la faute la plus grave qu'un ouvrage puisse contenir : elle décrédibilise le livre entier et expose l'auteur.
- CE QU'IL FAUT FAIRE À LA PLACE : convaincre par le RAISONNEMENT, l'expérience concrète, la situation racontée et l'exemple vécu. Une formulation qualitative honnête (« beaucoup de dirigeants constatent que… ») vaut infiniment mieux qu'une statistique fabriquée.
- Tu peux évoquer des faits notoires et non chiffrés (le parcours public d'une personnalité, un événement historique largement connu) tant que tu n'y accroches ni statistique ni citation exacte.
- Si un chiffre te semble vraiment indispensable au propos, écris l'ordre de grandeur en toutes lettres et signale-le : « (donnée à vérifier par l'auteur) ».`;
}

/**
 * Éléments de mise en forme autorisés pour les CHIFFRES, selon la disponibilité
 * de données réelles. Renvoie une chaîne vide quand il n'y a rien à autoriser —
 * on ne mentionne alors même pas l'existence de `key-figure`, pour ne pas
 * suggérer au modèle d'en fabriquer un.
 */
export function keyFigureRule(searchContext?: string | null): string {
  if (!hasGroundedData(searchContext)) return "";
  return `- Chiffre marquant tiré des données vérifiées ci-dessus : <div class="key-figure">…</div> (1 maximum, et uniquement si le chiffre provient réellement de ces données).`;
}

/**
 * Motifs de chiffres non sourcés, pour le contrôle qualité effectué APRÈS la
 * génération (voir `auditChapter`). On ne réécrit rien automatiquement — un
 * chiffre supprimé au milieu d'une phrase la casserait — mais on signale, et
 * l'appareil de mise en valeur (`key-figure`) est retiré quand il ne s'appuie
 * sur rien : un chiffre inventé mis en exergue est bien pire qu'un chiffre
 * inventé noyé dans un paragraphe.
 */
const UNSOURCED_FIGURE_RE = /(\d{1,3}\s*(?:%|pour cent|p\.\s?100))/gi;
const SOURCE_MARKER_RE = /\[\s*source\s*:/i;

export interface FactualityReport {
  /** Pourcentages trouvés dans le texte. */
  figures: string[];
  /** Le texte cite-t-il au moins une source ? */
  hasSourceMarker: boolean;
  /** Chiffres mis en exergue via key-figure. */
  keyFigures: string[];
  /** Vrai si le chapitre avance des chiffres sans la moindre source. */
  suspicious: boolean;
}

/** Analyse un chapitre généré et signale les chiffres non sourcés. */
export function analyzeFactuality(html: string): FactualityReport {
  const text = (html || "").replace(/<[^>]*>/g, " ");
  const figures = Array.from(text.matchAll(UNSOURCED_FIGURE_RE), (m) => m[1].trim());
  const keyFigures = Array.from(
    (html || "").matchAll(/<div\s+class="[^"]*\bkey-figure\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
    (m) => m[1].replace(/<[^>]*>/g, "").trim()
  );
  const hasSourceMarker = SOURCE_MARKER_RE.test(text);
  return {
    figures,
    hasSourceMarker,
    keyFigures,
    suspicious: figures.length > 0 && !hasSourceMarker,
  };
}

/**
 * Dégrade les encadrés `key-figure` en paragraphes ordinaires quand le
 * chapitre n'a AUCUNE source. Le texte est conservé mot pour mot (le supprimer
 * casserait le fil du propos) mais il cesse d'être présenté comme une donnée
 * vérifiée en gros caractères au milieu de la page.
 */
export function demoteUnsourcedKeyFigures(html: string, searchContext?: string | null): string {
  if (hasGroundedData(searchContext)) return html;
  if (!html) return html;
  return html.replace(
    /<div\s+class="[^"]*\bkey-figure\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, inner: string) => `<p>${inner.trim()}</p>`
  );
}
