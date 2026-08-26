/**
 * Packs de pièces — SOURCE UNIQUE de vérité (pur, importable partout :
 * page /pricing, /api/checkout, webhook SEBPay, admin).
 *
 * `coins` = total crédité (bonus inclus). `priceFcfa` = prix de vente en XOF.
 * Le crédit après paiement se fait par `id` (fiable), avec repli sur le montant.
 */
export interface CoinPack {
  id: string;
  name: string;
  priceFcfa: number;
  coins: number; // total crédité, bonus inclus
  bonus: number; // part de bonus (pour l'affichage)
  popular?: boolean;
  tagline: string;
  approxPages: string;
  showOnPricing: boolean;
}

// `approxPages` : estimation avec le modèle par DÉFAUT (Standard = Gemini 2.5
// Flash, ~6 pièces/page réelles). Cadre "jusqu'à" car les modèles premium
// (GPT-4o, Claude) consomment ~6x plus de pièces pour la même longueur. Ces
// valeurs restent rentables (marge ≥4,6x sur tous les modèles) : le facteur
// COINS_PER_USD (voir @/lib/ai/pricing) garantit la marge quel que soit le pack.
export const COIN_PACKS: CoinPack[] = [
  {
    id: "pack_starter",
    name: "Starter",
    priceFcfa: 1000,
    coins: 1000,
    bonus: 0,
    tagline: "Idéal pour tester l'éditeur.",
    approxPages: "jusqu'à ~150 pages",
    showOnPricing: true,
  },
  {
    id: "pack_creator",
    name: "Creator",
    priceFcfa: 2500,
    coins: 3000,
    bonus: 500,
    popular: true,
    tagline: "Le choix parfait pour les passionnés.",
    approxPages: "jusqu'à ~450 pages",
    showOnPricing: true,
  },
  {
    id: "pack_author",
    name: "Author",
    priceFcfa: 5000,
    coins: 7000,
    bonus: 2000,
    tagline: "L'expérience ultime pour les créateurs.",
    approxPages: "jusqu'à ~1 100 pages",
    showOnPricing: true,
  },
  {
    id: "pack_pro",
    name: "Pro",
    priceFcfa: 15000,
    coins: 16000,
    bonus: 1000,
    tagline: "Pour les auteurs qui publient en série.",
    approxPages: "jusqu'à ~2 500 pages",
    showOnPricing: false,
  },
  {
    id: "pack_studio",
    name: "Studio",
    priceFcfa: 45000,
    coins: 45000,
    bonus: 0,
    tagline: "Volume maximal pour les studios d'édition.",
    approxPages: "jusqu'à ~7 000 pages",
    showOnPricing: false,
  },
];

/** Alias de plan_id acceptés (tolérance sur la casse/orthographe des webhooks). */
function normalizePlanId(planId: string): string {
  return (planId || "").toLowerCase().replace(/[\s-]+/g, "_");
}

export function getPackById(planId: string): CoinPack | undefined {
  const key = normalizePlanId(planId);
  return COIN_PACKS.find(
    (p) => normalizePlanId(p.id) === key || normalizePlanId(p.name) === key || normalizePlanId(p.name + "_pack") === key
  );
}

/**
 * Détermine le nombre de pièces à créditer : d'abord par id de pack (fiable),
 * sinon par le montant payé (repli robuste pour les webhooks incomplets).
 */
export function coinsForPurchase(planId?: string | null, amountFcfa?: number | null): number {
  if (planId) {
    const pack = getPackById(planId);
    if (pack) return pack.coins;
  }
  const amt = Number(amountFcfa || 0);
  if (amt <= 0) return 0;
  // Repli par palier de montant (du plus grand au plus petit).
  const byPrice = [...COIN_PACKS].sort((a, b) => b.priceFcfa - a.priceFcfa);
  for (const p of byPrice) {
    if (amt >= p.priceFcfa) return p.coins;
  }
  return 0;
}
