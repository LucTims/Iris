# Automatisation TikTok Iris — « Devine son métier »

Chaque jour, une idée de la banque Supabase (`automatisations.iris_idees`) devient une vidéo, envoyée sur Telegram
(@irisboom_bot) avec deux boutons : 📅 Programmer (Buffer → TikTok, prochain 12h30 libre) ou 🔄 Refaire.

1. **n8n « Iris - 1. Vidéo du jour »** (chaque matin) : `iris_prendre_idee()` puis `repository_dispatch` `iris-video` sur ce dépôt.
2. **GitHub Actions `.github/workflows/iris-video.yml`** : `produire.mjs` fabrique la vidéo (images ElevenLabs 1K qualité
   moyenne, détourage rembg gratuit, voix Fatou en une prise, animation `gabarit.mjs`, son `son.py`), la dépose dans
   Supabase Storage (`automatisations-videos/iris/`) et rappelle n8n.
3. **n8n « Iris - 2. Vidéo prête »** (webhook) : met l'idée « en_validation » et envoie la vidéo sur Telegram.
4. **n8n « Iris - 3. Actions Telegram »** : Programmer → Buffer ; Refaire → nouvelle génération de la même idée.

Secrets GitHub : `ELEVENLABS_API_KEY` (droit Image & Video), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `N8N_RAPPEL_URL`, `N8N_RAPPEL_SECRET`.

Test local sans envoi : `EPISODE_JSON='{…}' OUTILS=<dossier installer.sh> node produire.mjs travail --sans-envoi`
(les images et la voix déjà présentes dans `travail/` sont réutilisées, rien n'est refacturé).

`ressources/` : voix fixes (indices, « À toi… ») et musique de l'épisode 1, œil du « i ». `supabase.sql` : la banque et ses fonctions.

Mise en route :
- le fichier `.github/workflows/iris-video.yml` doit être sur la branche par défaut (GitHub n'écoute `repository_dispatch` que là) ;
- n8n : choisir le bot @irisboom_bot dans tous les nœuds Telegram des workflows « Iris - 1/2/3 », créer l'identifiant
  « GitHub Iris (dispatch) » (en-tête `Authorization: Bearer <jeton GitHub avec droit Actions/Contents en écriture sur ce dépôt>`),
  renseigner `CANAL_TIKTOK_IRIS` (nœud « Decider » du workflow 3) puis activer les trois workflows ;
- `N8N_RAPPEL_URL` = URL de production du webhook `iris-video-prete` du workflow 2.
