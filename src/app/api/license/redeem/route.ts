import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPackByChariowProductId, getPackById } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

    const rawKey = body?.licenseKey;
    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return NextResponse.json(
        { error: "Veuillez renseigner une clé de licence valide." },
        { status: 400 }
      );
    }

    const cleanKey = rawKey.trim();
    const adminSupabase = getSupabaseAdmin();

    // 3. Vérification d'idempotence : La clé a-t-elle déjà été créditée ?
    const { data: existingLicense, error: checkError } = await adminSupabase
      .from("redeemed_licenses")
      .select("id, user_id, coins_credited, plan_id")
      .eq("license_key", cleanKey)
      .maybeSingle();

    if (checkError) {
      console.error("[License Redeem] Erreur vérification table redeemed_licenses:", checkError);
    }

    if (existingLicense) {
      if (existingLicense.user_id === user.id) {
        // Déjà activée par CE même utilisateur : réponse rassurante
        const { data: wallet } = await adminSupabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          coinsCredited: existingLicense.coins_credited,
          newBalance: wallet?.balance ?? 0,
          message: `Cette clé a déjà été activée sur votre compte et vos ${existingLicense.coins_credited.toLocaleString(
            "fr-FR"
          )} pièces sont bien enregistrées !`,
        });
      }

      // Clé déjà utilisée par un AUTRE utilisateur
      return NextResponse.json(
        { error: "Cette clé de licence a déjà été activée et utilisée sur un autre compte." },
        { status: 409 }
      );
    }

    // 4. Vérification de la configuration Chariow
    const chariowApiKey = process.env.CHARIOW_API_KEY;
    if (!chariowApiKey) {
      console.error("[License Redeem] CHARIOW_API_KEY manquante côté serveur.");
      return NextResponse.json(
        { error: "Configuration serveur Chariow manquante. Contactez le support." },
        { status: 500 }
      );
    }

    // 5. Appel à l'API Chariow pour valider la clé
    const chariowRes = await fetch(
      `https://api.chariow.com/v1/licenses/${encodeURIComponent(cleanKey)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${chariowApiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!chariowRes.ok) {
      if (chariowRes.status === 404) {
        return NextResponse.json(
          {
            error:
              "Clé de licence introuvable. Vérifiez que vous avez bien copié votre clé depuis votre reçu Chariow.",
          },
          { status: 404 }
        );
      }
      const errData = await chariowRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.message || "Impossible de vérifier la clé auprès de Chariow." },
        { status: 400 }
      );
    }

    const chariowJson = await chariowRes.json();
    const licenseObj = chariowJson?.data || chariowJson;

    // 6. Vérifications d'expiration / révocation
    if (licenseObj?.is_expired) {
      return NextResponse.json(
        { error: "Cette clé de licence a expiré." },
        { status: 400 }
      );
    }

    if (licenseObj?.revoked_at || licenseObj?.status === "revoked") {
      return NextResponse.json(
        { error: "Cette clé de licence a été révoquée par le vendeur." },
        { status: 400 }
      );
    }

    // 7. Identification du pack de pièces associé au produit Chariow
    const productId: string | undefined = licenseObj?.product?.id;
    let pack = productId ? getPackByChariowProductId(productId) : undefined;

    if (!pack && licenseObj?.product?.name) {
      pack = getPackById(licenseObj.product.name);
    }

    if (!pack) {
      console.error("[License Redeem] Produit Chariow non mappé à un pack Iris:", productId, licenseObj?.product);
      return NextResponse.json(
        { error: "Ce produit Chariow ne correspond à aucun pack de pièces Iris connu." },
        { status: 400 }
      );
    }

    // 8. Activation de la licence sur Chariow (si le produit nécessite une activation)
    if (licenseObj.can_activate) {
      try {
        await fetch(`https://api.chariow.com/v1/licenses/${encodeURIComponent(cleanKey)}/activate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${chariowApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            device_identifier: user.id,
          }),
        });
      } catch (actErr) {
        console.warn("[License Redeem] Notification d'activation Chariow non critique:", actErr);
      }
    }

    // 9. Crédit atomique du portefeuille via credit_wallet_coins (FOR UPDATE)
    const credit = await creditWalletCoins(
      adminSupabase,
      user.id,
      pack.coins,
      `Activation clé de licence Chariow : ${pack.name}`,
      {
        provider: "chariow_license",
        license_key: cleanKey,
        chariow_license_id: licenseObj?.id,
        product_id: productId,
        plan_id: pack.id,
      }
    );

    if (!credit.ok) {
      console.error("[License Redeem] Échec du crédit wallet:", user.id, pack.id);
      return NextResponse.json(
        { error: "Une erreur est survenue lors de l'attribution de vos pièces." },
        { status: 500 }
      );
    }

    // 10. Enregistrement dans la table d'idempotence redeemed_licenses
    const { error: insertLicenseError } = await adminSupabase.from("redeemed_licenses").insert({
      user_id: user.id,
      license_key: cleanKey,
      chariow_license_id: licenseObj?.id || null,
      product_id: productId || "unknown",
      plan_id: pack.id,
      coins_credited: pack.coins,
      source: "manual_redeem",
      metadata: {
        customer_email: licenseObj?.customer?.email || user.email,
        product_name: licenseObj?.product?.name,
      },
    });

    if (insertLicenseError) {
      console.error("[License Redeem] Erreur enregistrement redeemed_licenses:", insertLicenseError);
    }

    // 11. Journalisation dans transactions (best-effort)
    try {
      await adminSupabase.from("transactions").insert({
        user_id: user.id,
        plan_id: pack.id,
        amount: pack.priceFcfa,
        currency: "XOF",
        status: "paid",
        provider_reference: licenseObj?.id || cleanKey,
      });
    } catch (logErr) {
      console.warn("[License Redeem] Journalisation transaction non critique:", logErr);
    }

    console.log(
      `[License Redeem] ${pack.coins} pièces créditées avec succès à l'utilisateur ${user.id} via la clé ${cleanKey}.`
    );

    return NextResponse.json({
      success: true,
      coinsCredited: pack.coins,
      newBalance: credit.newBalance,
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
