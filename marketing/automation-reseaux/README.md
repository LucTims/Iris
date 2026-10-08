# Automatisation marketing vidéo d'Iris (test d'un mois)

Objectif : publier chaque jour une vidéo sur la page Facebook, TikTok et YouTube Shorts, **validée d'un clic sur Telegram**, et recevoir des brouillons de messages pour les groupes Facebook.

## Architecture

```
┌──────────────────────────── Claude (Routine quotidienne, cloud) ────────────────────────────┐
│ 1. Lit tes validations et rejets précédents (n8n /iris-feedback)                              │
│ 2. Choisit angle × ton × format                                                               │
│ 3. Écrit le script                                                                            │
│ 4. Génère la vidéo : HeyGen (avatars Martin / Emily / Kwame, Video Agent)                     │
│                      Higgsfield (Shorts / UGC, mouvements de caméra) · ElevenLabs (voix)      │
│ 5. Rédige les légendes FB / TikTok / YouTube et les brouillons pour les groupes FB            │
│ 6. POST → n8n /iris-video                                                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────── n8n ──────────────────────────────────────┐
│ Telegram : vidéo + boutons [✅ Publier] [❌ Rejeter] + légendes + textes groupes │
│ ✅ → Buffer API (file d'attente) : Page Facebook, TikTok, YouTube              │
│ ❌ → noté dans l'historique (Claude en tient compte le lendemain)              │
└────────────────────────────────────────────────────────────────────────────────┘
```

Pourquoi Claude génère les vidéos plutôt que n8n : la Routine utilise **tes abonnements HeyGen et Higgsfield actuels** via les connecteurs. Les API HeyGen et Higgsfield appelées directement depuis n8n sont en général facturées à part de l'abonnement web.

## Installation

### 1. Bot Telegram
1. Sur Telegram, écris à `@BotFather` → `/newbot` → récupère le **token**.
2. Envoie un message à ton bot, puis ouvre `https://api.telegram.org/bot<TOKEN>/getUpdates` et récupère `message.from.id` : c'est ton **chat ID**.

### 2. Buffer
1. Récupère une clé API sur [developers.buffer.com](https://developers.buffer.com/guides/your-first-post.html).
2. Récupère les IDs de tes canaux Facebook, TikTok et YouTube (requête `channels` dans l'API Explorer).
3. Vérifie dans l'API Explorer le format exact de `createPost` avec une vidéo. Le workflow suit l'exemple officiel ([Create Video Post](https://developers.buffer.com/examples/create-video-post.html)), mais cette API est récente.

### 3. n8n
1. Importe `n8n/iris-validation-telegram.json`.
2. Remplace `REMPLACER_PAR_TON_CHAT_ID_TELEGRAM` (3 nœuds Telegram et le nœud « Lire la décision ») et les `REMPLACER_ID_CANAL_*` (nœud « Préparer posts Buffer »).
3. Identifiants n8n à créer :
   - **Telegram API** (token du bot) sur tous les nœuds Telegram ;
   - **Header Auth** « Iris webhook » : nom `X-Iris-Secret`, valeur = un long mot de passe aléatoire, sur les deux webhooks ;
   - **Header Auth** « Buffer » : nom `Authorization`, valeur `Bearer <clé API Buffer>`, sur « Buffer : createPost ».
4. **Active** le workflow : l'historique des décisions n'est conservé qu'en mode production.

### 4. Environnement cloud de Claude
- Dans les paramètres de l'environnement (menu de l'environnement cloud → Edit → *Network access*), ajoute le domaine de ton n8n aux **Allowed domains**. Sinon la Routine ne peut pas joindre n8n. Doc : https://code.claude.com/docs/en/cloud-environments#network-access
- Ajoute les variables `N8N_BASE_URL` et `N8N_WEBHOOK_SECRET`.

### 5. Routine quotidienne
Claude crée une Routine (session neuve chaque jour, par ex. 7 h 50, heure de Paris) avec le prompt `routine/prompt-studio-quotidien.md` et les connecteurs HeyGen, Higgsfield et ElevenLabs.

## Budget de départ (relevé le 8 oct. 2026)
- HeyGen Creator : 362 crédits premium, renouvelés le 3 nov.
- Higgsfield Max : 317,85 crédits.
La Routine vérifie les soldes chaque jour et passe au format le moins cher si les crédits deviennent insuffisants.

## Limites connues
- **Groupes Facebook** : aucune publication automatique possible (API supprimée par Meta en 2024). Tu reçois les textes et tu les publies toi-même.
- Les liens vidéo HeyGen expirent après quelques jours : valide dans les 48 h.
- TikTok et YouTube demandent de signaler le contenu généré par IA (avatars, voix de synthèse). Active l'option correspondante dans Buffer ou dans l'application.
- Telegram limite l'envoi par bot à 50 Mo par vidéo, ce qui suffit pour un Short de moins d'une minute.

## Après les premières semaines
Quand le taux d'approbation est bon, ajoute un nœud qui publie automatiquement si tu n'as pas répondu sous 6 h. Tu passes ainsi au « sans toi ».
