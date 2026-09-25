import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPackByChariowProductId, getPackById } from "@/lib/coinPacks";
import { checkRateLimit } from "@/lib/ratelimit";
import { activateChariowLicense, getChariowApiKey, listRecentChariowLicenses } from "@/lib/payments/chariowApi";
import { creditPurchaseOnce } from "@/lib/payments/purchaseCredit";

/**
 * Filet de sécurité appelé par le tableau de bord : crédite les licences
 * Chariow de l'utilisateur que le webhook n'aurait pas encore traitées.
 *
 * Chaque licence passe par `creditPurchaseOnce` (réservation atomique AVANT
 * crédit, clé = clé de licence) : ni un appel concurrent de cette route, ni le
 * webhook, ni la saisie manuelle ne peuvent créditer la même licence deux
 * fois. Auparavant, 5 appels simultanés du tableau de bord avaient crédité
 * 5 fois la même licence.
 */

function getSupabaseAdmin() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userEmail = user.email?.trim().toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ error: "Email utilisateur manquant" }, { status: 400 });
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

    // Une synchro coûte un appel à l'API Chariow : quelques-unes par minute suffisent.
    const rate = await checkRateLimit(`chariow_sync_${user.id}`, 4, 60 * 1000);
    if (!rate.success) {
      return NextResponse.json({ success: true, coinsAdded: 0, newlyCreditedCount: 0, newBalance: await readBalance(), throttled: true });
    }

    const chariowApiKey = getChariowApiKey();
    if (!chariowApiKey) {
      console.error("[Chariow Sync] CHARIOW_API_KEY absente : synchronisation impossible.");
      return NextResponse.json({ error: "Synchronisation Chariow indisponible" }, { status: 503 });
    }

    let licenses;
    try {
      licenses = await listRecentChariowLicenses(chariowApiKey);
    } catch (fetchErr) {
      console.warn("[Chariow Sync] Lecture des licences impossible:", fetchErr);
      return NextResponse.json({ error: "Chariow momentanément injoignable" }, { status: 502 });
    }

    let totalCoinsAdded = 0;
    let newlyCreditedCount = 0;

    for (const lic of licenses) {
      if (lic.customerEmail !== userEmail || lic.isRevoked) continue;

      const pack =
        (lic.productId ? getPackByChariowProductId(lic.productId) : undefined) ||
        (lic.productName ? getPackById(lic.productName) : undefined);
      if (!pack) continue;

      const outcome = await creditPurchaseOnce(adminSupabase, {
        claimKey: lic.key,
        userId: user.id,
        pack,
        source: "sync_endpoint",
        description: `Achat de pièces (Chariow, synchronisation) : ${pack.name}`,
        productId: lic.productId,
        chariowLicenseId: lic.id,
        metadata: { customer_email: userEmail, product_name: lic.productName },
      });

      if (outcome.status === "credited") {
        totalCoinsAdded += outcome.coins;
        newlyCreditedCount++;
        if (lic.canActivate) await activateChariowLicense(lic.rawKey, chariowApiKey, user.id);
      }
    }

    return NextResponse.json({
      success: true,
      coinsAdded: totalCoinsAdded,
      newlyCreditedCount,
      newBalance: await readBalance(),
    });
  } catch (err: any) {
    console.error("[Chariow Sync] Erreur inattendue:", err?.message || err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
