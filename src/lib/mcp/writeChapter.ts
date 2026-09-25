import type { SupabaseClient } from "@supabase/supabase-js";
import { MCP_COINS_PER_PAGE, WORDS_PER_PAGE, pagesFromWords } from "@/lib/ai/pricing";
import { chapterBodyWordCount, normalizeLlmChapterContent } from "@/lib/mcp/chapterContent";

/**
 * Écriture d'un chapitre par un LLM via MCP, FACTURÉE en pièces.
 *
 * Constat en production : un livre entier écrit par un LLM via MCP n'avait
 * débité aucune pièce — l'outil enregistrait le texte sans jamais passer par
 * le portefeuille. Désormais :
 *   - le contenu est converti au format du manuscrit (voir chapterContent) ;
 *   - chaque PAGE AJOUTÉE est facturée MCP_COINS_PER_PAGE (tarif de la
 *     rédaction par défaut de l'éditeur). Réenregistrer un chapitre, le
 *     corriger ou le réécrire sans l'allonger ne coûte rien : un LLM qui
 *     retente un appel ou peaufine un passage ne paie pas deux fois ;
 *   - le débit a lieu AVANT l'enregistrement (solde insuffisant ⇒ rien n'est
 *     écrit) et il est remboursé si l'enregistrement échoue ;
 *   - l'écriture est conditionnelle (le chapitre ne doit pas avoir changé
 *     depuis sa lecture) : deux écritures simultanées du même chapitre ne
 *     facturent pas deux fois les mêmes pages.
 */

export interface WriteChapterInput {
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string;
}

export type WriteChapterResult =
  | {
      status: "saved";
      created: boolean;
      wordCount: number;
      pages: number;
      billedPages: number;
      coinsCharged: number;
      balance: number | null;
    }
  | { status: "not_found" }
  | { status: "insufficient_funds"; required: number; billedPages: number; balance: number }
  | { status: "error"; message: string };

const MAX_ATTEMPTS = 3;

async function readBalance(db: SupabaseClient, userId: string): Promise<number | null> {
  const { data } = await db.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
  return typeof data?.balance === "number" ? data.balance : null;
}

export async function writeChapterWithBilling(
  db: SupabaseClient,
  userId: string,
  input: WriteChapterInput
): Promise<WriteChapterResult> {
  const { bookId, chapterNumber } = input;
  const title = input.title.trim() || `Chapitre ${chapterNumber}`;

  // Le projet doit appartenir à l'utilisateur de la clé API : sans ce
  // contrôle, n'importe quelle clé valide écrirait dans le livre d'un autre.
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectError) return { status: "error", message: projectError.message };
  if (!project) return { status: "not_found" };

  const normalized = normalizeLlmChapterContent(input.content, {
    title,
    // Comme dans la rédaction intégrée : chaque chapitre ouvre une nouvelle
    // page, sauf le tout premier du livre.
    startsOnNewPage: chapterNumber > 1,
  });
  const pages = pagesFromWords(normalized.bodyWordCount);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: existing, error: readError } = await db
      .from("chapters")
      .select("id, content, updated_at")
      .eq("project_id", bookId)
      .eq("number", chapterNumber)
      .maybeSingle();
    if (readError) return { status: "error", message: readError.message };

    const billedPages = Math.max(0, pages - pagesFromWords(chapterBodyWordCount(existing?.content)));
    const cost = billedPages * MCP_COINS_PER_PAGE;

    // 1. DÉBIT — avant toute écriture.
    if (cost > 0) {
      const { error: debitError } = await db.rpc("process_ai_cost", {
        p_user_id: userId,
        p_amount: cost,
        p_description: `Rédaction par assistant IA (MCP) — Chapitre ${chapterNumber} : ${title}`.slice(0, 250),
        p_metadata: {
          source: "mcp",
          project_id: bookId,
          chapter_number: chapterNumber,
          pages,
          billed_pages: billedPages,
          coins_per_page: MCP_COINS_PER_PAGE,
          words_per_page: WORDS_PER_PAGE,
        },
      });
      if (debitError) {
        if (/insufficient/i.test(debitError.message)) {
          return { status: "insufficient_funds", required: cost, billedPages, balance: (await readBalance(db, userId)) ?? 0 };
        }
        return { status: "error", message: `Débit des pièces impossible : ${debitError.message}` };
      }
    }

    // 2. ÉCRITURE CONDITIONNELLE.
    const now = new Date().toISOString();
    const fields = {
      title,
      content: normalized.html,
      word_count: normalized.wordCount,
      status: normalized.bodyWordCount > 0 ? "Terminé" : "Brouillon",
      updated_at: now,
    };
    let conflict = false;
    let writeError: { message: string } | null = null;

    if (existing) {
      let update = db.from("chapters").update(fields).eq("id", existing.id);
      update = existing.updated_at ? update.eq("updated_at", existing.updated_at) : update;
      const { data: updated, error } = await update.select("id");
      writeError = error;
      conflict = !error && (!updated || updated.length === 0);
    } else {
      const { error } = await db.from("chapters").insert({ project_id: bookId, number: chapterNumber, ...fields });
      conflict = error?.code === "23505"; // un autre appel a créé ce chapitre entre-temps
      writeError = conflict ? null : error;
    }

    if (writeError || conflict) {
      // 3. REMBOURSEMENT : rien n'a été écrit, rien ne doit rester débité.
      if (cost > 0) {
        const { error: refundError } = await db.rpc("credit_wallet_coins", {
          p_user_id: userId,
          p_amount: cost,
          p_description: `Remboursement — chapitre ${chapterNumber} non enregistré (MCP)`,
          p_metadata: { source: "mcp_refund", project_id: bookId, chapter_number: chapterNumber },
        });
        if (refundError) {
          console.error("[MCP write_chapter] Remboursement impossible:", userId, cost, refundError);
        }
      }
      if (writeError) return { status: "error", message: writeError.message };
      continue; // conflit : on relit le chapitre et on recalcule les pages à facturer
    }

    await db.from("projects").update({ updated_at: now }).eq("id", bookId);

    return {
      status: "saved",
      created: !existing,
      wordCount: normalized.wordCount,
      pages,
      billedPages,
      coinsCharged: cost,
      balance: await readBalance(db, userId),
    };
  }

  return { status: "error", message: "Le chapitre est modifié en parallèle ; réessayez." };
}
