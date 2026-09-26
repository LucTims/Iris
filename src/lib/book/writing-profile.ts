/**
 * PROFIL D'ÉCRITURE D'UN PROJET — ce que la rédaction doit savoir de l'auteur
 * au-delà du sujet : sa plume, sa matière de référence, et ses choix de mise
 * en forme et de typographie.
 *
 * Correction d'un oubli majeur : le document que l'auteur fournissait pour
 * « reproduire son style » était analysé (et facturé) à la création… puis
 * utilisé uniquement pour le SOMMAIRE. Aucun chapitre n'en tenait compte. Le
 * profil est désormais lu côté serveur, depuis le projet, par chaque route de
 * rédaction — un client ne peut ni l'oublier ni le falsifier.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isEnrichmentLevel, type EnrichmentLevel } from "@/lib/book/enrichment";

export interface ProjectStyleSettings {
  /** Niveau de mise en forme du texte (encadrés, citations détachées). */
  enrichment?: EnrichmentLevel;
  /** Identifiant d'un preset typographique (voir typography.ts). */
  typography?: string;
  /** Analyse de textes écrits par l'auteur, collés dans « Ma plume ». */
  authorStyle?: string;
  /** Nom ou description courte de la source de la plume (affichage). */
  authorStyleSource?: string;
}

export interface WritingProfile {
  authorStyle?: string;
  referenceNotes?: string;
  enrichment?: EnrichmentLevel;
  typography?: string;
}

interface ProjectProfileRow {
  reference_analysis?: string | null;
  reference_meta?: { purpose?: string | null } | null;
  style_settings?: ProjectStyleSettings | null;
}

/** Normalise la valeur jsonb `style_settings` (tolère null et champs inconnus). */
export function readStyleSettings(raw: unknown): ProjectStyleSettings {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  return {
    enrichment: isEnrichmentLevel(r.enrichment) ? r.enrichment : undefined,
    typography: str(r.typography, 40),
    authorStyle: str(r.authorStyle, 4000),
    authorStyleSource: str(r.authorStyleSource, 120),
  };
}

export function writingProfileFromProject(row: ProjectProfileRow | null | undefined): WritingProfile {
  if (!row) return {};
  const style = readStyleSettings(row.style_settings);
  const analysis = (row.reference_analysis || "").trim();
  const isStyleDoc = row.reference_meta?.purpose === "style";
  // La plume collée dans « Ma plume » prime ; un document fourni « pour le
  // style » à la création la complète ou la remplace à défaut.
  const authorStyle = [style.authorStyle, isStyleDoc ? analysis : ""].filter(Boolean).join("\n\n") || undefined;
  return {
    authorStyle,
    referenceNotes: !isStyleDoc && analysis ? analysis : undefined,
    enrichment: style.enrichment,
    typography: style.typography,
  };
}

/**
 * Lit le profil d'écriture d'un projet. Tolère une base où la colonne
 * `style_settings` n'existe pas encore (migration non appliquée).
 */
export async function loadWritingProfile(
  supabase: SupabaseClient,
  projectId: string | null | undefined
): Promise<WritingProfile> {
  if (!projectId) return {};
  const full = await supabase
    .from("projects")
    .select("reference_analysis, reference_meta, style_settings")
    .eq("id", projectId)
    .maybeSingle();
  if (!full.error) return writingProfileFromProject(full.data as ProjectProfileRow | null);

  const basic = await supabase
    .from("projects")
    .select("reference_analysis, reference_meta")
    .eq("id", projectId)
    .maybeSingle();
  return basic.error ? {} : writingProfileFromProject(basic.data as ProjectProfileRow | null);
}
