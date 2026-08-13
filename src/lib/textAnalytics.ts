/**
 * Calcule le nombre de mots réels à partir d'une chaîne HTML.
 * Retire toutes les balises HTML et compte les mots.
 */
export function countWordsInHtml(htmlString: string | null | undefined): number {
  if (!htmlString) return 0;
  
  // Supprime les balises HTML
  const textContent = htmlString.replace(/<[^>]*>?/gm, " ");
  
  // Nettoie les espaces multiples et compte
  const words = textContent.trim().split(/\s+/);
  
  // Si le résultat est juste un espace vide
  if (words.length === 1 && words[0] === "") return 0;
  
  return words.length;
}

/**
 * Calcule une estimation du nombre de pages standard KDP (6x9).
 * Moyenne habituelle de l'édition : 250 mots par page.
 */
export function calculatePages(words: number): number {
  return Math.ceil(words / 250);
}

/**
 * Estime le temps de lecture d'un texte.
 * Base : un adulte lit en moyenne 200 à 250 mots par minute. On prend 200.
 * Retourne une chaîne formatée (ex: "2 h 15 min" ou "45 min").
 */
export function estimateReadingTime(words: number): string {
  if (words === 0) return "0 min";
  
  const totalMinutes = Math.ceil(words / 200);
  
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

/**
 * Calcule un coût estimatif des générations IA en fonction du nombre de mots.
 * Exemple: 0.05 € pour 1000 mots générés.
 */
export function estimateCost(words: number): string {
  const cost = (words / 1000) * 0.05;
  return cost.toFixed(2) + " €";
}
