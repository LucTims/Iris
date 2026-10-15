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

## Textes du catalogue (à copier dans WhatsApp Business → Outils → Catalogue)

**1. Découvrir Iris**
- Prix : laisser vide
- Description : Iris vous accompagne de l'idée au livre fini : rédaction des chapitres avec l'IA, correction dans l'éditeur, création de couverture et export PDF prêt à publier. Écrivez-nous pour une démo ou une question.
- Lien : https://www.irisboom.online
- Code article : IRIS-DECOUVRIR

**2. Pack Starter, 1 000 FCFA**
- Description : 900 pièces, soit environ 45 pages. Idéal pour découvrir la plateforme et écrire un premier livre court. Sans abonnement.
- Lien : https://www.irisboom.online/pricing
- Code article : IRIS-STARTER

**3. Pack Créateur, 3 500 FCFA (le plus choisi)**
- Description : 4 000 pièces (dont 500 offertes), soit environ 200 pages. L'idéal pour écrire un livre complet et générer des couvertures HD.
- Lien : https://www.irisboom.online/pricing
- Code article : IRIS-CREATEUR

**4. Pack Auteur Pro, 5 000 FCFA**
- Description : 7 500 pièces (dont 2 500 offertes), soit environ 375 pages. Pour les auteurs réguliers et la plus haute qualité littéraire.
- Lien : https://www.irisboom.online/pricing
- Code article : IRIS-AUTEUR-PRO

## Profil de l'entreprise

- **Catégorie** : Éducation (ou Logiciel / Services informatiques)
- **Description** : Iris, votre atelier d'écriture avec l'IA. Écrivez, corrigez et publiez votre livre, de l'idée au PDF prêt à imprimer. Une question ? Écrivez-nous ici.
- **Site web** : https://www.irisboom.online

## Messages automatiques suggérés

- **Message d'accueil** : Bonjour et bienvenue chez Iris ✍️ Comment pouvons-nous vous aider ? 1️⃣ Découvrir Iris 2️⃣ Acheter un pack 3️⃣ Un souci technique. Répondez avec le numéro de votre choix.
- **Message d'absence** : Merci pour votre message ! Notre équipe vous répond dès son retour. En attendant, notre guide complet est disponible sur https://www.irisboom.online
