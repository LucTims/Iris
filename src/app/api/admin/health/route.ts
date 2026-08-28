import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/isAdmin";

/**
 * Diagnostic admin : indique quelles intégrations sont configurées côté serveur
 * (présence des clés d'API et des secrets), SANS jamais révéler les valeurs.
 * Permet de vérifier en un coup d'œil que l'écriture avec chaque modèle
 * (Gemini / ChatGPT / Claude) et la génération d'image sont bien branchées.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const present = (v: string | undefined | null) => !!(v && v.trim().length > 0);

  const textModels = {
    gemini: present(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY),
    openai: present(process.env.OPENAI_API_KEY),
    anthropic: present(process.env.ANTHROPIC_API_KEY),
  };

  const images = {
    huggingface: present(
      process.env.HUGGINGFACE_API_KEY ||
        process.env.HF_TOKEN ||
        process.env.HUGGING_FACE_TOKEN ||
        process.env.HUGGINGFACE_TOKEN
    ),
    // Imagen premium réutilise la clé Google (texte).
    imagen_via_google: present(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY),
  };

  const infra = {
    supabase_url: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service_role: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    internal_job_secret: present(process.env.INTERNAL_JOB_SECRET),
    sebpay_secret: present(process.env.SEBPAY_SECRET_KEY),
    chariow_pulse_secret: present(process.env.CHARIOW_PULSE_SECRET),
  };

  // Modèles d'écriture proposés dans l'éditeur → clé requise pour chacun.
  const writableModels = [
    { id: "gemini-2.5-flash", provider: "google", ready: textModels.gemini },
    { id: "gpt-4o", provider: "openai", ready: textModels.openai },
    { id: "claude-3-5-sonnet-20240620", provider: "anthropic", ready: textModels.anthropic },
  ];

  return NextResponse.json({
    textModels,
    images,
    infra,
    writableModels,
    allTextModelsReady: textModels.gemini && textModels.openai && textModels.anthropic,
  });
}
