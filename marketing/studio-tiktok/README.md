# Studio TikTok d'Iris

## Comment ça marche

1. **Tu envoies un brief** dans la conversation : le sujet, le format et la voix (facultatif).
2. **Claude écrit le script** selon la charte émotionnelle : une accroche forte, une émotion, puis une seule raison logique et un petit appel à l'action.
3. **Claude génère les plans** (Higgsfield) et **la voix** (ElevenLabs), puis **monte la vidéo** avec l'habillage Iris.
4. **La vidéo arrive sur Telegram** (`@irisboom_bot`), avec la légende TikTok prête à copier.
5. **Tu publies** sur TikTok en ajoutant un son tendance à faible volume et l'étiquette « Contenu généré par IA ».

### Modèle de brief
```
Sujet : …
Format : récit | diaporama | POV | démo | carnet | avatar
Voix : Fatou | Martin (par défaut : Fatou)
Notes : (facultatif : public visé, appel à l'action, ton)
```

## Formats

| Format | Contenu | Coût indicatif |
|---|---|---|
| **Récit** | Voix off, 5 à 7 plans cinématiques (1 ou 2 animés), sous-titres | ≈ 10–25 crédits Higgsfield |
| **Diaporama** | Images fixes en zoom lent, voix off, sous-titres (conseils, listes) | ≈ 1–2 crédits Higgsfield |
| **POV** | Une ambiance et une phrase à l'écran, sans voix, sur un son tendance | ≈ 0–10 crédits Higgsfield |
| **Démo** | Ta capture d'écran d'Iris et la voix off | 0 crédit (ta capture) |
| **Carnet** | Carrousel photo « Les carnets d'Iris » | 0 crédit |
| **Avatar** | Personnage HeyGen face caméra | Rendu HeyGen |

## Voix (ElevenLabs, modèle `eleven_v4`)

| Voix | Identifiant | Usage |
|---|---|---|
| **Fatou** (voix principale) | `Vza9yt3uSx3RXnRx6YfI` | Récits, émotion, transmission |
| **Martin** (Krys Martin-1) | `vUpkYZ9fJEqGnCZ9YThw` | Avatar face caméra, prises de parole du fondateur |

## Charte
Terracotta `#BF6345`, blanc cassé `#F8F8F7` et noir `#161616`. Titres en Newsreader, sous-titres en Plus Jakarta Sans très gras. Décor chaud : bois, crème, terracotta, lumière dorée, personnes d'Afrique francophone. Aucun texte lisible ni logo dans les images générées.

## Outils (`outils/`)
- `habillage.mjs` : accroche, badge, sous-titres et écran de fin à partir du fichier `spec.json`.
- `montage.py` : aligne la voix sur le texte (faster-whisper), enchaîne les plans, pose l'habillage et ajoute l'écran de fin.
- Types de plans du fichier `spec.json` : `wide` / `close` (avatar en plan large ou serré, synchronisé sur la voix), `image` (zoom lent), `video`, `ad` (extrait de la vidéo promo `public/iris-motion-ad.mp4`, sur fond sombre).
- `envoyer-telegram.sh` : envoie la vidéo et la légende. Le jeton est lu dans `~/.iris_tg_token` et la discussion dans `~/.iris_tg_chat`. **Ils ne sont jamais versionnés.**

Ces outils tournent dans l'espace de travail Higgsfield (ffmpeg, Playwright, faster-whisper déjà installés). `exemples/le-cahier-fatou.json` montre un fichier `spec.json` complet.

## Avatar Martin
Image de départ : Martin assis à son bureau dans le studio (générée dans Higgsfield à partir de ses looks HeyGen), animée par HeyGen `create_video_from_image` sur la voix ElevenLabs. Exemples complets : `exemples/livre-2026-martin.json`, `exemples/ebooks-500k-martin.json` et `exemples/plateformes-ebook-martin.json`.

## Plans de sites web
Pour montrer un vrai site (plateforme, outil), Playwright en fait une capture pleine page en vue mobile, puis ffmpeg la fait défiler dans le haut de l'écran sur fond sombre, avec une pastille « N°x · adresse » sous les sous-titres. Ces plans s'utilisent comme des plans `video`.

## Habillages propres à une vidéo
La clé `extra` du fichier `spec.json` pose des PNG supplémentaires : `{ "png": "card1.png", "from": 8, "until": 12 }` (numéros de morceaux de sous-titres, `"until": "end"` pour aller jusqu'à la fin de la voix). Exemple de générateur : `exemples/ebooks-500k-habillage.mjs`.
