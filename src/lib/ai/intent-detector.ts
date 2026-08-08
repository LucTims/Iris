export interface ChapterItem {
  id?: string | number;
  title?: string;
  content?: string;
  number?: number;
  index?: number;
  wordCount?: number;
}

export interface ExtendedChatApiRequest {
  messages: Array<{
    sender?: string;
    role?: string;
    text?: string;
    content?: string;
  }>;
  context?: {
    title?: string;
    synopsis?: string;
    tone?: string;
    chapters?: ChapterItem[];
    currentChapterContent?: string;
    projectId?: string;
  };
  chapters?: ChapterItem[];
  activeChapterIndex?: number;
  model?: string;
  projectId?: string;
}

export interface ResolvedTargetChapter {
  targetIndex: number;
  targetChapter: ChapterItem | null;
  targetTitle: string;
  targetContent: string;
}

/**
 * Detects whether the user's latest prompt indicates a desire to modify a chapter
 * or is a general chat query.
 */
export function detectIntent(userPrompt: string, messages?: Array<any>): "CHAT_ONLY" | "MODIFY_CHAPTER" {
  if (!userPrompt || !userPrompt.trim()) return "CHAT_ONLY";

  const lower = userPrompt.toLowerCase().trim();

  // 1. Direct request to apply/do on book or manuscript ("tu peux le faire sur le livre ?", "fais-le sur le livre", "applique la modification", "intègre dans le livre")
  const applyOnBookRegex = /(tu peux (le faire|l'intégrer|l'ajouter|le mettre)|fais-le|fais le|applique|intègre|integre|mets-le|met le|sur le livre|dans le livre|dans le manuscrit|sur le manuscrit|directement)/i;
  if (applyOnBookRegex.test(lower) && /(livre|manuscrit|fais|fait|procède|procede|intègre|integre|applique|va|vais|ouais|oui|ok)/i.test(lower)) {
    return "MODIFY_CHAPTER";
  }

  // 2. Short confirmation response ("oui va y", "oui", "fais-le", "ok", "go", "d'accord", "vas-y", "procède") after assistant offered modification
  const isShortConfirmation = /^(oui|oui va y|vas-y|vas y|va y|go|ok|d'accord|daccord|fais-le|fais le|procède|procede|parfait|je veux bien|absolument|volontiers|d'acc)$/i.test(lower);
  
  if (isShortConfirmation && Array.isArray(messages) && messages.length >= 2) {
    const aiMessages = messages.filter((m: any) => m.sender === "ai" || m.role === "assistant");
    const lastAiMsg = aiMessages.length > 0 ? (aiMessages[aiMessages.length - 1].text || aiMessages[aiMessages.length - 1].content || "") : "";
    
    if (/(procéder|proceder|mise à jour|remplacer|intégrer|integre|réécrire|modifier|chapitre|manuscrit|prêt|pret|version)/i.test(lastAiMsg)) {
      return "MODIFY_CHAPTER";
    }
  }

  // 3. Direct writing / editing action verbs in French & English
  const actionVerbsRegex = /\b(approfondi|approfondis|approfondir|développe|developpe|développer|developper|réécris|reecris|réécrire|reecrire|modifie|modifier|enrichis|enrichir|rallonge|rallonger|raccourcis|raccourcir|retravaille|retravailler|corrige|corriger|reformule|reformuler|remplace|remplacer|ajoute|ajouter|écris|ecris|écrire|ecrire|rédige|redige|rédiger|rediger)\b/i;

  // 4. Document target entities (partie, chapitre, section, manuscrit, texte, extrait, livre, paragraphe, contenu)
  const targetEntitiesRegex = /\b(chapitre|chap|chapter|partie|section|manuscrit|texte|extrait|livre|paragraphe|contenu|page)\b/i;

  // 5. Deictic / Demonstrative references (cette partie, ce chapitre, cette section, ce texte, la 3ème partie, etc.)
  const deicticRefRegex = /\b(cette|ce|cet|le|la|les|mon|notre|cette partie|ce chapitre|cette section)\b/i;

  // 6. Explicit writing orders (tu vas écrire, je voudrais que l'on approfondisse, peux-tu rédiger...)
  const writingOrderRegex = /(tu vas|je voudrais|peux-tu|pourrais-tu|merci de|va)\s*(écrire|ecrire|rédiger|redige|rediger|développer|developper|approfondir|réécrire|reecrire|modifier|enrichir)/i;

  // Rule A: Explicit writing order
  if (writingOrderRegex.test(lower)) {
    return "MODIFY_CHAPTER";
  }

  // Rule B: Action verb + target entity or deictic reference
  if (actionVerbsRegex.test(lower) && (targetEntitiesRegex.test(lower) || deicticRefRegex.test(lower))) {
    return "MODIFY_CHAPTER";
  }

  // Rule C: Combination of chapter/part mention + action verb
  const mentionsChapterOrPart = /\b(chapitre|chap|chapter|partie|section|manuscrit|texte)\b/i.test(lower);
  const actionVerbs = /\b(ajoute|mets|supprime|reformule|ameliore|améliore|transforme|adapte|révise|revise|edite|édite|écris|ecris|réécris|reecris|développe|developpe|approfondis|enrichis|allonge)\b/i.test(lower);

  if (mentionsChapterOrPart && actionVerbs) {
    return "MODIFY_CHAPTER";
  }

  return "CHAT_ONLY";
}

/**
 * Normalizes text by lowercasing, stripping accents, removing punctuation, and collapsing whitespace.
 */
