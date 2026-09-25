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

// `approxPages` : pages MAX avec le modèle le plus économique (Gemini Flash,
// 20 pièces/page). "jusqu'à" car ChatGPT (30) et Claude (50) consomment plus.
// Tarification à la valeur (voir COINS_PER_PAGE dans @/lib/ai/pricing) : marge
// brute ≥ 10x sur tous les modèles.
export const COIN_PACKS: CoinPack[] = [
  {
    id: "pack_starter",
    name: "Starter",
    priceFcfa: 1000,
    coins: 900,
    bonus: 0,
    tagline: "Idéal pour tester l'éditeur.",
    approxPages: "jusqu'à ~45 pages",
    showOnPricing: true,
  },
  {
    id: "pack_creator",
    name: "Creator",
    priceFcfa: 3500,
    coins: 4000,
    bonus: 500,
    popular: true,
    tagline: "Le choix parfait pour les passionnés.",
    approxPages: "jusqu'à ~200 pages",
    showOnPricing: true,
  },
  {
    id: "pack_author",
    name: "Author",
    priceFcfa: 5000,
    coins: 7500,
    bonus: 2500,
    tagline: "L'expérience ultime pour les créateurs.",
    approxPages: "jusqu'à ~375 pages",
    showOnPricing: true,
  },
  {
    id: "pack_pro",
    name: "Pro",
    priceFcfa: 15000,
    coins: 16000,
    bonus: 1000,
    tagline: "Pour les auteurs qui publient en série.",
    approxPages: "jusqu'à ~800 pages",
    showOnPricing: false,
  },
  {
    id: "pack_studio",
    name: "Studio",
    priceFcfa: 45000,
    coins: 45000,
    bonus: 0,
    tagline: "Volume maximal pour les studios d'édition.",
    approxPages: "jusqu'à ~2 250 pages",
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

/**
 * Produits Chariow → packs de pièces.
 *
 * `issuesLicense` décide QUEL événement crédite l'achat. Un produit à licence
 * déclenche deux notifications pour un seul paiement (`successful.sale` puis
 * `license.issued`) qui ne partagent aucun identifiant : la vente ne porte pas
 * la clé de licence, la licence ne porte pas l'id de vente. Créditer sur les
 * deux donnait le double de pièces. Pour ces produits, seule la LICENCE (clé
 * unique, également utilisée par la synchro et la saisie manuelle) crédite.
 * Les anciens produits, sans licence, sont crédités sur la vente.
 */
export const CHARIOW_PRODUCTS: Record<string, { planId: string; issuesLicense: boolean }> = {
  // Produits à licence actuels (liens de la page /pricing)
  prd_mryxlaqo: { planId: "pack_starter", issuesLicense: true },
  prd_18k5s6e1: { planId: "pack_creator", issuesLicense: true },
  prd_48qp19t3: { planId: "pack_author", issuesLicense: true },
  // Anciens produits (téléchargement simple, sans licence)
  prd_waqgpzhy: { planId: "pack_starter", issuesLicense: false },
  prd_jvzz32pf: { planId: "pack_creator", issuesLicense: false },
  prd_yekmrhdn: { planId: "pack_author", issuesLicense: false },
};

export function getPackByChariowProductId(productId: string): CoinPack | undefined {
  const product = CHARIOW_PRODUCTS[productId];
  return product ? getPackById(product.planId) : undefined;
}

/** Vrai si l'achat de ce produit Chariow délivre une licence (crédit par la licence). */
export function chariowProductIssuesLicense(productId: string | null | undefined): boolean {
  return !!(productId && CHARIOW_PRODUCTS[productId]?.issuesLicense);
}
