#!/usr/bin/env bash
# Envoie une vidéo et sa légende TikTok sur Telegram.
# Usage : envoyer-telegram.sh <video.mp4> <legende.txt>
# Le jeton du bot est lu dans ~/.iris_tg_token et l'identifiant de discussion
# dans ~/.iris_tg_chat (jamais dans le dépôt).
set -euo pipefail
video=$1
legende=$2
token=$(cat ~/.iris_tg_token)
chat=$(cat ~/.iris_tg_chat)
api="https://api.telegram.org/bot$token"

# Vidéo avec un titre court (Telegram limite la légende à 1024 caractères).
curl -sS -f "$api/sendVideo" -F chat_id="$chat" -F supports_streaming=true \
  -F video=@"$video" -F caption="$(head -c 1000 "$legende" | head -n 1)" > /dev/null
# Légende complète en message séparé, facile à copier dans TikTok.
curl -sS -f "$api/sendMessage" -F chat_id="$chat" -F text="$(head -c 4000 "$legende")" > /dev/null
echo "envoyé sur Telegram : $(basename "$video")"