function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * French ordinal word/notation map to 1-based chapter numbers.
 */
const FRENCH_ORDINAL_MAP: Record<string, number> = {
  premier: 1,
  premiere: 1,
  premiers: 1,
  premieres: 1,
  '1er': 1,
  '1ere': 1,
  second: 2,
  seconde: 2,
  seconds: 2,
  deuxieme: 2,
  deuxiemes: 2,
  '2e': 2,
  '2eme': 2,
  troisieme: 3,
  troisiemes: 3,
  '3e': 3,
  '3eme': 3,
  quatrieme: 4,
  quatriemes: 4,
  '4e': 4,
  '4eme': 4,
  cinquieme: 5,
  cinquiemes: 5,
  '5e': 5,
  '5eme': 5,
  sixieme: 6,
  sixiemes: 6,
  '6e': 6,
  '6eme': 6,
  septieme: 7,
  septiemes: 7,
  '7e': 7,
  '7eme': 7,
  huitieme: 8,
  huitiemes: 8,
  '8e': 8,
  '8eme': 8,
  neuvieme: 9,
  neuviemes: 9,
  '9e': 9,
  '9eme': 9,
  dixieme: 10,
  dixiemes: 10,
  '10e': 10,
  '10eme': 10,
};

function parseFrenchOrdinal(prompt: string): number | null {
  const normPrompt = normalizeText(prompt);
  const words = normPrompt.split(/\s+/);
  for (const word of words) {
    if (FRENCH_ORDINAL_MAP[word] !== undefined) {
      return FRENCH_ORDINAL_MAP[word];
    }
  }
  return null;
}

/**
 * Identifies the target chapter from user prompt, available chapters list, or activeChapterIndex fallback.
 */
export function resolveTargetChapter(params: {
  userPrompt: string;
  chapters?: ChapterItem[];
  activeChapterIndex?: number;
  currentChapterContent?: string;
  fallbackSynopsis?: string;
}): ResolvedTargetChapter {
  const { userPrompt, chapters = [], activeChapterIndex = 0, currentChapterContent = "", fallbackSynopsis = "" } = params;

  let targetIndex = typeof activeChapterIndex === "number" && activeChapterIndex >= 0 ? activeChapterIndex : 0;
  let targetChapter: ChapterItem | null = null;

  if (chapters && chapters.length > 0) {
    if (targetIndex >= chapters.length) {
      targetIndex = 0;
    }
    targetChapter = chapters[targetIndex];

    let foundIdx = -1;

    // 1. Try matching explicit chapter number (e.g. "chapitre 3", "chap 2", "chap. 1", "3ème chapitre")
    const numMatch = userPrompt.match(/chapitre\s*(?:n°\s*)?(\d+)/i) || 
                     userPrompt.match(/chap\.\s*(\d+)/i) ||
                     userPrompt.match(/(\d+)(?:er|ère|ere|ème|eme|e)?\s*chapitre/i) ||
                     userPrompt.match(/ch\.\s*(\d+)/i);

    if (numMatch) {
      const requestedNum = parseInt(numMatch[1], 10);
      foundIdx = chapters.findIndex((c, idx) => 
        c.number === requestedNum || 
        (typeof c.index === "number" && c.index + 1 === requestedNum) || 
        idx + 1 === requestedNum
      );
    }

    // 2. Try matching French ordinal words (e.g. "premier", "second", "deuxième", "2e", "troisième")
    if (foundIdx === -1) {
      const ordinalNum = parseFrenchOrdinal(userPrompt);
      if (ordinalNum !== null) {
        foundIdx = chapters.findIndex((c, idx) => 
          c.number === ordinalNum || 
          (typeof c.index === "number" && c.index + 1 === ordinalNum) || 
          idx + 1 === ordinalNum
        );
      }
    }

    // 3. Try matching chapter title or subtitle in prompt with text normalization
    if (foundIdx === -1) {
      const normPrompt = normalizeText(userPrompt);

      if (normPrompt.length > 0) {
        foundIdx = chapters.findIndex((c) => {
          if (!c.title) return false;

          const normTitle = normalizeText(c.title);
          if (normTitle.length > 2 && normPrompt.includes(normTitle)) {
            return true;
          }

          // Strip leading chapter prefix ("Chapitre X : ", "Chap. X - ", etc.)
          const rawSubtitle = c.title.replace(/^(?:chapitre|chap|ch)?\s*\d*\s*[:.\-–—]?\s*/i, "").trim();
          const normSubtitle = normalizeText(rawSubtitle);

          if (normSubtitle.length > 2 && normPrompt.includes(normSubtitle)) {
            return true;
          }

          return false;
        });
      }
    }

    // 4. Try matching internal headings or section names in content if no chapter index matched
    if (foundIdx === -1) {
      const normPrompt = normalizeText(userPrompt);
      foundIdx = chapters.findIndex((c) => {
        if (!c.content) return false;
        const headings = (c.content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [])
          .map(h => normalizeText(h.replace(/<[^>]*>/g, '')));
        return headings.some(h => h.length > 2 && (normPrompt.includes(h) || h.includes(normPrompt)));
      });
    }

    if (foundIdx !== -1) {
      targetIndex = foundIdx;
      targetChapter = chapters[foundIdx];
    }
  }

  const targetTitle = targetChapter?.title || `Chapitre ${targetIndex + 1}`;
  const targetContent = targetChapter?.content || currentChapterContent || fallbackSynopsis || "";

  return {
    targetIndex,
    targetChapter,
    targetTitle,
    targetContent,
  };
}

