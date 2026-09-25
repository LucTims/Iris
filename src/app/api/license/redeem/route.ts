import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPackByChariowProductId, getPackById } from "@/lib/coinPacks";
import {
  activateChariowLicense,
  fetchChariowLicense,
  getChariowApiKey,
  normalizeLicenseKey,
} from "@/lib/payments/chariowApi";
import { creditPurchaseOnce } from "@/lib/payments/purchaseCredit";

/**
 * Activation manuelle d'une clé de licence Chariow (page Portefeuille).
 *
 * La clé est relue auprès de Chariow, puis créditée via `creditPurchaseOnce`
 * (réservation atomique sur la clé NORMALISÉE, commune au webhook et à la
 * synchro) : une clé déjà créditée automatiquement, ou saisie deux fois — y
 * compris en minuscules — ne recrédite jamais.
 */

function getSupabaseAdmin() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification de l'utilisateur
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Veuillez vous connecter pour activer une clé de licence." },
        { status: 401 }
      );
    }

    // 2. Validation de la clé reçue
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Format de requête invalide." }, { status: 400 });
    }

    const inputKey = typeof body?.licenseKey === "string" ? body.licenseKey.trim() : "";
    const normalizedInput = normalizeLicenseKey(inputKey);
    if (!normalizedInput) {
      return NextResponse.json(
        { error: "Veuillez renseigner une clé de licence valide." },
        { status: 400 }
      );
    }

    const adminSupabase = getSupabaseAdmin();
    const readBalance = async () => {
      const { data: wallet } = await adminSupabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      return wallet?.balance ?? 0;
    };

    const alreadyCreditedResponse = async (ownerUserId: string | null, coins: number) => {
      if (ownerUserId === user.id) {
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          coinsCredited: coins,
          newBalance: await readBalance(),
          message: `Cette clé a déjà été activée sur votre compte et vos ${coins.toLocaleString(
            "fr-FR"
          )} pièces sont bien enregistrées !`,
        });
      }
      return NextResponse.json(
        { error: "Cette clé de licence a déjà été activée et utilisée sur un autre compte." },
        { status: 409 }
      );
    };

    // 3. Réponse rapide si la clé est déjà créditée (sans appel à Chariow)
    const { data: existingLicense } = await adminSupabase
      .from("redeemed_licenses")
      .select("user_id, coins_credited")
      .eq("license_key", normalizedInput)
      .maybeSingle();
    if (existingLicense) {
      return alreadyCreditedResponse(existingLicense.user_id, existingLicense.coins_credited);
    }

    // 4. Vérification de la clé auprès de Chariow
    const chariowApiKey = getChariowApiKey();
    if (!chariowApiKey) {
      console.error("[License Redeem] CHARIOW_API_KEY manquante côté serveur.");
      return NextResponse.json(
        { error: "Activation momentanément indisponible. Contactez le support." },
        { status: 503 }
      );
    }

    const lookup = await fetchChariowLicense(inputKey, chariowApiKey);
    if (lookup.status === "not_found") {
      return NextResponse.json(
        {
          error:
            "Clé de licence introuvable. Vérifiez que vous avez bien copié votre clé depuis votre reçu Chariow.",
        },
        { status: 404 }
      );
    }
    if (lookup.status === "error") {
      console.error("[License Redeem] Vérification Chariow impossible:", lookup.message);
      return NextResponse.json({ error: "Impossible de vérifier la clé auprès de Chariow." }, { status: 502 });
    }

    const license = lookup.value;
    if (license.isExpired) {
      return NextResponse.json({ error: "Cette clé de licence a expiré." }, { status: 400 });
    }
    if (license.isRevoked) {
      return NextResponse.json({ error: "Cette clé de licence a été révoquée par le vendeur." }, { status: 400 });
    }

    // 5. Pack de pièces associé au produit Chariow
    const pack =
      (license.productId ? getPackByChariowProductId(license.productId) : undefined) ||
      (license.productName ? getPackById(license.productName) : undefined);
    if (!pack) {
      console.error("[License Redeem] Produit Chariow non mappé à un pack Iris:", license.productId, license.productName);
      return NextResponse.json(
        { error: "Ce produit Chariow ne correspond à aucun pack de pièces Iris connu." },
        { status: 400 }
      );
    }

    // 6. Réservation + crédit atomiques (clé canonique renvoyée par Chariow)
    const outcome = await creditPurchaseOnce(adminSupabase, {
      claimKey: license.key,
      userId: user.id,
      pack,
      source: "manual_redeem",
      description: `Activation clé de licence Chariow : ${pack.name}`,
      productId: license.productId,
      chariowLicenseId: license.id,
      metadata: {
        customer_email: license.customerEmail || user.email,
        product_name: license.productName,
      },
    });

    if (outcome.status === "already_credited") {
      return alreadyCreditedResponse(outcome.ownerUserId, outcome.coins);
    }
    if (outcome.status === "failed") {
      console.error("[License Redeem] Échec du crédit:", user.id, pack.id, outcome.reason);
      return NextResponse.json(
        { error: "Une erreur est survenue lors de l'attribution de vos pièces." },
        { status: 500 }
      );
    }

    // 7. Activation côté Chariow, seulement une fois l'achat crédité (non bloquant)
    if (license.canActivate) await activateChariowLicense(license.rawKey, chariowApiKey, user.id);

    console.log(`[License Redeem] ${pack.coins} pièces créditées à ${user.id} (licence ${license.key}).`);

    return NextResponse.json({
      success: true,
      coinsCredited: pack.coins,
      newBalance: outcome.newBalance ?? (await readBalance()),
      packName: pack.name,
      message: `Félicitations ! Votre pack ${pack.name} de ${pack.coins.toLocaleString(
        "fr-FR"
      )} pièces a été crédité avec succès !`,
    });
  } catch (err: any) {
    console.error("[License Redeem] Exception inattendue:", err?.message || err);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue lors de l'activation." },
      { status: 500 }
    );
  }
}
