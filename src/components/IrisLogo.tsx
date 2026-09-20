/**
 * LOGO IRIS — marque vectorielle.
 *
 * Le « i » dont le point est un iris (anneau terracotta, pupille sombre).
 * Vectorisé depuis le fichier source de la marque : les mesures ci-dessous
 * sont celles du tracé d'origine, ramenées à l'origine de sa boîte englobante.
 *
 *   Point   — cercle de rayon 29 centré en (29, 29), pupille de rayon 15.
 *   Fût     — quadrilatère (54,75) (5,118) (14,271) (43,271) : une pointe en
 *             haut à droite, un épaulement à gauche, puis un fuselage qui
 *             s'affine jusqu'au pied.
 *
 * POURQUOI DU SVG PLUTÔT QUE LE PNG. La marque précédente était servie en
 * bitmap, 32 Ko, sur six pages — dont les deux pages d'authentification, les
 * plus sensibles au temps d'affichage. En vectoriel elle pèse moins d'un
 * kilo-octet, reste nette sur écran Retina à toutes les tailles, et prend la
 * couleur de son contexte au lieu d'imposer un fond blanc.
 *
 * La terracotta vient de `currentColor` : le logo s'accorde automatiquement à
 * l'endroit où il est posé (en-tête, pied de page, fond sombre) sans qu'on ait
 * à maintenir une variante par contexte.
 */

import * as React from "react";

/** Terracotta exacte de la marque, relevée sur le fichier source. */
export const IRIS_TERRACOTTA = "#BF6345";
/** Pupille de l'iris. */
export const IRIS_PUPIL = "#161616";
/** Fond de la marque, utilisé pour les icônes d'application. */
export const IRIS_GROUND = "#F8F8F7";

/** Rapport largeur/hauteur du signe seul (59 × 271). */
export const IRIS_MARK_RATIO = 59 / 271;

type MarkProps = {
  /** Hauteur du signe en pixels. La largeur suit le rapport d'origine. */
  size?: number;
  /** Couleur de la pupille. Par défaut le noir de la marque. */
  pupil?: string;
  className?: string;
  /**
   * Texte alternatif. Laisser vide quand un libellé « Iris » accompagne déjà
   * le signe : le lecteur d'écran l'annoncerait deux fois.
   */
  title?: string;
};

/**
 * Le signe seul, sans mot. Hérite de `currentColor` pour la terracotta.
 */
export function IrisMark({ size = 28, pupil = IRIS_PUPIL, className, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 59 271"
      height={size}
      width={size * IRIS_MARK_RATIO}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {/* Le point : anneau terracotta + pupille pleine. La pupille est un
          disque, pas un trou — sur un fond coloré, un trou laisserait passer
          l'arrière-plan et le regard perdrait son noir. */}
      <circle cx="29" cy="29" r="29" fill="currentColor" />
      <circle cx="29" cy="29" r="15" fill={pupil} />
      {/* Le fût, tracé tel quel depuis la marque d'origine. */}
      <path d="M54 75 5 118l9 153h29z" fill="currentColor" />
    </svg>
  );
}

type LogoProps = MarkProps & {
  /** Affiche le mot « Iris » à côté du signe. */
  withWordmark?: boolean;
  /** Taille du mot, en pixels. Par défaut proportionnelle au signe. */
  wordmarkSize?: number;
  /** Classe appliquée au mot (couleur, graisse…). */
  wordmarkClassName?: string;
};

/**
 * Le logo complet : le signe, éventuellement suivi du mot « Iris ».
 *
 * Le mot est du VRAI TEXTE, pas un tracé : il reste sélectionnable, lisible
 * par un lecteur d'écran, et s'affiche dans la police de titre de
 * l'application sans octet supplémentaire.
 */
export default function IrisLogo({
  size = 28,
  pupil,
  className,
  title,
  withWordmark = false,
  wordmarkSize,
  wordmarkClassName = "",
}: LogoProps) {
  if (!withWordmark) {
    return <IrisMark size={size} pupil={pupil} className={className} title={title || "Iris"} />;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className || ""}`}>
      <IrisMark size={size} pupil={pupil} className="rotate-6 transition-transform" />
      <span
        className={`font-heading font-extrabold tracking-tight leading-none ${wordmarkClassName}`}
        style={{ fontSize: wordmarkSize ?? Math.round(size * 0.86) }}
      >
        ris
      </span>
    </span>
  );
}
