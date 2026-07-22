# Original User Request

## 2026-07-21T21:46:23Z

# Teamwork Project Prompt — Draft

Refonte complète de l'interface utilisateur de l'application "Iris" pour adopter une esthétique ultra-minimaliste, imposante et claire, strictly calquée sur la page d'accueil de Notion. Remplacement de la couleur d'accentuation par le bleu "BoomBooks" et intégration d'une plume "Doodle" animée via une librairie tierce (ex: Lottie).

Working directory: c:\Users\helpdesk\Desktop\Iris\livre-genie
Integrity mode: benchmark

## Requirements

### R1. Refonte Esthétique "Notion-like" Extreme
- L'interface doit être épurée au maximum : textes immenses, centrés, abondance d'espace blanc et lisibilité absolue, à l'image de la page d'accueil de Notion.
- Cette refonte s'applique à la page d'accueil (`page.tsx`), et se décline sur les pages de connexion, d'inscription et le tableau de bord.

### R2. Nouvelle Identité Visuelle (Bleu BoomBooks)
- Remplacer l'ancienne couleur d'accentuation principale (le vert sarcelle `#0D9488`) par un bleu vif et clair similaire à celui de BoomBooks (ex: `#2563EB` ou `#1b6df9`).
- Maintenir les typographies de style Notion (Inter pour le corps du texte).

### R3. Intégration de la Plume "Doodle" Animée
- Utiliser une librairie d'animations (comme `lottie-react` ou similaire) pour intégrer une mascotte en forme de plume avec un design "doodle" / trait noir simple.

## Acceptance Criteria

### Esthétique et Layout
- [ ] Le design de l'accueil utilise des polices de très grande taille pour le titre principal (ex: `text-6xl` ou supérieur) et est centré avec d'importants espaces blancs (margin/padding massifs).
- [ ] La page de connexion, l'inscription et le dashboard ont été simplifiés visuellement pour correspondre à cette nouvelle ligne directrice.

### Couleurs
- [ ] Le fichier `globals.css` ou la configuration des couleurs utilisent le nouveau bleu (ex: `#1b6df9` ou `#2563EB`) comme variable principale (`--color-secondary` ou équivalent), remplaçant l'ancien vert.
- [ ] Une analyse statique du code (ou Agent-as-judge) confirme l'absence visuelle du vert d'eau sur les boutons et éléments d'action.

### Mascotte Plume
- [ ] Le fichier `package.json` contient une dépendance pour l'animation (ex: `lottie-react`, `lottie-web`, ou une alternative).
- [ ] Le composant de la plume est intégré dans le code de la page d'accueil et s'anime correctement.

## Follow-up — 2026-07-21T21:59:39Z

Le client a un retour supplémentaire important pour la refonte en cours :
1. Veuillez augmenter la taille des polices (textes) de manière générale sur le site, car il trouve que c'est actuellement trop petit.
2. Pour l'espace connecté (le tableau de bord / dashboard), le client souhaite adopter un design très proche de la plateforme "chariow" (un tableau de bord très propre, de grandes cartes de statistiques claires avec bordures arrondies, une grille d'automatisations/fonctionnalités très aérée), tout en conservant notre nouvelle palette de couleurs (le bleu vif BoomBooks qui vient d'être mis à jour dans globals.css).
Veuillez intégrer ces directives dans vos tâches en cours.
