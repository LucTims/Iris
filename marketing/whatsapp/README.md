# WhatsApp Business d'Iris : visuels et catalogue

Charte : signe Iris (`public/iris-mark.svg`), terracotta `#BF6345`, fond `#F8F8F7`, encre `#161616`, polices Plus Jakarta Sans et Newsreader.

## Visuels (`visuels/`)

| Fichier | Usage | Format |
|---|---|---|
| `profil-terracotta.png` | Photo de profil (recommandée : la plus visible dans la liste des discussions) | 1080×1080 |
| `profil-clair.png`, `profil-sombre.png` | Variantes | 1080×1080 |
| `couverture.png` | Photo de couverture (Profil de l'entreprise) | 1640×856. Le bas au centre est laissé vide pour la photo de profil. |
| `catalogue-0-decouvrir-iris.png` | Article « Découvrir Iris » | 1080×1080 |
| `catalogue-1-pack-starter.png` | Pack Starter | 1080×1080 |
| `catalogue-2-pack-createur.png` | Pack Créateur | 1080×1080 |
| `catalogue-3-pack-auteur-pro.png` | Pack Auteur Pro | 1080×1080 |

Les prix et les pièces viennent de `src/components/PricingSection.tsx`. Si les tarifs changent, mets-les à jour dans `generer-visuels.mjs` et relance :
`npm i @fontsource/plus-jakarta-sans @fontsource/newsreader playwright-core`, puis `node generer-visuels.mjs <dossier-sortie> <racine-du-repo>`.

## Profil de l'entreprise

- **À propos** (139 caractères max) : Iris ✍️ Écrivez et publiez votre livre avec l’IA
- **Catégorie** : Éducation (ou Logiciel / Services informatiques)
- **Description** (441/512 caractères) : Iris est votre atelier d'écriture avec l'IA. Transformez votre idée ou votre expertise en un livre prêt à publier : rédaction des chapitres, correction, couverture professionnelle et export PDF, EPUB ou DOCX en un clic. Vous payez seulement ce que vous utilisez, avec des packs de pièces sans date d'expiration, réglables par Mobile Money (Orange, MTN, Moov, Wave) ou par carte. Une question ? Écrivez-nous ici, notre équipe vous accompagne.
- **Site web** : https://www.irisboom.online

## Catalogue (WhatsApp Business → Outils → Catalogue)

### 1. Découvrir Iris
- **Nom** : Découvrir Iris – Écrivez votre livre avec l'IA
- **Prix** : laisser vide
- **Description** :
  Vous avez un livre en tête mais vous ne savez pas par où commencer ? Iris vous accompagne de l'idée au livre fini.
  ✍️ Rédaction de vos chapitres avec l'IA (ChatGPT, Claude)
  🔎 Correction et amélioration directement dans l'éditeur
  🎨 Couverture professionnelle adaptée à Amazon Kindle, Kobo et au papier
  📄 Export PDF, EPUB et DOCX prêt à publier
  Roman, poésie, cuisine, business, développement personnel : Iris s'adapte à votre projet.
  👉 Écrivez « DÉMO » pour qu'on vous montre comment ça marche.
- **Lien** : https://www.irisboom.online
- **Code article** : IRIS-DECOUVRIR

### 2. Pack Starter
- **Nom** : Pack Starter – 900 pièces
- **Prix** : 1 000 FCFA
- **Description** :
  Le pack idéal pour découvrir Iris et écrire un premier livre court.
  ✅ 900 pièces, soit environ 45 pages
  ✅ Tous les modèles d'IA (ChatGPT, Claude)
  ✅ Pas de date d'expiration
  ✅ Paiement par Mobile Money ou par carte
  Vos pièces ne sont utilisées que lorsque vous générez du texte ou des images.
- **Lien** : https://www.irisboom.online/pricing
- **Code article** : IRIS-STARTER

### 3. Pack Créateur ⭐ Le plus choisi
- **Nom** : Pack Créateur – 4 000 pièces ⭐
- **Prix** : 3 500 FCFA
- **Description** :
  Notre pack le plus choisi : tout ce qu'il faut pour écrire un livre complet et lui donner une couverture HD.
  ✅ 4 000 pièces, dont 500 offertes
  ✅ Environ 200 pages
  ✅ Tous les modèles d'IA (ChatGPT, Claude)
  ✅ Pas de date d'expiration
  ✅ Paiement par Mobile Money ou par carte
- **Lien** : https://www.irisboom.online/pricing
- **Code article** : IRIS-CREATEUR

### 4. Pack Auteur Pro
- **Nom** : Pack Auteur Pro – 7 500 pièces
- **Prix** : 5 000 FCFA
- **Description** :
  Pour les auteurs réguliers qui veulent la plus haute qualité littéraire, au meilleur prix par page.
  ✅ 7 500 pièces, dont 2 500 offertes
  ✅ Environ 375 pages : de quoi écrire plusieurs livres
  ✅ Tous les modèles d'IA (ChatGPT, Claude)
  ✅ Pas de date d'expiration
  ✅ Paiement par Mobile Money ou par carte
- **Lien** : https://www.irisboom.online/pricing
- **Code article** : IRIS-AUTEUR-PRO

## Messages automatiques suggérés

- **Message d'accueil** : Bonjour et bienvenue chez Iris ✍️ Comment pouvons-nous vous aider ? 1️⃣ Découvrir Iris 2️⃣ Acheter un pack 3️⃣ Un souci technique. Répondez avec le numéro de votre choix.
- **Message d'absence** : Merci pour votre message ! Notre équipe vous répond dès son retour. En attendant, notre guide complet est disponible sur https://www.irisboom.online
