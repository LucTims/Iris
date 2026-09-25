/**
 * Suivi d'un job « Générer tout le livre » dans l'éditeur (voir
 * /api/generate-book/status) : ce que l'auteur lit quand la rédaction
 * s'arrête avant la fin.
 */

export interface BookJobSnapshot {
  id: string;
  status: string;
  current_index: number;
  total: number;
  last_error: string | null;
}

const RESUME_HINT =
  "Les chapitres déjà rédigés sont enregistrés : cliquez sur « Continuer la rédaction » pour écrire les chapitres restants";

/** Message affiché quand un job s'arrête en échec, selon la cause enregistrée par le serveur. */
export function bookJobFailureMessage(job: Pick<BookJobSnapshot, "last_error">): string {
  if (job.last_error === "insufficient_funds") {
    return `Pièces insuffisantes pour continuer la rédaction. ${RESUME_HINT} après avoir rechargé votre solde.`;
  }
  if (job.last_error === "stalled") {
    return `La rédaction s'est interrompue. ${RESUME_HINT}.`;
  }
  return `Une erreur est survenue pendant la rédaction. ${RESUME_HINT}, ou changez de modèle.`;
}
