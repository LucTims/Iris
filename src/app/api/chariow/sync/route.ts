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

    const chariowApiKey =
      process.env.CHARIOW_API_KEY || "sk_g67k3ae2_f6e29ccf707f86ac1a4cdad92cf96abe";
    if (!chariowApiKey) {
      return NextResponse.json({ error: "Clé API Chariow manquante" }, { status: 500 });
    }

    // 1. Récupérer les licences associées à l'email de l'utilisateur (rapide & ciblé)
    let licenses: any[] = [];
    try {
      const response = await fetch(
        `https://api.chariow.com/v1/licenses?customer_email=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${chariowApiKey}`,
            Accept: "application/json",
          },
        }
      );
      if (response.ok) {
        const json = await response.json();
        licenses = json?.data || [];
      }
    } catch (fetchErr) {
      console.warn("[Chariow Sync] Erreur fetch direct licences:", fetchErr);
    }

    // En cas de résultat vide, repli sur les 50 dernières licences du store
    if (licenses.length === 0) {
      try {
        const fallbackRes = await fetch("https://api.chariow.com/v1/licenses?per_page=50", {
          headers: {
            Authorization: `Bearer ${chariowApiKey}`,
            Accept: "application/json",
          },
        });
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          licenses = fallbackJson?.data || [];
        }
      } catch (fallbackErr) {
        console.warn("[Chariow Sync] Erreur fetch global licences:", fallbackErr);
      }
    }

    const adminSupabase = getSupabaseAdmin();
    let totalCoinsAdded = 0;
    let newlyCreditedCount = 0;

    for (const lic of licenses) {
      const customerEmail = lic?.customer?.email?.trim().toLowerCase();
      if (customerEmail !== userEmail) continue;

      const licenseKey = lic?.license?.key ? lic.license.key.trim() : null;
      if (!licenseKey) continue;

      // Vérifier si cette clé a déjà été créditée
      const { data: existing } = await adminSupabase
        .from("redeemed_licenses")
        .select("id")
        .eq("license_key", licenseKey)
        .maybeSingle();

      if (existing) continue; // Déjà créditée, on passe

      // Identifier le pack
      const productId = lic?.product?.id;
      let pack = productId ? getPackByChariowProductId(productId) : undefined;
      if (!pack && lic?.product?.name) {
        pack = getPackById(lic.product.name);
      }
      if (!pack) continue;

      // Crédit atomique du portefeuille
      const credit = await creditWalletCoins(
        adminSupabase,
        user.id,
        pack.coins,
        `Synchronisation achat Chariow : ${pack.name}`,
        {
          provider: "chariow_sync",
          license_key: licenseKey,
          chariow_license_id: lic?.id,
          product_id: productId,
          plan_id: pack.id,
        }
      );

      if (credit.ok) {
        totalCoinsAdded += pack.coins;
        newlyCreditedCount++;

        // Enregistrer dans redeemed_licenses
        await adminSupabase.from("redeemed_licenses").insert({
          user_id: user.id,
          license_key: licenseKey,
          chariow_license_id: lic?.id || null,
          product_id: productId || "unknown",
          plan_id: pack.id,
          coins_credited: pack.coins,
          source: "sync_endpoint",
          metadata: {
            customer_email: customerEmail,
            product_name: lic?.product?.name,
          },
        });

        // Activer sur Chariow si nécessaire
        if (lic?.can_activate) {
          fetch(`https://api.chariow.com/v1/licenses/${encodeURIComponent(licenseKey)}/activate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${chariowApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ device_identifier: user.id }),
          }).catch(() => {});
        }
      }
    }

    // Récupérer le solde à jour
    const { data: wallet } = await adminSupabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      coinsAdded: totalCoinsAdded,
      newlyCreditedCount,
      newBalance: wallet?.balance ?? 0,
    });
  } catch (err: any) {
    console.error("[Chariow Sync] Erreur inattendue:", err?.message || err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
