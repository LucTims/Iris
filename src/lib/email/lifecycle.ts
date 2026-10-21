import {
  DEFAULT_WRITING_MODEL,
  OUTLINE_MAX_COINS,
  PLAN_MAX_COINS,
  estimateChapterCoins,
  maxChargeForQuote,
} from "@/lib/ai/pricing";

/**
 * Séquence d'e-mails d'activation. Module PUR (aucune dépendance serveur) :
 * le choix de l'e-mail et son contenu sont testables sans base ni Resend.
 *
 *  - start_d1         : J+1, aucun livre créé.
 *  - first_chapter_d3 : J+3, un livre mais aucun chapitre rédigé.
 *  - keep_going_d7    : J+7, des chapitres rédigés puis plus d'activité depuis 3 jours.
 *
 * Chaque e-mail n'est envoyé qu'une fois par compte (table lifecycle_emails),
 * et au plus un e-mail par compte et par passage de la tâche planifiée.
 */

export type LifecycleKind = "start_d1" | "first_chapter_d3" | "keep_going_d7";

export type LifecycleCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  has_project: boolean;
  has_written_chapter: boolean;
  last_activity: string | null;
  balance: number;
  sent_kinds: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function chooseLifecycleEmail(c: LifecycleCandidate, now: Date = new Date()): LifecycleKind | null {
  const ageDays = (now.getTime() - new Date(c.created_at).getTime()) / DAY_MS;
  const sent = new Set(c.sent_kinds ?? []);
  const inactiveDays = c.last_activity
    ? (now.getTime() - new Date(c.last_activity).getTime()) / DAY_MS
    : Infinity;

  if (!c.has_project) {
    return ageDays >= 1 && !sent.has("start_d1") ? "start_d1" : null;
  }
  if (!c.has_written_chapter) {
    return ageDays >= 3 && !sent.has("first_chapter_d3") ? "first_chapter_d3" : null;
  }
  return ageDays >= 7 && inactiveDays >= 3 && !sent.has("keep_going_d7") ? "keep_going_d7" : null;
}

/** Nombre de chapitres (modèle par défaut, pire cas) que couvre un solde, plan éventuellement inclus. */
export function chaptersCoveredBy(balance: number, includePlan: boolean): number {
  const chapterMax = maxChargeForQuote(estimateChapterCoins(800, DEFAULT_WRITING_MODEL));
  // Prudence : on réserve aussi la structure du livre, comme le tableau de bord.
  const available = Math.max(0, balance - (includePlan ? PLAN_MAX_COINS + OUTLINE_MAX_COINS : 0));
  return Math.floor(available / chapterMax);
}

type EmailContent = { subject: string; html: string; text: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function layout(opts: {
  greeting: string;
  paragraphs: string[];
  cta: { label: string; url: string };
  unsubscribeUrl: string;
}): string {
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("\n");
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a;line-height:1.5">
  <h2 style="color:#C8472B;margin:0 0 16px">${opts.greeting}</h2>
  ${body}
  <p style="text-align:center;margin:28px 0">
    <a href="${opts.cta.url}" style="background:#C8472B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${opts.cta.label}</a>
  </p>
  <p style="font-size:13px;color:#666">L'équipe Iris · irisboom.online</p>
  <p style="font-size:11px;color:#999">Vous recevez cet e-mail car vous avez créé un compte Iris.
  <a href="${opts.unsubscribeUrl}" style="color:#999">Ne plus recevoir ces conseils</a>.</p>
</div>`;
}

export function buildLifecycleEmail(
  kind: LifecycleKind,
  c: Pick<LifecycleCandidate, "full_name" | "balance">,
  urls: { siteUrl: string; unsubscribeUrl: string }
): EmailContent {
  const firstName = (c.full_name || "").trim().split(/\s+/)[0];
  const hello = firstName ? `Bonjour ${escapeHtml(firstName)} 👋` : "Bonjour 👋";
  const helloText = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const balance = Math.max(0, Math.floor(c.balance));
  const footerText = `\n\nL'équipe Iris · irisboom.online\nNe plus recevoir ces conseils : ${urls.unsubscribeUrl}`;

  if (kind === "start_d1") {
    const chapters = chaptersCoveredBy(balance, true);
    const url = `${urls.siteUrl}/projects/new`;
    const paragraphs = [
      `Votre compte Iris est prêt, et <strong>${balance} pièces</strong> vous attendent : de quoi générer le plan complet de votre livre et en écrire les ${chapters} premiers chapitres, sans rien payer.`,
      `Il suffit d'une idée, même en une phrase. Iris propose le titre, le plan, puis rédige les chapitres avec vous :`,
      `1. Décrivez votre idée de livre<br>2. Validez le plan proposé<br>3. Lancez l'écriture du premier chapitre`,
      `Comptez une dizaine de minutes pour voir les premières pages de votre livre.`,
    ];
    return {
      subject: "Votre premier livre vous attend (500 pièces offertes)",
      html: layout({ greeting: hello, paragraphs, cta: { label: "Créer mon livre", url }, unsubscribeUrl: urls.unsubscribeUrl }),
      text: `${helloText}\n\nVotre compte Iris est prêt et ${balance} pièces vous attendent : de quoi générer le plan de votre livre et en écrire les ${chapters} premiers chapitres.\n\n1. Décrivez votre idée de livre\n2. Validez le plan proposé\n3. Lancez l'écriture du premier chapitre\n\nCréer mon livre : ${url}${footerText}`,
    };
  }

  if (kind === "first_chapter_d3") {
    const chapters = chaptersCoveredBy(balance, false);
    const url = `${urls.siteUrl}/projects`;
    const paragraphs = [
      `Votre livre est créé : il ne reste plus qu'à écrire le premier chapitre.`,
      `Ouvrez votre projet et cliquez sur « Générer » : Iris rédige le chapitre en suivant votre plan, puis vous le relisez et l'ajustez comme vous voulez.`,
      `Avec vos <strong>${balance} pièces</strong>, vous pouvez déjà écrire environ ${chapters} chapitres.`,
    ];
    return {
      subject: "Votre plan est prêt : écrivons le chapitre 1",
      html: layout({ greeting: hello, paragraphs, cta: { label: "Écrire mon premier chapitre", url }, unsubscribeUrl: urls.unsubscribeUrl }),
      text: `${helloText}\n\nVotre livre est créé : il ne reste plus qu'à écrire le premier chapitre. Ouvrez votre projet et cliquez sur « Générer ». Avec vos ${balance} pièces, vous pouvez écrire environ ${chapters} chapitres.\n\nMes livres : ${url}${footerText}`,
    };
  }

  const url = `${urls.siteUrl}/projects`;
  const paragraphs = [
    `Votre livre a bien avancé : les premiers chapitres sont écrits.`,
    `Continuez sur votre lancée : terminez les chapitres restants, ajoutez une couverture, puis exportez votre livre en PDF ou Word, prêt à être publié.`,
    `Vos chapitres vous attendent exactement là où vous les avez laissés.`,
  ];
  return {
    subject: "Votre livre vous attend, il ne manque plus grand-chose",
    html: layout({ greeting: hello, paragraphs, cta: { label: "Reprendre mon livre", url }, unsubscribeUrl: urls.unsubscribeUrl }),
    text: `${helloText}\n\nVotre livre a bien avancé. Terminez les chapitres restants, ajoutez une couverture et exportez-le en PDF ou Word.\n\nReprendre mon livre : ${url}${footerText}`,
  };
}
