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

export const COIN_PACKS: CoinPack[] = [
  {
    id: "pack_starter",
    name: "Starter",
    priceFcfa: 1000,
    coins: 1000,
    bonus: 0,
    tagline: "Idéal pour tester l'éditeur.",
    approxPages: "~50 pages",
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
    approxPages: "~150 pages",
    showOnPricing: true,
  },
  {
    id: "pack_author",
    name: "Author",
    priceFcfa: 5000,
    coins: 7000,
    bonus: 2000,
    tagline: "L'expérience ultime pour les créateurs.",
    approxPages: "~350 pages",
    showOnPricing: true,
  },
  {
    id: "pack_pro",
    name: "Pro",
    priceFcfa: 15000,
    coins: 16000,
    bonus: 1000,
    tagline: "Pour les auteurs qui publient en série.",
    approxPages: "~800 pages",
    showOnPricing: false,
  },
  {
    id: "pack_studio",
    name: "Studio",
    priceFcfa: 45000,
    coins: 45000,
    bonus: 0,
    tagline: "Volume maximal pour les studios d'édition.",
    approxPages: "~2 300 pages",
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
