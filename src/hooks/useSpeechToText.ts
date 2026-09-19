"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Message d'erreur exploitable par l'auteur, selon le code renvoyé par l'API. */
const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Micro refusé. Autorisez l'accès au microphone dans les réglages de votre navigateur, puis réessayez.",
  "service-not-allowed":
    "Micro refusé. Autorisez l'accès au microphone dans les réglages de votre navigateur, puis réessayez.",
  "audio-capture":
    "Aucun micro détecté. Vérifiez qu'un micro est bien branché et disponible.",
  network:
    "La transcription nécessite une connexion internet. Vérifiez votre réseau.",
  aborted: "",
  "no-speech": "",
};

/**
 * Nettoie un segment transcrit : espaces superflus et majuscule initiale.
 *
 * L'API renvoie les segments en minuscules et souvent précédés d'un espace ;
 * concaténés tels quels, on obtenait « bonjour  ceci est un test » sans la
 * moindre capitale, que l'auteur devait reprendre à la main.
 */
function tidySegment(text: string, isSentenceStart: boolean): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (!isSentenceStart) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Reconnaissance vocale (Web Speech API) réutilisable.
 *
 * `onTranscript` reçoit chaque segment finalisé, à concaténer où l'appelant le
 * souhaite (champ de chat, synopsis…). Dégrade proprement quand le navigateur
 * ne supporte pas l'API (Firefox notamment).
 *
 * TROIS DÉFAUTS CORRIGÉS ICI, qui donnaient l'impression d'un micro défaillant :
 *
 * 1. LA DICTÉE S'ARRÊTAIT TOUTE SEULE. Malgré `continuous = true`, les moteurs
 *    de reconnaissance coupent après quelques secondes de silence — très vite
 *    sur mobile. `onend` se déclenchait, l'état repassait à « arrêté », et
 *    l'auteur qui reprenait son souffle au milieu d'un paragraphe parlait dans
 *    le vide sans comprendre pourquoi. On redémarre désormais automatiquement
 *    tant que l'auteur n'a pas lui-même appuyé sur stop.
 *
 * 2. LES ERREURS ÉTAIENT MUETTES. Un micro refusé ne produisait STRICTEMENT
 *    aucun retour : le bouton cessait simplement de clignoter. L'erreur est
 *    maintenant exposée avec un message actionnable.
 *
 * 3. LE TEXTE EN COURS ÉTAIT JETÉ. `interimResults` était activé mais les
 *    résultats provisoires étaient ignorés : rien ne bougeait à l'écran
 *    pendant qu'on parlait. Ils sont désormais exposés pour affichage.
 */
export function useSpeechToText(
  onTranscript: (finalText: string) => void,
  lang: string = "fr-FR"
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  /** Vrai tant que l'AUTEUR veut dicter — distingue un arrêt volontaire d'une coupure du moteur. */
  const wantsToListenRef = useRef(false);
  /** Vrai si le dernier segment finalisé se terminait par une ponctuation forte. */
  const sentenceStartRef = useRef(true);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    return () => {
      wantsToListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stop = useCallback(() => {
    wantsToListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  /** Instancie et démarre un moteur de reconnaissance. */
  const launch = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    // Le moteur renvoie plusieurs hypothèses et garde la meilleure ; sur une
    // dictée bruitée, cela améliore sensiblement le résultat retenu.
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || "";
      // « no-speech » et « aborted » sont des évènements de fonctionnement
      // normal (un silence, un redémarrage) : les afficher comme des erreurs
      // ferait clignoter un message anxiogène pendant une dictée qui marche.
      const message = ERROR_MESSAGES[code] ?? "La transcription a rencontré un problème.";
      if (message) {
        setError(message);
        // Une erreur bloquante (micro refusé, absent) ne doit pas boucler.
        if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
          wantsToListenRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognition.onend = () => {
      setInterimTranscript("");
      if (!wantsToListenRef.current) {
        setIsListening(false);
        return;
      }
      // Reprise automatique : le moteur s'est coupé sur un silence alors que
      // l'auteur dicte toujours. Court délai pour laisser le moteur se libérer.
      restartTimerRef.current = setTimeout(() => {
        if (!wantsToListenRef.current) return;
        try {
          recognition.start();
        } catch {
          // Déjà redémarré entre-temps : on repart d'une instance neuve.
          launch();
        }
      }, 250);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interim += result[0].transcript;
      }

      setInterimTranscript(interim.trim());

      if (finalTranscript) {
        const cleaned = tidySegment(finalTranscript, sentenceStartRef.current);
        if (cleaned) {
          sentenceStartRef.current = /[.!?…]\s*$/.test(cleaned);
          callbackRef.current(cleaned);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      /* start() lève si déjà démarré : on ignore */
    }
  }, [lang]);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    setError(null);
    sentenceStartRef.current = true;
    wantsToListenRef.current = true;
    launch();
  }, [launch]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, error, interimTranscript, start, stop, toggle };
}
