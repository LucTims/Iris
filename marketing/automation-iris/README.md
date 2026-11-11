# Automatisation TikTok Iris — « Devine son métier »

Chaque jour, une idée de la banque Supabase (`automatisations.iris_idees`) devient une vidéo, envoyée sur Telegram
(@irisboom_bot) avec deux boutons : 📅 Programmer (Buffer → TikTok, prochain 12h30 libre) ou 🔄 Refaire.

1. **n8n « Iris - 1. Vidéo du jour »** (chaque matin) : `iris_prendre_idee()` puis `repository_dispatch` `iris-video` sur ce dépôt.
2. **GitHub Actions `.github/workflows/iris-video.yml`** : `produire.mjs` fabrique la vidéo (images ElevenLabs 1K qualité
   moyenne, détourage rembg gratuit, voix Fatou en une prise, animation `gabarit.mjs`, son `son.py`) et l'envoie à n8n.
3. **n8n « Iris - 2. Vidéo prête »** (webhook) : range la vidéo dans Supabase Storage (`automatisations-videos/iris/`),
   met l'idée « en_validation » et envoie la vidéo sur Telegram.
4. **n8n « Iris - 3. Actions Telegram »** : Programmer → Buffer ; Refaire → nouvelle génération de la même idée.

Secrets GitHub : `ELEVENLABS_API_KEY` (droit Image & Video) et `N8N_RAPPEL_SECRET` (le même que dans le nœud « Verifier Rappel » du workflow 2).

Test local sans envoi : `EPISODE_JSON='{…}' OUTILS=<dossier installer.sh> node produire.mjs travail --sans-envoi`
(les images et la voix déjà présentes dans `travail/` sont réutilisées, rien n'est refacturé).

`ressources/` : voix fixes (indices, « À toi… ») et musique de l'épisode 1, œil du « i ». `supabase.sql` : la banque et ses fonctions.

Mise en route :
- le fichier `.github/workflows/iris-video.yml` doit être sur la branche par défaut (GitHub n'écoute `repository_dispatch` que là) ;
- identifiants n8n : « Telegram irisboom_bot » (Telegram API), « GitHub Iris » (Bearer Auth, jeton à grain fin avec
  Actions + Contents en lecture/écriture sur ce dépôt), « Buffer Iris » (Bearer Auth, clé API du compte Buffer qui possède
  le TikTok irisboom.online) ; puis activer les trois workflows.
