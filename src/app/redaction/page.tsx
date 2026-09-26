"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import type { RichManuscriptEditorHandle } from "@/components/RichManuscriptEditor";
import type { ChapterGenerateOptions } from "@/components/ChapterGenerateModal";

// Lazy-load heavy components to reduce initial bundle size by ~1.5MB
const RichManuscriptEditor = dynamic(
  () => import("@/components/RichManuscriptEditor"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-900"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div> }
);
const ImportManuscriptModal = dynamic(() => import("@/components/ImportManuscriptModal"), { ssr: false });
const ExportBookModal = dynamic(() => import("@/components/ExportBookModal"), { ssr: false });
const GeoScoreModal = dynamic(() => import("@/components/GeoScoreModal"), { ssr: false });

const ChapterGenerateModal = dynamic(() => import("@/components/ChapterGenerateModal"), { ssr: false });

// Lazy-load parsers only when needed (mammoth ~600KB, jszip ~140KB)
const loadParser = () => import("@/lib/parser");

/**
 * URL des visuels importés par l'auteur pour ce projet (blueprint Storybook),
 * dans l'ordre choisi — cet ordre EST la chronologie du conte.
 *
 * La base fait foi : le manuscrit doit rester générable depuis n'importe quel
 * appareil. Le contexte localStorage ne sert que de repli pour la toute
 * première génération, déclenchée juste après la création du projet.
 */
async function loadProjectImageUrls(
  projectId: string,
  fallbackContext?: { imageUrls?: unknown } | null
): Promise<string[]> {
  const isHttpUrl = (u: unknown): u is string =>
    typeof u === "string" && /^https?:\/\//.test(u);

  try {
    const res = await fetch(`/api/project-assets?projectId=${encodeURIComponent(projectId)}`);
    if (res.ok) {
      const data = await res.json();
      const urls = (data?.assets || [])
        .map((a: { file_url?: string }) => a?.file_url)
        .filter(isHttpUrl);
      if (urls.length > 0) return urls;
    }
  } catch (err) {
    console.warn("Lecture des images du projet impossible:", err);
  }

  const fallback = fallbackContext?.imageUrls;
  return Array.isArray(fallback) ? fallback.filter(isHttpUrl) : [];
}
import { splitHtmlIntoChapters } from "@/lib/parser/splitChapters";
import { SIZE_PRESETS, lengthToSizeKey, estimatePagesCoins, modelLabel, BOOK_MODELS } from "@/lib/book/generationPresets";
import type { BookSizeKey } from "@/lib/book/generationPresets";
import { WORDS_PER_PAGE, DEFAULT_WRITING_MODEL } from "@/lib/ai/pricing";
import { mergeChaptersHtml, MERGED_BOOK_TITLE, isOutlineTitle } from "@/lib/book/mergeBook";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import ReactMarkdown from "react-markdown";
import { Coins } from "lucide-react";

export interface ChapterModificationPayload {
  chapterIndex: number;
  chapterId?: string | number;
  chapterTitle?: string;
  summary: string;
  newContent?: string;
  previousContent?: string;
  isUndone?: boolean;
}

export interface Message {
  id: number;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestedTextToInsert?: string;
  chapterModification?: ChapterModificationPayload;
}

interface Chapter {
  id: number | string; // number pour les données de démo locales, UUID (string) une fois persisté en base
  number: number;
  title: string;
  content: string;
  status: "Brouillon" | "En cours" | "Terminé";
}

import { useUser } from "@/hooks/useUser";
import { resolveWorkType, chapterNounFor } from "@/lib/book/work-type";
import { assignChapterLabels } from "@/lib/book/chapter-heading";
import { detectGenre } from "@/lib/ai/book-style";
import { findUnwrittenSections, canResume } from "@/lib/book/unwritten";
import { bookJobFailureMessage, type BookJobSnapshot } from "@/lib/book/generation-job";

interface ChapterRow {
  id: string;
  number: number;
  title?: string | null;
  content?: string | null;
  status?: Chapter["status"] | null;
}

/** Lignes `chapters` renvoyées par l'API → chapitres de l'éditeur. */
function toEditorChapters(rows: ChapterRow[]): Chapter[] {
  return rows.map((ch) => ({
    id: ch.id,
    number: ch.number,
    title: ch.title || `Chapitre ${ch.number}`,
    content: ch.content || "",
    status: ch.status || "Brouillon"
  }));
}

function RedactionContent() {
  const searchParams = useSearchParams();
  const isNewProject = searchParams?.get("new") === "true";
  const urlProjectId = searchParams?.get("projectId");
  const router = useRouter();
  const { displayName, displayEmail, signOut, walletBalance, refreshWalletBalance, loading: userLoading } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";

  // Save status: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(urlProjectId || null);

  // Global Layout & Mobile Responsiveness State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "chat">("editor");

  // Chat Panel Resizing & Collapsing State
  const [chatWidth, setChatWidth] = useState(420); // Default 420px
  const [isResizing, setIsResizing] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState("gemini-3.6-flash");
  const [useWebSearch, setUseWebSearch] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(`iris_web_search_${urlProjectId}`);
    return saved !== null ? saved === "true" : true;
  });

  // Book Project State
  const [bookTitle, setBookTitle] = useState("Mon Projet de Livre");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [projectData, setProjectData] = useState<any>(null);

  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: 1,
      number: 1,
      title: "Sommaire",
      content: "",
      status: "Brouillon"
    }
  ]);

  // Chat Conversation State
  const [chatInput, setChatInput] = useState("");
  // Passage sélectionné dans l'éditeur et envoyé au chat pour édition ciblée
  const [attachedSelection, setAttachedSelection] = useState<{ text: string; from: number; to: number } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Documents analysés joints au chat + micro (transcription)
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [chatAttachments, setChatAttachments] = useState<{ name: string; purpose: string; analysis: string }[]>([]);
  const [isAnalyzingChatFile, setIsAnalyzingChatFile] = useState(false);
  const [chatAnalyzeError, setChatAnalyzeError] = useState("");
  const {
    isListening,
    isSupported: micSupported,
    error: micError,
    interimTranscript: micInterim,
    toggle: toggleMic,
  } = useSpeechToText((t) =>
    setChatInput((prev) => (prev ? prev + (prev.endsWith(" ") ? "" : " ") : "") + t)
  );

  const handleChatFile = async (file: File | null) => {
    if (!file) return;
    setIsAnalyzingChatFile(true);
    setChatAnalyzeError("");
    try {
      const { extractDocumentText } = await import("@/lib/parser/extractText");
      const { text } = await extractDocumentText(file);
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileName: file.name, purpose: "reference", model: selectedAiModel, projectId: currentProjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de l'analyse du document.");
      setChatAttachments((prev) => [...prev, { name: file.name, purpose: "reference", analysis: data.analysis || "" }]);
    } catch (err: any) {
      setChatAnalyzeError(err?.message || "Erreur lors de l'analyse.");
    } finally {
      setIsAnalyzingChatFile(false);
    }
  };

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  // Rédaction initiale du livre (sommaire + contenu) et réécriture complète :
  // pilotent l'animation "Iris écrit votre livre" au niveau de l'éditeur.
  const [isInitialGenerating, setIsInitialGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  // Génération automatique de tout le livre (chapitre par chapitre depuis le sommaire)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchLabel, setBatchLabel] = useState("Iris rédige votre livre");
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  // Signal d'arrêt de la génération complète (respecté entre deux chapitres).
  const batchStopRef = useRef(false);
  // Job serveur de génération de livre en cours (voir /api/generate-book/*).
  const bookJobIdRef = useRef<string | null>(null);
  // PIÈCES EN DIRECT pendant une génération : solde au lancement et devis,
  // pour afficher « X pièces utilisées sur ≈ Y » au fil des chapitres.
  const batchStartBalanceRef = useRef<number | null>(null);
  const [batchCoinPlan, setBatchCoinPlan] = useState<number | null>(null);
  // Débit récent (« −60 pièces ») affiché brièvement à côté du solde.
  const [coinFlash, setCoinFlash] = useState<number | null>(null);
  const refreshWalletRef = useRef(refreshWalletBalance);
  useEffect(() => {
    refreshWalletRef.current = refreshWalletBalance;
  }, [refreshWalletBalance]);
  const prevBalanceRef = useRef<number | null>(null);
  useEffect(() => {
    if (userLoading) return;
    const prev = prevBalanceRef.current;
    prevBalanceRef.current = walletBalance;
    if (prev === null || walletBalance >= prev) return;
    setCoinFlash(prev - walletBalance);
    const t = setTimeout(() => setCoinFlash(null), 4000);
    return () => clearTimeout(t);
  }, [walletBalance, userLoading]);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichManuscriptEditorHandle>(null);
  // Chapitres modifiés dans l'éditeur dont l'enregistrement n'est pas encore
  // confirmé : le rechargement depuis la base ne doit jamais les écraser.
  const locallyEditedIdsRef = useRef(new Set<number | string>());

  // Manuscript Import & Export State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGeoScoreModalOpen, setIsGeoScoreModalOpen] = useState(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // One-time cleanup to fix old QuotaExceededError bloated histories and remove phantom messages
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("iris_chat_history_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              
              // 1. Filter out the phantom Soundiata message if it got stuck in memory
              let cleaned = parsed.filter((msg: any) => 
                !msg.text || !msg.text.includes("L'Épopée de Soundiata")
              );

              // 2. Slim down huge HTML payloads
              if (raw.length > 50000) { 
                cleaned = cleaned.map((msg: any) => {
                  if (msg.chapterModification) {
                    return {
                      ...msg,
                      chapterModification: {
                        ...msg.chapterModification,
                        previousContent: undefined,
                        newContent: undefined
                      }
                    };
                  }
                  return msg;
                });
              }

              // Save the cleaned version back
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        }
      } catch (e) {
        console.warn("Error during localStorage cleanup:", e);
      }
    }
  }, []);

  // Persist chat messages to localStorage whenever they update
  useEffect(() => {
    if (currentProjectId && messages.length > 0 && typeof window !== "undefined") {
      try {
        // Optimisation : On retire les très gros blocs de texte (previousContent, newContent)
        // pour éviter l'erreur 'QuotaExceededError' qui bloquait la sauvegarde du localStorage.
        const slimMessages = messages.map(msg => {
          if (msg.chapterModification) {
            return {
              ...msg,
              chapterModification: {
                ...msg.chapterModification,
                previousContent: undefined,
                newContent: undefined
              }
            };
          }
          return msg;
        });
        localStorage.setItem(`iris_chat_history_${currentProjectId}`, JSON.stringify(slimMessages));
      } catch (e) {
        console.warn("Could not save chat history to localStorage:", e);
      }
    }
  }, [messages, currentProjectId]);

  // Load project on mount / whenever the project identifier in the URL changes
  useEffect(() => {
    const pId = urlProjectId || currentProjectId;

    if (pId) {
      // On repart systématiquement d'un chat vide : sans ce reset, la conversation
      // affichée pouvait appartenir à un tout autre projet ouvert plus tôt dans le
      // même onglet (le composant n'est pas remonté lors d'une navigation interne
      // qui ne fait que changer ?projectId=...), donnant l'impression que l'IA
      // "se souvient" d'un projet qu'elle n'a jamais vu.
      setMessages([]);
      setIsAiThinking(false);

      let isSubscribed = true;

      const streamPlanIntoChapter = async (
        project: {
          id: string; title: string; subtitle?: string; category?: string;
          audience?: string; synopsis?: string; tone?: string;
          characters?: string; length?: string; instructions?: string;
        },
        chapterId: number | string
      ) => {
        setIsAiThinking(true);
        setIsInitialGenerating(true);

        try {
          // Get context from localStorage to see what to generate
          let includeToc = true;
          let ctx: any = null;
          try {
            const ctxRaw = localStorage.getItem("iris_current_project");
            if (ctxRaw) {
              ctx = JSON.parse(ctxRaw);
              if (ctx.includeToc !== undefined) includeToc = ctx.includeToc;
            }
          } catch(e) {}

          // Visuels importés (blueprint Storybook) : la base fait foi — le
          // localStorage n'est qu'un repli pour la toute première génération,
          // juste après la création du projet.
          const planImageUrls = await loadProjectImageUrls(project.id, ctx);

          const response = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: project.title,
              subtitle: project.subtitle,
              category: project.category,
              audience: project.audience,
              synopsis: project.synopsis,
              tone: project.tone,
              characters: project.characters,
              length: project.length,
              instructions: project.instructions,
              includeToc,
              // Forme de l'ouvrage : elle décide du découpage du sommaire
              // (étapes pour un guide, chapitres thématiques pour un livre).
              workType: (project as any)?.work_type || undefined,
              blueprintId: (project as any)?.blueprint_id || undefined,
              // Flux « Vision-to-Story » : le découpage du conte se déduit des
              // images de l'auteur, pas seulement du synopsis.
              imageUrls: planImageUrls,
              projectId: project.id,
              model: (project as { writing_model?: string }).writing_model || ctx?.model || "gemini-3.6-flash",
              useWebSearch,
              // Document de référence analysé : priorité à la version persistée
              // en base (project.reference_*), sinon repli sur le localStorage.
              referenceAnalysis: (project as any)?.reference_analysis || ctx?.referenceDocument?.analysis || undefined,
              referencePurpose: (project as any)?.reference_meta?.purpose || ctx?.referenceDocument?.purpose || undefined,
              referenceName: (project as any)?.reference_meta?.name || ctx?.referenceDocument?.name || undefined,
            })
          });

          if (!response.ok) throw new Error("Erreur API");

          if (!isSubscribed) return;
          setIsAiThinking(false);

          const aiMessageId = Date.now();
          // DO NOT ADD TO CHAT - Background generation
          // Just ensure the welcome message is present
          setMessages([
            {
              id: aiMessageId - 10,
              sender: "ai",
              text: "Bonjour, je suis Iris, prête à vous aider sur ce livre !",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ]);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            let done = false;
            let currentText = "";

            while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              if (value) {
                currentText += decoder.decode(value, { stream: true });
                // Do not update chat messages
              }
            }

            if (isSubscribed) {
              // Le libellé du sommaire est choisi par l'IA ("Sommaire" ou
              // "Table des matières") : on le récupère depuis le premier <h1>
              // du contenu généré pour rester cohérent dans la barre latérale.
              const firstHeading = currentText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
              const derivedTitle = firstHeading
                ? firstHeading[1].replace(/<[^>]*>/g, "").trim()
                : "";
              const chapterTitle = includeToc
                ? (derivedTitle || "Sommaire")
                : (derivedTitle || "Chapitre 1");
              setChapters(prev => prev.map(chap =>
                chap.id === chapterId
                  ? { ...chap, content: currentText, title: chapterTitle, status: "En cours" }
                  : chap
              ));
              // Réutilise l'autosave existant pour persister le plan généré en base.
              setSaveStatus("saving");
            }
          }
        } catch (error) {
          console.error("Erreur lors de la génération du plan/contenu:", error);
          if (isSubscribed) {
            setIsAiThinking(false);
            setMessages(prev => [
              ...prev,
              {
                id: Date.now(),
                sender: "ai",
                text: "Désolé, une erreur est survenue lors de la génération de votre livre. Veuillez réessayer.",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            ]);
          }
        } finally {
          if (isSubscribed) setIsInitialGenerating(false);
          void refreshWalletRef.current?.();
        }
      };

      const loadProject = async () => {
        try {
          const res = await fetch(`/api/projects/${pId}`);
          const data = await res.json();
          if (!isSubscribed) return;

          if (!data.project) {
            console.error("Erreur de chargement du projet:", data.error);
            return;
          }

          setBookTitle(data.project.title);
          setCurrentProjectId(data.project.id);
          setProjectData(data.project);

          const fetchedChapters: Chapter[] =
            data.chapters && data.chapters.length > 0 ? toEditorChapters(data.chapters) : [];

          if (fetchedChapters.length > 0) {
            setChapters(fetchedChapters);
          } else {
            // Créer un chapitre par défaut si aucun n'existe
            try {
              const res = await fetch(`/api/projects/${pId}/chapters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapters: [{ number: 1, title: "Sommaire", content: "", status: "Brouillon" }] })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.chapters && data.chapters.length > 0) {
                  setChapters(data.chapters.map((ch: any) => ({
                    id: ch.id,
                    number: ch.number,
                    title: ch.title || "Sommaire",
                    content: ch.content || "",
                    status: ch.status || "Brouillon"
                  })));
                }
              }
            } catch (err) {
              console.error("Erreur création chapitre par défaut:", err);
            }
          }

          const firstChapter = fetchedChapters.length > 0 ? fetchedChapters[0] : chapters[0];
          const isFreshEmptyProject = isNewProject && firstChapter && !firstChapter.content;

          if (isFreshEmptyProject) {
            await streamPlanIntoChapter(data.project, firstChapter.id);
          } else {
            // Load persisted chat history for this project if available
            const savedChatKey = `iris_chat_history_${data.project.id}`;
            const savedChatRaw = typeof window !== "undefined" ? localStorage.getItem(savedChatKey) : null;
            let restoredChat: Message[] = [];
            if (savedChatRaw) {
              try {
                restoredChat = JSON.parse(savedChatRaw);
              } catch (e) {
                console.warn("Could not parse saved chat history:", e);
              }
            }

            if (restoredChat.length > 0) {
              setMessages(restoredChat);
            } else {
              setMessages([
                {
                  id: 1,
                  sender: "ai",
                  text: `Bonjour ! Je suis Iris IA, votre co-auteur sur "${data.project.title}". Que voulez-vous faire ?`,
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
              ]);
            }
          }
        } catch (err) {
          console.error("Erreur de chargement du projet:", err);
        }
      };

      loadProject();

      return () => {
        isSubscribed = false;
      };
    }

    // Repli historique : aucun projet réel en base, on retombe sur l'ancien
    // contexte purement local (ne devrait plus arriver une fois l'assistant
    // /projects/new utilisé, conservé pour ne rien casser côté anciens liens).
    const projectContextStr = localStorage.getItem("iris_current_project");
    const projectContext = projectContextStr ? JSON.parse(projectContextStr) : null;

    if (projectContextStr && projectContext?.title) {
      setBookTitle(projectContext.title);
      setProjectData(projectContext);
      setMessages([
        {
          id: 1,
          sender: "ai",
          text: `Bonjour ! Je suis Iris IA, votre co-auteur. Je suis prêt à travailler sur votre projet "${projectContext.title}". Que voulez-vous faire ?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setChapters([
        {
          id: 1,
          number: 1,
          title: "Chapitre 1",
          content: "Commencez à écrire ici...",
          status: "Brouillon"
        }
      ]);
    }
  }, [urlProjectId, isNewProject]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (saveStatus !== "saving") return;

    const timer = setTimeout(async () => {
      const currentChap = chapters[activeChapterIndex];
      const pId = currentProjectId || localStorage.getItem("iris_current_project_id");

      if (pId && currentChap?.id) {
        try {
          const res = await fetch(`/api/projects/${pId}/chapters/${currentChap.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: currentChap.title,
              content: currentChap.content,
              status: currentChap.status
            })
          });

          if (res.ok) {
            locallyEditedIdsRef.current.delete(currentChap.id);
            setSaveStatus("saved");
            return;
          } else {
            setSaveStatus("error");
            return;
          }
        } catch (err) {
          console.error("Erreur d'autosave API:", err);
          setSaveStatus("error");
          return;
        }
      }

      setSaveStatus("error");
    }, 1500);

    return () => clearTimeout(timer);
  }, [chapters, saveStatus, activeChapterIndex, currentProjectId]);

  // Chapitres écrits HORS de l'éditeur — typiquement par l'assistant IA de
  // l'auteur connecté en MCP (Claude, ChatGPT…) : au retour sur l'onglet, on
  // recharge le livre enregistré pour les afficher sans rechargement manuel.
  // Jamais pendant une génération ni avec des modifications locales en attente
  // d'enregistrement : la frappe de l'auteur n'est jamais écrasée.
  const canSyncFromServerRef = useRef(false);
  useEffect(() => {
    canSyncFromServerRef.current =
      saveStatus === "saved" &&
      !isBatchGenerating && !isGeneratingChapter && !isInitialGenerating && !isRewriting && !isAiThinking;
  }, [saveStatus, isBatchGenerating, isGeneratingChapter, isInitialGenerating, isRewriting, isAiThinking]);

  useEffect(() => {
    const pId = currentProjectId;
    if (!pId) return;
    let inFlight = false;

    const syncFromServer = async () => {
      if (document.visibilityState !== "visible" || inFlight || !canSyncFromServerRef.current) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/projects/${pId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const saved: Chapter[] = toEditorChapters(data.chapters || []);
        // Nouvelle vérification : l'auteur a pu reprendre la main pendant la requête.
        if (saved.length === 0 || !canSyncFromServerRef.current) return;
        setChapters((prev) => {
          // Un chapitre modifié dans l'éditeur et pas encore confirmé en base
          // garde sa version locale ; les autres prennent celle de la base.
          const merged = saved.map((c) => {
            const local = prev.find((p) => p.id === c.id);
            return local && locallyEditedIdsRef.current.has(c.id) ? local : c;
          });
          const localOnly = prev.filter((p) => !saved.some((c) => c.id === p.id));
          const next = [...merged, ...localOnly];
          const unchanged =
            prev.length === next.length &&
            prev.every((c, i) => c.id === next[i].id && c.title === next[i].title && c.content === next[i].content);
          return unchanged ? prev : next;
        });
      } catch {
        /* hors ligne : on réessaiera au prochain retour sur l'onglet */
      } finally {
        inFlight = false;
      }
    };

    document.addEventListener("visibilitychange", syncFromServer);
    window.addEventListener("focus", syncFromServer);
    return () => {
      document.removeEventListener("visibilitychange", syncFromServer);
      window.removeEventListener("focus", syncFromServer);
    };
  }, [currentProjectId]);

  // Resizing Handler via Mouse Drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 720) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Calculate current word count (strip HTML tags for accurate counting)
  const currentChapter = chapters[activeChapterIndex] || chapters[0];
  const stripHtmlForWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  };
  const wordCount = liveWordCount || stripHtmlForWordCount(currentChapter.content);


  // Envoyer la sélection de l'éditeur vers le chat (Option A)
  const handleSendSelectionToChat = (selection: { text: string; from: number; to: number }) => {
    setAttachedSelection(selection);
    setMobileView("chat");
  };

  // Édition ciblée : ne réécrit QUE le passage sélectionné, à sa position exacte
  const handleSelectionEdit = async (instruction: string) => {
    const sel = attachedSelection;
    if (!sel) return;
    const chapter = chapters[activeChapterIndex];
    const previousChapterContent = chapter?.content || "";

    const userMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: `Sur le passage sélectionné : ${instruction}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setAttachedSelection(null);
    setIsAiThinking(true);

    try {
      const newText = await handleContextualAiAction("custom", sel.text, instruction);
      if (!newText || !newText.trim()) throw new Error("Réponse vide");

      // Remplace uniquement le passage à sa position, l'éditeur resynchronise le chapitre
      editorRef.current?.replaceRange(sel.from, sel.to, newText);
      setSaveStatus("saving");
      setIsAiThinking(false);

      setTimeout(() => {
        const updatedHtml = editorRef.current?.getContent() || previousChapterContent;
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "ai",
          text: "Le passage sélectionné a été mis à jour directement dans votre chapitre.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          chapterModification: {
            chapterIndex: activeChapterIndex,
            ...(chapter?.id !== undefined && { chapterId: chapter.id }),
            chapterTitle: chapter?.title || `Chapitre ${activeChapterIndex + 1}`,
            summary: `Passage réécrit : « ${sel.text.slice(0, 70)}${sel.text.length > 70 ? "…" : ""} »`,
            previousContent: previousChapterContent,
            newContent: updatedHtml
          }
        }]);
      }, 60);
    } catch (error) {
      console.error("Erreur édition ciblée:", error);
      const detail = error instanceof Error && error.message ? error.message : "erreur inconnue";
      setIsAiThinking(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        sender: "ai",
        text: `Impossible de modifier ce passage (${detail}). Veuillez réessayer.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query.trim()) return;

    // Si un passage est attaché, on fait une édition ciblée (pas un chat classique)
    if (attachedSelection && !textToSend) {
      handleSelectionEdit(query);
      return;
    }

    const userMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setIsAiThinking(true);
    setMobileView("chat");

    const chatRequest = async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            model: selectedAiModel,
            useWebSearch,
            context: {
              title: bookTitle,
              synopsis: projectData?.synopsis || currentChapter.content.substring(0, 500),
              tone: projectData?.tone || "professionnel",
              referenceDocuments: chatAttachments,
            },
            chapters,
            activeChapterIndex,
            projectId: currentProjectId
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const serverMessage = errorData?.error || `Erreur serveur (${response.status})`;
          throw new Error(serverMessage);
        }

        setIsAiThinking(false);

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          // JSON response returned (MODIFY_CHAPTER intent payload)
          const json = await response.json();
          const chatSummaryText = json.chatSummary || json.summary || json.text || json.message || "Modifications effectuées sur le manuscrit.";
          const modPayload: ChapterModificationPayload | undefined = json.chapterModification;

          const aiMsg: Message = {
            id: Date.now() + 1,
            sender: "ai",
            text: chatSummaryText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            ...(modPayload && { chapterModification: modPayload })
          };

          setMessages(prev => [...prev, aiMsg]);

          if (modPayload) {
            const targetIndex = modPayload.chapterIndex;
            const newContent = modPayload.newContent;

            // Capture previous content and chapter title before mutation (for 1-click Undo)
            const targetChap = chapters[targetIndex] || chapters[0];
            modPayload.previousContent = targetChap?.content || "";
            modPayload.chapterTitle = targetChap?.title || modPayload.chapterTitle || `Chapitre ${targetIndex + 1}`;

            // Execute active chapter switch
            if (targetIndex >= 0 && targetIndex < chapters.length) {
              setActiveChapterIndex(targetIndex);
            }

            if (newContent !== undefined) {
              // Update React state for chapters & trigger Supabase persistence
              setChapters(prev => {
                const updated = [...prev];
                if (targetIndex >= 0 && targetIndex < updated.length) {
                  updated[targetIndex] = {
                    ...updated[targetIndex],
                    content: newContent
                  };
                }
                return updated;
              });
              setSaveStatus("saving");

              // Apply content to TipTap editor
              setTimeout(() => {
                editorRef.current?.replaceContent(newContent);
              }, 50);
            }
          }
        } else {
          // Plain text stream (CHAT_ONLY intent)
          const aiMessageId = Date.now() + 1;
          setMessages(prev => [...prev, {
            id: aiMessageId,
            sender: "ai",
            text: "",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }]);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            let currentText = "";
            let done = false;
            while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              if (value) {
                currentText += decoder.decode(value, { stream: true });
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? { ...msg, text: currentText } : msg
                ));
              }
            }
          }
        }
      } catch (error: any) {
        console.error(error);
        setIsAiThinking(false);
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          sender: "ai",
          text: error?.message || "Désolé, je rencontre une erreur de communication. Veuillez réessayer.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }]);
      }
    };
    
    chatRequest();
  };

  // Insert AI Generated Paragraph directly into Manuscript Editor
  const handleInsertIntoManuscript = (textToInsert: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(textToInsert);
    } else {
      const updated = [...chapters];
      updated[activeChapterIndex].content += textToInsert;
      setChapters(updated);
      setSaveStatus("saving");
    }
  };

  // Contextual AI Actions (Reformuler, Enrichir, etc.)
  const handleContextualAiAction = async (actionType: string, selectedText: string, customInstruction?: string): Promise<string> => {
    try {
      const response = await fetch("/api/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          selectedText,
          customInstruction,
          synopsis: projectData?.synopsis || "",
          tone: projectData?.tone || "professionnel",
          model: selectedAiModel,
          projectId: currentProjectId
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || `Erreur AI contextuelle (${response.status})`);
      }

      // La route renvoie désormais du JSON { text } (non-streaming) : plus robuste
      // et les erreurs réelles remontent au lieu d'un flux vide silencieux.
      const data = await response.json();
      return data?.text || "";
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // Generate Full Chapter using AI
  const handleGenerateFullChapter = async () => {
    setIsGeneratingChapter(true);
    
    try {
      const previousChaptersSummary = chapters
        .slice(0, activeChapterIndex)
        .map(c => `Chapitre ${c.number} (${c.title}): ${c.content.substring(0, 150)}...`)
        .join('\n');

      // Retrouve le sommaire (premier chapitre dont le titre correspond) pour que
      // l'IA rédige chaque chapitre en cohérence avec les points annoncés.
      const outlineChapter = chapters.find(c =>
        /sommaire|table des mati/i.test(c.title || "")
      );
      const bookOutline = outlineChapter && outlineChapter.id !== currentChapter.id
        ? outlineChapter.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 12000)
        : "";

      const response = await fetch("/api/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          synopsis: projectData?.synopsis || "",
          tone: projectData?.tone || "professionnel",
          category: projectData?.category || undefined,
          characters: (projectData as any)?.characters || undefined,
          chapterTitle: currentChapter.title,
          chapterNumber: currentChapter.number,
          previousChaptersSummary,
          bookOutline,
          model: selectedAiModel,
          projectId: currentProjectId,
          useWebSearch
        })
      });

      if (!response.ok) throw new Error("Erreur API Generation Chapitre");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let currentText = "";
        let done = false;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            currentText += decoder.decode(value, { stream: true });
            
            setChapters(prev => {
              const updated = [...prev];
              updated[activeChapterIndex].content = currentText;
              updated[activeChapterIndex].status = "En cours";
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la génération du chapitre. Vérifiez votre connexion ou vos crédits IA.");
    } finally {
      setIsGeneratingChapter(false);
    }
  };


  // Extrait la liste des chapitres (titre + aperçu) depuis le HTML du sommaire.
  // On ne garde que les items de PREMIER niveau de la liste (les sous-points
  // imbriqués sont ignorés). Le titre est dans le <strong>, l'aperçu après.
  const parseSommaireChapters = (html: string): { title: string; brief: string }[] => {
    if (!html) return [];
    const outer = html.match(/<ul[^>]*>([\s\S]*)<\/ul>/i)?.[1] || html;
    let inner = outer;
    let prev = "";
    do {
      prev = inner;
      inner = inner.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, "");
    } while (inner !== prev);
    const clean = (s: string) =>
      s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

    const splitTitleBrief = (rawLi: string): { title: string; brief: string } => {
      const strong = rawLi.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      if (strong) {
        const title = clean(strong[1]);
        const brief = clean(rawLi.replace(strong[0], "")).replace(/^[\s—–:-]+/, "").trim();
        return { title, brief };
      }
      const text = clean(rawLi);
      const sep = text.split(/\s[—–-]\s/);
      if (sep.length > 1) return { title: sep[0].trim(), brief: sep.slice(1).join(" — ").trim() };
      return { title: text, brief: "" };
    };

    // On EXCLUT toute entrée qui désigne le sommaire lui-même : sans ce filtre,
    // « Sommaire » devient un chapitre et l'IA rédige un essai SUR les sommaires
    // au lieu du sujet du livre (bug observé en production).
    const isTocEntry = (t: string) => /^\s*(sommaire|table des mati)/i.test(t);
    let items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => splitTitleBrief(m[1]))
      .filter((c) => c.title.length > 1 && !isTocEntry(c.title));
    if (items.length === 0) {
      items = Array.from(html.matchAll(/<(?:h2|h3)[^>]*>([\s\S]*?)<\/(?:h2|h3)>/gi))
        .map((m) => ({ title: clean(m[1]), brief: "" }))
        .filter((c) => c.title.length > 2 && !/sommaire|table des mati/i.test(c.title));
    }
    // Dédoublonnage sur le titre en conservant l'ordre
    const seen = new Set<string>();
    return items.filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true))).slice(0, 24);
  };

  // Forme de l'ouvrage (livre / guide / ebook) : choisie par l'auteur à la
  // création, déduite par heuristique pour les projets antérieurs. Elle pilote
  // à la fois la structure demandée à l'IA et la mise en page à l'export.
  const bookWorkType = resolveWorkType({
    explicit: (projectData as any)?.work_type,
    category: projectData?.category,
    title: bookTitle,
    length: projectData?.length,
  });

  // Le chapitre-sommaire, s'il existe (sinon null → mode prototype).
  const findSommaireChapter = () => chapters.find((c) => /sommaire|table des mati/i.test(c.title || "")) || null;

  // Nombre de chapitres détectés dans le sommaire (pour l'estimation du popup).
  const sommaireChapterCount = (() => {
    const s = findSommaireChapter();
    if (!s) return null;
    const only = (s.content.split(/<hr[^>]*data-page-break[^>]*>/i)[0] || s.content).trim();
    const n = parseSommaireChapters(only).length;
    return n > 0 ? n : null;
  })();

  // Suit un job de rédaction serveur jusqu'à son issue, en reflétant la
  // progression réelle des chapitres enregistrés. Sert au lancement, à la
  // reprise (« Continuer la rédaction ») et à la reconnexion quand l'auteur
  // rouvre un livre en cours de rédaction. Chaque interrogation du statut
  // relance aussi, côté serveur, un job dont le worker s'est arrêté.
  const followBookJob = useCallback(
    (jobId: string, signal?: AbortSignal): Promise<"completed" | "failed" | "canceled" | "stopped" | "detached"> =>
      new Promise((resolve) => {
        bookJobIdRef.current = jobId;
        const finish = (outcome: "completed" | "failed" | "canceled" | "stopped" | "detached") => {
          if (bookJobIdRef.current === jobId) bookJobIdRef.current = null;
          resolve(outcome);
        };

        let lastDone = -1;
        const poll = async () => {
          // L'éditeur a changé de livre : on cesse de suivre, sans arrêter le job.
          if (signal?.aborted) {
            finish("detached");
            return;
          }
          if (batchStopRef.current) {
            try {
              await fetch("/api/generate-book/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
              });
            } catch { /* best-effort */ }
            finish("stopped");
            return;
          }

          try {
            const res = await fetch(`/api/generate-book/status?jobId=${jobId}`, { cache: "no-store" });
            if (res.status === 404) {
              finish("detached");
              return;
            }
            const data = await res.json().catch(() => null);
            if (signal?.aborted) {
              finish("detached");
              return;
            }
            if (Array.isArray(data?.chapters)) setChapters(toEditorChapters(data.chapters));
            const job: BookJobSnapshot | undefined = data?.job;
            if (job) {
              const total = Math.max(1, job.total);
              const done = Math.min(job.current_index, total);
              // Un chapitre de plus = un débit de plus : le solde affiché suit.
              if (done !== lastDone) {
                lastDone = done;
                void refreshWalletRef.current?.();
              }
              setBatchProgress({ current: done, total });
              if (job.status === "running") {
                setBatchLabel(data?.resumed ? "Reprise automatique de la rédaction…" : `Rédaction ${Math.min(done + 1, total)}/${total}…`);
              }
              if (job.status === "failed") {
                alert(bookJobFailureMessage(job));
                finish("failed");
                return;
              }
              if (job.status === "completed" || job.status === "canceled") {
                finish(job.status);
                return;
              }
            }
          } catch (err) {
            console.warn("Erreur de polling du job de génération:", err);
          }
          setTimeout(poll, 3000);
        };
        poll();
      }),
    []
  );

  // RECONNEXION : l'auteur rouvre un livre dont la rédaction tourne encore
  // côté serveur (onglet rechargé, retour plus tard, autre appareil). On
  // réaffiche la progression et on suit le job jusqu'au bout ; sans cela le
  // livre paraissait figé et l'auteur relançait — et repayait — tout le livre.
  const isBatchGeneratingRef = useRef(false);
  useEffect(() => {
    isBatchGeneratingRef.current = isBatchGenerating;
  }, [isBatchGenerating]);

  useEffect(() => {
    const pId = currentProjectId;
    if (!pId) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/generate-book/status?projectId=${encodeURIComponent(pId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const job: BookJobSnapshot | undefined = data?.job;
        // Rien à reprendre, ou une rédaction est déjà suivie dans cet onglet.
        if (!job || job.status !== "running" || controller.signal.aborted) return;
        if (bookJobIdRef.current || isBatchGeneratingRef.current) return;

        batchStopRef.current = false;
        setIsBatchGenerating(true);
        setBatchProgress({ current: Math.min(job.current_index, job.total), total: Math.max(1, job.total) });
        setBatchLabel("Rédaction en cours…");
        try {
          const outcome = await followBookJob(job.id, controller.signal);
          if (outcome === "completed") await finalizeGeneratedBookRef.current(pId);
        } finally {
          setIsBatchGenerating(false);
          setBatchProgress(null);
          batchStopRef.current = false;
        }
      } catch {
        /* hors ligne ou changement de livre : rien à reprendre */
      }
    })();

    return () => controller.abort();
  }, [currentProjectId, followBookJob]);

  // RÉGLAGES DU LIVRE — choisis UNE fois dans l'assistant de création
  // (longueur + modèle, enregistrés sur le projet) : plus de second popup.
  const [storedModel, setStoredModel] = useState<string | null>(null);
  useEffect(() => {
    if (!currentProjectId) return;
    try {
      const ls = localStorage.getItem(`iris_project_model_${currentProjectId}`) || localStorage.getItem("iris_book_gen_model");
      setStoredModel(ls && BOOK_MODELS.some((m) => m.id === ls) ? ls : null);
    } catch {
      setStoredModel(null);
    }
  }, [currentProjectId]);
  const projectModel: string = projectData?.writing_model || storedModel || DEFAULT_WRITING_MODEL;
  const projectSizeKey: BookSizeKey = lengthToSizeKey(projectData?.length);
  const bookPagesEstimate = sommaireChapterCount
    ? Math.max(1, Math.round((sommaireChapterCount * SIZE_PRESETS[projectSizeKey].wordsPerChapter) / WORDS_PER_PAGE))
    : SIZE_PRESETS[projectSizeKey].pagesEstimate;
  const bookCostEstimate = estimatePagesCoins(bookPagesEstimate, projectModel);
  const plainLength = (html: string | null | undefined) =>
    (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
  const bookHasWrittenBody = chapters.some((c) => !isOutlineTitle(c.title) && plainLength(c.content) > 200);
  const fmtCoins = (n: number) => Math.round(n).toLocaleString("fr-FR");

  // Lance directement la rédaction avec les réglages du projet. Seule une
  // réécriture d'un livre DÉJÀ rédigé demande confirmation (elle remplace le texte).
  const handleGenerateWholeBook = () => {
    if (isBatchGenerating) return;
    if (!userLoading && walletBalance < bookCostEstimate) {
      if (confirm(`La rédaction de ce livre coûte environ ${fmtCoins(bookCostEstimate)} pièces et votre solde est de ${fmtCoins(walletBalance)} pièces.\n\nRecharger maintenant ?`)) {
        router.push("/pricing");
      }
      return;
    }
    if (
      bookHasWrittenBody &&
      !confirm(`Votre livre contient déjà du texte. Le régénérer remplacera tout le contenu actuel (≈ ${fmtCoins(bookCostEstimate)} pièces). Continuer ?`)
    ) {
      return;
    }
    void runWholeBookGeneration({ sizeKey: projectSizeKey, model: projectModel });
  };

  // FIN DE RÉDACTION : le livre s'affiche d'un seul tenant (« Livre complet »),
  // sans le sommaire qui n'était que le plan. « Découper en chapitres » reste
  // disponible. On ne fusionne que si TOUS les chapitres sont rédigés, pour
  // que « Continuer la rédaction » reste possible après un arrêt.
  const finalizeGeneratedBook = async (pId: string) => {
    try {
      const res = await fetch(`/api/projects/${pId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const rows = toEditorChapters(data.chapters || []).sort((a, b) => a.number - b.number);
      const body = rows.filter((c) => !isOutlineTitle(c.title));
      if (rows.length <= 1 || body.length === 0 || body.some((c) => plainLength(c.content) < 40)) return;
      const merged = {
        number: 1,
        title: MERGED_BOOK_TITLE,
        content: mergeChaptersHtml(rows, { skipOutline: true }),
        status: "Terminé",
      };
      setSaveStatus("saving");
      const persisted = await replaceChaptersOnServer(pId, rows, [merged]);
      if (persisted) {
        setChapters(persisted);
        setActiveChapterIndex(0);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.warn("Assemblage du livre impossible (les chapitres restent séparés):", err);
    } finally {
      void refreshWalletRef.current?.();
    }
  };
  const finalizeGeneratedBookRef = useRef(finalizeGeneratedBook);
  finalizeGeneratedBookRef.current = finalizeGeneratedBook;

  // Génère automatiquement tout le livre selon les options du popup : un chapitre
  // par point (du sommaire, ou d'une structure proposée par l'IA en mode prototype),
  // rédigé séquentiellement (un appel IA par chapitre pour tenir la limite de 60 s).
  const runWholeBookGeneration = async (opts: { sizeKey: BookSizeKey; model: string }) => {
    const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
    if (!pId) {
      alert("Projet introuvable. Enregistrez d'abord votre projet.");
      return;
    }
    const preset = SIZE_PRESETS[opts.sizeKey];
    const model = opts.model || selectedAiModel;

    batchStopRef.current = false;
    setBatchProgress(null);
    setIsBatchGenerating(true);
    batchStartBalanceRef.current = userLoading ? null : walletBalance;
    setBatchCoinPlan(bookCostEstimate);
    setBatchLabel("Préparation des chapitres…");
    try {
      const sommaire = findSommaireChapter();
      let planChapters: { title: string; brief: string }[] = [];
      let sommaireOnly = "";

      if (sommaire) {
        // MODE SOMMAIRE : on lit les chapitres depuis le sommaire (édité ou non).
        sommaireOnly = (sommaire.content.split(/<hr[^>]*data-page-break[^>]*>/i)[0] || sommaire.content).trim();
        planChapters = parseSommaireChapters(sommaireOnly);
      } else {
        // MODE PROTOTYPE : pas de sommaire dans le livre → l'IA propose une
        // structure à partir du prototype et du nombre de chapitres visé.
        const prototype = chapters[0]?.content || "";
        const res = await fetch("/api/generate-outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bookTitle,
            subtitle: projectData?.subtitle,
            synopsis: projectData?.synopsis || "",
            tone: projectData?.tone || "professionnel",
            audience: projectData?.audience,
            category: projectData?.category,
            length: projectData?.length,
            instructions: projectData?.instructions,
            prototype: prototype.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000),
            targetChapters: preset.chaptersIfNoSommaire,
            workType: (projectData as any)?.work_type || undefined,
            referenceAnalysis: (projectData as any)?.reference_analysis || undefined,
            model,
            projectId: pId,
          }),
        });
        if (res.status === 402) { alert("Pièces insuffisantes pour préparer la structure du livre."); return; }
        const data = await res.json().catch(() => null);
        planChapters = (data?.chapters || [])
          .map((c: any) => ({ title: String(c.title || "").trim(), brief: String(c.brief || "").trim() }))
          .filter((c: any) => c.title);

        // Filet de sécurité côté client : si la structure n'a pas pu être
        // préparée (réseau, 500…), on fabrique une trame minimale à partir du
        // projet pour que le livre sans sommaire s'écrive quand même.
        if (planChapters.length === 0) {
          const base = (projectData?.synopsis || bookTitle || "").toString().trim();
          planChapters = Array.from({ length: preset.chaptersIfNoSommaire }, (_, k) => ({
            title: `Chapitre ${k + 1}`,
            brief: base ? `Développe cette partie du livre : ${base.slice(0, 200)}` : "",
          }));
        }
      }

      if (planChapters.length === 0) {
        alert("Aucun chapitre à générer. Ajoutez un sommaire ou réessayez.");
        return;
      }

      // TITRES CANONIQUES. Le numéro affiché au lecteur se calcule sur la
      // POSITION dans le corps du livre, jamais sur le rang en base : le
      // chapitre-sommaire occupe `number = 1`, donc le premier vrai chapitre
      // porte `number = 2` et l'ancien code écrivait « Chapitre 2 :
      // Introduction ». Les liminaires (Introduction, Conclusion…) ne sont pas
      // numérotés, et un titre déjà préfixé n'est jamais re-préfixé.
      const workTypeForBook = resolveWorkType({
        explicit: (projectData as any)?.work_type,
        category: projectData?.category,
        title: bookTitle,
        length: projectData?.length,
      });
      const labels = assignChapterLabels(
        planChapters,
        chapterNounFor(workTypeForBook, detectGenre(projectData?.category, projectData?.tone))
      );

      // (Re)crée la structure : sommaire en tête (mode sommaire) puis un chapitre par point.
      const draft: { number: number; title: string; content: string; status: string }[] = [];
      let num = 1;
      if (sommaire) {
        draft.push({ number: num++, title: sommaire.title, content: sommaireOnly, status: "En cours" });
      }
      planChapters.forEach((c, k) => {
        draft.push({ number: num++, title: labels[k]?.heading || c.title, content: "", status: "Brouillon" });
      });

      const created = await replaceChaptersOnServer(pId, chapters, draft);
      if (!created || created.length === 0) {
        alert("Erreur lors de la préparation des chapitres.");
        return;
      }
      setChapters(created);

      const startIdx = sommaire ? 1 : 0;
      const total = created.length - startIdx;
      const outline = sommaire
        ? sommaireOnly.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 12000)
        : planChapters.map((c, k) => `${k + 1}. ${c.title} — ${c.brief}`).join("\n").substring(0, 12000);

      // Démarre le job de génération CÔTÉ SERVEUR : chaque chapitre s'enchaîne
      // tout seul sur le serveur (voir /api/generate-book/*), donc fermer cet
      // onglet n'interrompt plus rien — contrairement à l'ancienne boucle qui
      // tournait ici, dans le navigateur, chapitre après chapitre.
      const plan = created.slice(startIdx).map((c, k) => ({
        chapterId: c.id,
        number: c.number,
        title: labels[k]?.cleanTitle || planChapters[k]?.title || c.title,
        brief: planChapters[k]?.brief || "",
        // Titre définitif imposé au modèle : c'est ce qui empêche toute
        // renumérotation fantaisiste chapitre après chapitre.
        heading: labels[k]?.heading || c.title,
      }));

      const startResp = await fetch("/api/generate-book/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pId,
          chapters: plan,
          settings: {
            title: bookTitle,
            synopsis: projectData?.synopsis || "",
            tone: projectData?.tone || "professionnel",
            category: projectData?.category || undefined,
            audience: (projectData as any)?.audience || undefined,
            characters: (projectData as any)?.characters || undefined,
            instructions: projectData?.instructions || undefined,
            bookOutline: outline,
            model,
            targetWords: preset.wordsPerChapter,
            useWebSearch,
            workType: bookWorkType,
            // Visuels du projet (blueprint Storybook) : le job les répartit
            // ensuite entre les chapitres.
            imageUrls: await loadProjectImageUrls(pId),
          },
        }),
      });

      if (startResp.status === 402) {
        alert("Fonds insuffisants pour démarrer la génération du livre.");
        return;
      }
      if (!startResp.ok) {
        alert("Impossible de démarrer la génération du livre. Réessayez.");
        return;
      }
      const { jobId } = await startResp.json();
      setBatchProgress({ current: 0, total });

      // Suit le job jusqu'à complétion/échec/annulation, en reflétant la
      // progression réelle des chapitres depuis la base.
      const outcome = await followBookJob(jobId);

      setActiveChapterIndex(startIdx);
      if (outcome === "completed") await finalizeGeneratedBook(pId);
    } catch (error) {
      console.error("Erreur lors de la génération complète du livre:", error);
      alert("Une erreur est survenue pendant la génération du livre. Les chapitres déjà rédigés sont enregistrés.");
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
      setBatchCoinPlan(null);
      batchStartBalanceRef.current = null;
      batchStopRef.current = false;
      void refreshWalletRef.current?.();
    }
  };

  // Vrai ? au moins un chapitre (hors sommaire) est encore VIDE → on peut reprendre.
  const isRealChapterEmpty = (c: Chapter) =>
    !/sommaire|table des mati/i.test(c.title || "") &&
    (c.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length < 40;
  const hasEmptyChapterRows =
    chapters.some(isRealChapterEmpty) &&
    chapters.some((c) => !isRealChapterEmpty(c) || /sommaire|table des mati/i.test(c.title || ""));

  // Reprise possible AUSSI depuis un document fusionné (« Livre complet »).
  // Après une génération interrompue dans cette vue, le livre tient sur UNE
  // seule ligne : les chapitres restants n'y sont que des titres nus, sans
  // corps. Aucune ligne n'étant vide, la reprise était jugée impossible et
  // l'auteur devait relancer — et repayer — tout le livre.
  const mergedUnwritten = useMemo(() => {
    if (chapters.length !== 1) return null;
    const doc = chapters[0];
    if (!doc?.content || /sommaire|table des mati/i.test(doc.title || "")) return null;
    try {
      const sections = splitHtmlIntoChapters(doc.content, doc.title || "Chapitre 1");
      if (sections.length <= 1) return null;
      const report = findUnwrittenSections(sections);
      return canResume(report) ? { sections, report } : null;
    } catch {
      return null; // un découpage impossible ne doit jamais casser l'éditeur
    }
  }, [chapters]);

  const hasUnwrittenChapters = hasEmptyChapterRows || !!mergedUnwritten;

  // Combien de chapitres reste-t-il réellement à écrire ? Affiché sur le
  // bouton pour que l'auteur sache d'emblée ce qu'il va relancer — et payer.
  const remainingChaptersCount = mergedUnwritten
    ? mergedUnwritten.report.unwritten.length
    : chapters.filter(isRealChapterEmpty).length;

  // REPRISE : ne (re)génère QUE les chapitres restés vides, sans toucher aux
  // chapitres déjà rédigés (contrairement à « Générer tout le livre » qui
  // recrée toute la structure). Sert après un arrêt pour pièces insuffisantes.
  const continueBookGeneration = async () => {
    const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
    if (!pId) { alert("Projet introuvable. Enregistrez d'abord votre projet."); return; }

    // CAS DU DOCUMENT FUSIONNÉ. Si le livre tient sur une seule ligne
    // (« Livre complet ») avec des chapitres réduits à leur titre, on le
    // redécoupe d'abord en vraies lignes de chapitre. Le contenu déjà rédigé
    // est intégralement conservé : seuls les titres sans corps deviendront des
    // chapitres vides, que la reprise ira ensuite remplir.
    let workingChapters = chapters;
    if (mergedUnwritten) {
      setBatchLabel("Préparation des chapitres restants…");
      const draft = mergedUnwritten.sections.map((sp, idx) => ({
        number: idx + 1,
        title: sp.title || `Chapitre ${idx + 1}`,
        content: sp.content || "",
        status: "Brouillon",
      }));
      setSaveStatus("saving");
      const persisted = await replaceChaptersOnServer(pId, chapters, draft);
      if (!persisted || persisted.length === 0) {
        setSaveStatus("error");
        alert("Impossible de préparer les chapitres restants. Réessayez.");
        return;
      }
      setChapters(persisted);
      setActiveChapterIndex(0);
      setSaveStatus("saved");
      workingChapters = persisted;
    }

    const targets = workingChapters
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => isRealChapterEmpty(c));
    if (targets.length === 0) { alert("Tous les chapitres sont déjà rédigés."); return; }

    const model = projectModel;
    batchStopRef.current = false;
    setBatchProgress(null);
    setIsBatchGenerating(true);
    batchStartBalanceRef.current = userLoading ? null : walletBalance;
    setBatchCoinPlan(
      estimatePagesCoins(
        Math.max(1, Math.round((targets.length * SIZE_PRESETS[projectSizeKey].wordsPerChapter) / WORDS_PER_PAGE)),
        model
      )
    );
    setBatchLabel("Reprise de la rédaction…");
    try {
      const sommaire =
        workingChapters.find((c) => /sommaire|table des mati/i.test(c.title || "")) || null;
      let outline = "";
      let planList: { title: string; brief: string }[] = [];
      if (sommaire) {
        const only = (sommaire.content.split(/<hr[^>]*data-page-break[^>]*>/i)[0] || sommaire.content).trim();
        planList = parseSommaireChapters(only);
        outline = only.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 12000);
      }

      const total = targets.length;
      // Titres canoniques recalculés sur la structure COMPLÈTE du livre (pas
      // seulement les chapitres restants) : sans ça, une reprise à mi-parcours
      // renumérotait les chapitres restants à partir de 1.
      const bodyChapters = workingChapters.filter((c) => !/sommaire|table des mati/i.test(c.title || ""));
      const resumeLabels = assignChapterLabels(
        bodyChapters.map((c) => ({ title: c.title || "" })),
        chapterNounFor(bookWorkType, detectGenre(projectData?.category, projectData?.tone))
      );
      const headingById = new Map(bodyChapters.map((c, k) => [c.id, resumeLabels[k]?.heading || c.title]));

      const plan = targets.map(({ c: chap }) => ({
        chapterId: chap.id,
        number: chap.number,
        title: chap.title,
        brief: planList.find((p) => p.title.trim() === (chap.title || "").trim())?.brief || "",
        heading: headingById.get(chap.id) || chap.title,
      }));

      const startResp = await fetch("/api/generate-book/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pId,
          chapters: plan,
          settings: {
            title: bookTitle,
            synopsis: projectData?.synopsis || "",
            tone: projectData?.tone || "professionnel",
            category: projectData?.category || undefined,
            audience: (projectData as any)?.audience || undefined,
            characters: (projectData as any)?.characters || undefined,
            instructions: projectData?.instructions || undefined,
            bookOutline: outline,
            model,
            useWebSearch,
            workType: bookWorkType,
            // Visuels du projet (blueprint Storybook) : le job les répartit
            // ensuite entre les chapitres.
            imageUrls: await loadProjectImageUrls(pId),
          },
        }),
      });

      if (startResp.status === 402) {
        alert("Pièces insuffisantes pour continuer. Rechargez votre solde puis cliquez à nouveau sur « Continuer la rédaction ».");
        return;
      }
      if (!startResp.ok) {
        alert("Impossible de reprendre la génération. Réessayez.");
        return;
      }
      const { jobId } = await startResp.json();
      setBatchProgress({ current: 0, total });

      const outcome = await followBookJob(jobId);

      setActiveChapterIndex(0);
      if (outcome === "completed") await finalizeGeneratedBook(pId);
    } catch (error) {
      console.error("Erreur lors de la reprise de la rédaction:", error);
      alert("Une erreur est survenue pendant la reprise. Les chapitres déjà rédigés sont enregistrés.");
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
      setBatchCoinPlan(null);
      batchStartBalanceRef.current = null;
      batchStopRef.current = false;
      void refreshWalletRef.current?.();
    }
  };

  // Régénère un seul chapitre (bouton dans l'en-tête). Reprend l'aperçu du
  // sommaire et le contexte des chapitres précédents pour rester cohérent.
  // Traduit une intention rapide du popup en consigne de base, puis y ajoute
  // les précisions libres de l'auteur.
  const buildChapterInstruction = (opts: ChapterGenerateOptions): string => {
    const base: Record<string, string> = {
      rewrite: "Réécris entièrement ce chapitre en repartant de zéro, tout en respectant son titre et son sujet.",
      enrich:
        "Enrichis et développe ce chapitre : ajoute des détails, des exemples concrets, des données chiffrées et des explications, sans supprimer les idées déjà présentes.",
      fix: "Corrige et améliore ce chapitre (orthographe, grammaire, style, clarté, fluidité) sans en changer le fond ni la structure.",
      shorten: "Raccourcis ce chapitre en ne gardant que l'essentiel, de façon plus concise et percutante.",
      custom: "",
    };
    return [base[opts.intent] || "", opts.instructions].filter(Boolean).join("\n\n").trim();
  };

  // Génère ou modifie UNIQUEMENT le chapitre courant selon les choix du popup.
  // - contenu existant + intention ≠ « réécrire »  → /api/rewrite-chapter (on part du texte actuel)
  // - chapitre vide OU « réécrire entièrement »     → /api/generate-chapter (on repart du brief du sommaire)
  const runChapterGeneration = async (index: number, opts: ChapterGenerateOptions) => {
    const chap = chapters[index];
    if (!chap) return;
    setIsChapterModalOpen(false);

    const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
    const instruction = buildChapterInstruction(opts);
    const plain = (chap.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const hasContent = plain.length > 40;
    const modify = hasContent && opts.intent !== "rewrite";

    setActiveChapterIndex(index);
    setIsGeneratingChapter(true);
    try {
      let resp: Response;
      if (modify) {
        // Modifier le contenu existant (rewrite conserve les titres/structure).
        resp = await fetch("/api/rewrite-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: chap.content,
            instructions: instruction || "Améliore ce chapitre pour le rendre plus clair et professionnel.",
            projectContext: {
              id: pId,
              title: bookTitle,
              audience: projectData?.audience || "",
              tone: projectData?.tone || "professionnel",
            },
            model: opts.model,
            useWebSearch,
          }),
        });
      } else {
        // (Re)générer depuis le brief du sommaire, en injectant les consignes de l'auteur.
        let brief = "";
        let outline = "";
        const sommaire = findSommaireChapter();
        if (sommaire) {
          const only = (sommaire.content.split(/<hr[^>]*data-page-break[^>]*>/i)[0] || sommaire.content).trim();
          const list = parseSommaireChapters(only);
          brief = list.find((c) => c.title.trim() === (chap.title || "").trim())?.brief || "";
          outline = only.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 12000);
        }
        const previousChaptersSummary = chapters
          .slice(0, index)
          .filter((c) => !/sommaire|table des mati/i.test(c.title || ""))
          .map((c, k) => `Chapitre ${k + 1} (${c.title})`)
          .join("\n");

        resp = await fetch("/api/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bookTitle,
            synopsis: projectData?.synopsis || "",
            tone: projectData?.tone || "professionnel",
            category: projectData?.category || undefined,
            characters: (projectData as any)?.characters || undefined,
            chapterTitle: chap.title,
            chapterNumber: chap.number,
            previousChaptersSummary,
            bookOutline: outline,
            chapterBrief: brief,
            instructions: instruction,
            model: opts.model,
            projectId: pId,
            useWebSearch,
            workType: bookWorkType,
            blueprintId: (projectData as any)?.blueprint_id || undefined,
            imageUrls: pId ? await loadProjectImageUrls(pId) : [],
            // Plan complet + position réelle : le chapitre régénéré seul doit
            // connaître le reste du livre, sans quoi il redit ce qui a déjà
            // été écrit ailleurs.
            allHeadings: chapters
              .filter((c) => !/sommaire|table des mati/i.test(c.title || ""))
              .map((c) => c.title),
            chapterIndex: chapters
              .filter((c) => !/sommaire|table des mati/i.test(c.title || ""))
              .findIndex((c) => c.id === chap.id),
            // Titre canonique du chapitre : calculé sur sa position réelle dans
            // le corps du livre, pour que régénérer un chapitre seul ne le
            // renumérote pas différemment du reste.
            chapterHeading: (() => {
              const body = chapters.filter((c) => !/sommaire|table des mati/i.test(c.title || ""));
              const pos = body.findIndex((c) => c.id === chap.id);
              const labels = assignChapterLabels(
                body.map((c) => ({ title: c.title || "" })),
                chapterNounFor(bookWorkType, detectGenre(projectData?.category, projectData?.tone))
              );
              return (pos >= 0 ? labels[pos]?.heading : undefined) || chap.title;
            })(),
          }),
        });
      }

      if (!resp.ok) {
        alert(resp.status === 402 ? "Pièces insuffisantes pour ce chapitre." : "Erreur lors de la génération du chapitre.");
        return;
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let txt = "";
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            txt += decoder.decode(value, { stream: true });
            setChapters((prev) => {
              const u = [...prev];
              if (u[index]) u[index] = { ...u[index], content: txt, status: "En cours" };
              return u;
            });
          }
        }
      }

      if (pId && typeof chap.id === "string" && txt.trim()) {
        try {
          await fetch(`/api/projects/${pId}/chapters/${chap.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: chap.title, content: txt, status: "Terminé" }),
          });
          
          if (typeof window !== "undefined" && (window as any).fbq) {
            (window as any).fbq("trackCustom", "ChapterWritten", {
              projectId: pId,
              chapterId: chap.id
            });
          }
        } catch {
          /* échec de sauvegarde silencieux */
        }
      }
    } catch (error) {
      console.error("Erreur lors de la génération du chapitre:", error);
      alert("Une erreur est survenue lors de la génération du chapitre.");
    } finally {
      setIsGeneratingChapter(false);
      void refreshWalletRef.current?.();
    }
  };

  // Handle File Selection for Manuscript Import
  const handleFileSelectedForImport = (file: File) => {
    setImportFile(file);
    setIsImportModalOpen(true);
  };

  // Remplace intégralement les chapitres d'un projet côté serveur : supprime les
  // chapitres réellement persistés (id string = UUID Supabase) puis crée les nouveaux
  // en une seule requête bulk. Retourne les chapitres avec leurs vrais UUID (jamais
  // des ids client Date.now() qui disparaîtraient au rechargement).
  const replaceChaptersOnServer = async (
    pId: string,
    existingChapters: Chapter[],
    draftChapters: { number: number; title: string; content: string; status: string }[]
  ): Promise<Chapter[] | null> => {
    try {
      const idsToDelete = existingChapters
        .map((c) => c.id)
        .filter((id): id is string => typeof id === "string");

      await Promise.all(
        idsToDelete.map((chapterId) =>
          fetch(`/api/projects/${pId}/chapters/${chapterId}`, { method: "DELETE" })
        )
      );

      const res = await fetch(`/api/projects/${pId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: draftChapters })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erreur lors de la création des chapitres:", errorText);
        alert(`Erreur serveur: ${errorText}`);
        return null;
      }

      const data = await res.json();
      return (data.chapters || [])
        .sort((a: any, b: any) => a.number - b.number)
        .map((c: any) => ({
          id: c.id,
          number: c.number,
          title: c.title,
          content: c.content,
          status: c.status
        }));
    } catch (err) {
      console.error("Erreur lors du remplacement des chapitres:", err);
      return null;
    }
  };

  // Split current document by internal headings (Parties / Chapitres)
  const handleSplitCurrentDocument = async () => {
    const currentContent = chapters[activeChapterIndex]?.content || "";
    if (!currentContent || !currentContent.trim()) {
      alert("Le document actuel est vide.");
      return;
    }

    const split = splitHtmlIntoChapters(currentContent, chapters[activeChapterIndex]?.title || "Chapitre 1");
    if (split.length <= 1) {
      alert("Aucun grand titre (ex: Première Partie, Deuxième Partie, Chapitre 2) n'a été détecté pour scinder ce document.");
      return;
    }

    if (confirm(`Nous avons trouvé ${split.length} parties/chapitres dans ce document (ex: ${split.map(s => s.title).slice(0, 3).join(', ')}...). Voulez-vous le diviser en ${split.length} chapitres distincts dans le sommaire ?`)) {
      const draftChapters = split.map((sp, idx) => ({
        number: idx + 1,
        title: sp.title || `Chapitre ${idx + 1}`,
        content: sp.content || "",
        status: "Brouillon"
      }));

      const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
      if (!pId) {
        alert("Impossible de scinder : aucun projet actif détecté.");
        return;
      }

      setSaveStatus("saving");
      const persisted = await replaceChaptersOnServer(pId, chapters, draftChapters);

      if (persisted) {
        setChapters(persisted);
        setActiveChapterIndex(0);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        alert("La scission a échoué côté serveur. Vos chapitres n'ont pas été modifiés.");
      }
    }
  };

  // Handle navigation to modified chapter and scroll editor into view
  const handleGoToChapter = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < chapters.length) {
      setActiveChapterIndex(targetIndex);
    }

    const container = document.querySelector('.ProseMirror') || document.querySelector('main');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      editorRef.current?.getEditor()?.commands.focus();
    }, 100);
  };

  // Handle undoing a chapter modification
  const handleUndoModification = (msgId: number, mod: ChapterModificationPayload) => {
    if (mod.previousContent === undefined) {
      alert("Impossible d'annuler cette modification.");
      return;
    }

    const targetIndex = mod.chapterIndex;
    const oldContent = mod.previousContent;

    if (targetIndex >= 0 && targetIndex < chapters.length) {
      setActiveChapterIndex(targetIndex);
    }

    setChapters(prev => {
      const updated = [...prev];
      if (targetIndex >= 0 && targetIndex < updated.length) {
        updated[targetIndex] = {
          ...updated[targetIndex],
          content: oldContent
        };
      }
      return updated;
    });
    setSaveStatus("saving");

    setTimeout(() => {
      editorRef.current?.replaceContent(oldContent);
    }, 50);

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.chapterModification) {
        return {
          ...m,
          chapterModification: {
            ...m.chapterModification,
            isUndone: true
          }
        };
      }
      return m;
    }));
  };

  // Handle Confirmed Manuscript Import
  const handleConfirmImport = async (splitByChapter: boolean) => {
    if (!importFile) return;

    setIsImportLoading(true);
    try {
      const { parseManuscriptFile } = await loadParser();
      const parsedChapters = await parseManuscriptFile(importFile, { splitByChapter });

      if (!parsedChapters || parsedChapters.length === 0) {
        alert("Aucun contenu n'a pu être extrait du fichier.");
        return;
      }

      if (!splitByChapter) {
        // Option 2: Single block into current active chapter
        const combinedHtml = parsedChapters[0].content;
        const updated = [...chapters];
        updated[activeChapterIndex] = {
          ...updated[activeChapterIndex],
          content: combinedHtml,
          status: "En cours"
        };
        setChapters(updated);
        setSaveStatus("saving");
      } else {
        // Option 1: Split into chapters
        const draftChapters = parsedChapters.map((pc, idx) => ({
          number: idx + 1,
          title: pc.title || `Chapitre ${idx + 1}`,
          content: pc.content || "",
          status: "Brouillon"
        }));

        const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
        if (!pId) {
          alert("Impossible d'importer : aucun projet actif détecté.");
          return;
        }

        setSaveStatus("saving");
        const persisted = await replaceChaptersOnServer(pId, chapters, draftChapters);

        if (persisted) {
          setChapters(persisted);
          setActiveChapterIndex(0);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
          alert("L'import a échoué côté serveur. Vos chapitres n'ont pas été modifiés.");
          return;
        }
      }

      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error: any) {
      console.error("Erreur lors de l'importation du manuscrit:", error);
      alert(error?.message || "Erreur lors de l'importation du fichier.");
    } finally {
      setIsImportLoading(false);
    }
  };

  // Suppression de handleStartNewProject pour forcer l'usage du wizard /projects/new

  // ---------------------------------------------------------------------
  // BARRE D'ACTIONS DU LIVRE & EN-TÊTE DU CANEVAS
  // ---------------------------------------------------------------------
  const isOutlineView = isOutlineTitle(currentChapter?.title);
  // Livre découpé et on regarde UN chapitre : le bouton principal ne touche
  // plus qu'à ce chapitre.
  const isSplitChapterView = chapters.length > 1 && !isOutlineView;
  const firstBodyIndex = chapters.findIndex((c) => !isOutlineTitle(c.title));
  const showCoverSlot = !isOutlineView && (chapters.length === 1 || activeChapterIndex === firstBodyIndex);
  const currentChapterEmpty = plainLength(currentChapter?.content) < 40;
  const coverUrl: string | null = projectData?.cover_url || null;
  const coverStudioHref = currentProjectId
    ? `/cover-studio/${currentProjectId}?returnTo=${encodeURIComponent(`/redaction?projectId=${currentProjectId}`)}`
    : "/cover-studio";
  const isAnyGeneration = isGeneratingChapter || isRewriting || isInitialGenerating || isBatchGenerating;
  const coinsUsedLive =
    isBatchGenerating && batchStartBalanceRef.current !== null && !userLoading
      ? Math.max(0, batchStartBalanceRef.current - walletBalance)
      : null;
  const manuscriptInputRef = useRef<HTMLInputElement>(null);

  // Enregistre immédiatement le chapitre affiché (sans attendre l'autosave)
  // avant de quitter l'éditeur, par exemple pour le studio de couverture.
  const saveCurrentChapterNow = async () => {
    const chap = chapters[activeChapterIndex];
    if (!currentProjectId || !chap || typeof chap.id !== "string" || saveStatus === "saved") return;
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/chapters/${chap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chap.title, content: chap.content, status: chap.status }),
      });
      if (res.ok) {
        locallyEditedIdsRef.current.delete(chap.id);
        setSaveStatus("saved");
      }
    } catch {
      /* l'autosave reprendra au retour */
    }
  };

  const goToCoverStudio = async () => {
    await saveCurrentChapterNow();
    router.push(coverStudioHref);
  };

  const openExport = () => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("trackCustom", "BookCompleted", { projectId: currentProjectId });
    }
    setIsExportModalOpen(true);
  };

  const actionBtn =
    "shrink-0 whitespace-nowrap flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const primaryAction = isSplitChapterView ? (
    <button
      onClick={() => setIsChapterModalOpen(true)}
      disabled={isAnyGeneration}
      className={`${actionBtn} bg-[#C84B31] hover:bg-[#B83E26] text-white shadow-sm`}
      title="Rédiger ou modifier uniquement ce chapitre avec l'IA — le reste du livre n'est pas touché"
    >
      <span className="material-symbols-outlined text-base">auto_fix_high</span>
      <span>{currentChapterEmpty ? "Rédiger ce chapitre" : "Régénérer le chapitre"}</span>
    </button>
  ) : (
    <button
      onClick={handleGenerateWholeBook}
      disabled={isAnyGeneration}
      className={`${actionBtn} bg-[#C84B31] hover:bg-[#B83E26] text-white shadow-sm`}
      title={`Rédiger tout le livre avec ${modelLabel(projectModel)} (${SIZE_PRESETS[projectSizeKey].pages}), réglages choisis à la création`}
    >
      <span className="material-symbols-outlined text-base">auto_stories</span>
      <span>{bookHasWrittenBody ? "Régénérer le livre" : "Générer le livre"}</span>
      <span className="font-semibold text-white/85 tabular-nums">· ≈ {fmtCoins(bookCostEstimate)} pièces</span>
    </button>
  );

  const bookActionBar = (
    <div className="shrink-0 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 px-2 sm:px-6 py-2 flex flex-wrap items-center gap-2 z-40">
      {primaryAction}

      {hasUnwrittenChapters && !isBatchGenerating && (
        <button
          onClick={continueBookGeneration}
          className={`${actionBtn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`}
          title={`Reprendre la rédaction : seuls les ${remainingChaptersCount} chapitre(s) non rédigé(s) seront écrits et facturés.`}
        >
          <span className="material-symbols-outlined text-base">play_arrow</span>
          <span>Continuer la rédaction{remainingChaptersCount > 0 ? ` (${remainingChaptersCount})` : ""}</span>
        </button>
      )}

      {isBatchGenerating && (
        <span className="shrink-0 whitespace-nowrap flex items-center gap-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 bg-orange-50 border border-orange-200 rounded-xl px-2.5 py-1.5 tabular-nums" aria-live="polite">
          <Coins className="w-3.5 h-3.5 text-secondary" />
          {batchProgress ? `Chapitre ${Math.min(batchProgress.current + 1, batchProgress.total)}/${batchProgress.total} · ` : ""}
          {coinsUsedLive !== null ? `${fmtCoins(coinsUsedLive)} pièces utilisées` : "Rédaction en cours"}
          {batchCoinPlan ? ` / ≈ ${fmtCoins(batchCoinPlan)}` : ""}
        </span>
      )}

      <div className="hidden sm:block w-px h-6 bg-neutral-200 dark:bg-neutral-700 shrink-0 mx-0.5" />

      <button
        onClick={() => manuscriptInputRef.current?.click()}
        disabled={isAnyGeneration}
        className={`${actionBtn} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 text-neutral-800 dark:text-neutral-200`}
        title="Importer un manuscrit (.docx, .epub)"
      >
        <span className="material-symbols-outlined text-base">file_upload</span>
        <span>Importer</span>
      </button>
      <button
        onClick={goToCoverStudio}
        className={`${actionBtn} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 text-neutral-800 dark:text-neutral-200`}
        title="Créer ou modifier la couverture dans le studio, puis revenir ici"
      >
        <span className="material-symbols-outlined text-base">palette</span>
        <span>Couverture</span>
      </button>
      <button
        onClick={openExport}
        className={`${actionBtn} bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900`}
        title="Télécharger le livre (PDF, EPUB, DOCX…)"
      >
        <span className="material-symbols-outlined text-base">download</span>
        <span>Exporter</span>
      </button>

      <span className="hidden 2xl:inline shrink-0 whitespace-nowrap text-[11px] text-neutral-400 ml-auto">
        {modelLabel(projectModel)} · {SIZE_PRESETS[projectSizeKey].pages}
      </span>

      <input
        ref={manuscriptInputRef}
        type="file"
        accept=".docx,.epub,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelectedForImport(file);
          e.target.value = "";
        }}
      />
    </div>
  );

  const canvasHeader = isOutlineView ? (
    <div className="rounded-2xl border-2 border-dashed border-[#F4C5BC] bg-white dark:bg-neutral-900 p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="material-symbols-outlined text-2xl text-secondary shrink-0">list_alt</span>
        <div className="min-w-0">
          <p className="font-heading font-extrabold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
            Ceci est le sommaire de votre livre — pas encore le livre
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug mt-1">
            C&apos;est le plan qu&apos;Iris va suivre. Relisez-le et modifiez les titres si besoin, puis lancez la
            rédaction : chaque chapitre sera écrit et votre livre complet s&apos;affichera ici, d&apos;un seul tenant.
          </p>
        </div>
      </div>
      {!isInitialGenerating && (
        <button
          onClick={handleGenerateWholeBook}
          disabled={isAnyGeneration}
          className={`${actionBtn} justify-center bg-[#C84B31] hover:bg-[#B83E26] text-white shadow-sm self-stretch sm:self-auto`}
        >
          <span className="material-symbols-outlined text-base">auto_stories</span>
          <span>Générer le livre · ≈ {fmtCoins(bookCostEstimate)} pièces</span>
        </button>
      )}
    </div>
  ) : showCoverSlot ? (
    coverUrl ? (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="Couverture du livre" className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shadow-md shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Couverture du livre</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Elle sera placée en première page à l&apos;export.</p>
        </div>
        <button onClick={goToCoverStudio} className={`${actionBtn} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 text-neutral-800 dark:text-neutral-200`}>
          <span className="material-symbols-outlined text-base">palette</span>
          <span>Modifier la couverture</span>
        </button>
      </div>
    ) : (
      <div className="rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/70 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-16 sm:w-20 aspect-[2/3] rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-3xl text-neutral-400">image</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Emplacement de la couverture</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug mt-1">
            La couverture n&apos;est pas générée automatiquement. Créez-la quand vous voulez dans le Studio couverture :
            une fois appliquée, vous revenez ici et elle apparaît à cet endroit.
          </p>
        </div>
        <button onClick={goToCoverStudio} className={`${actionBtn} bg-[#C84B31] hover:bg-[#B83E26] text-white shadow-sm`}>
          <span className="material-symbols-outlined text-base">palette</span>
          <span>Créer la couverture</span>
        </button>
      </div>
    )
  ) : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* 1. REUSABLE GLOBAL SIDEBAR (LEFT SIDE) */}
      <Sidebar />

      {/* MAIN STUDIO CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 2. SLEEK ESSENTIAL HEADER BAR */}
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 h-16 px-2 sm:px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar h-full pr-2">
            {/* Left: Book Title & Active Chapter Picker */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-xl transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span className="hidden sm:inline">Mes Livres</span>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {/* Editable Book Title Input */}
              <div className="flex items-center gap-1.5 bg-neutral-100/80 hover:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus-within:border-secondary focus-within:bg-white dark:bg-neutral-900 rounded-xl px-3 py-1 transition-all">
                <span className="material-symbols-outlined text-sm text-neutral-400">edit</span>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="font-heading font-extrabold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 bg-transparent border-none outline-none focus:ring-0 w-40 sm:w-56 truncate"
                  placeholder="Titre du livre..."
                  title="Cliquer pour modifier le titre du livre"
                />
              </div>

              <select
                value={activeChapterIndex}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  if (val === -1) {
                    // Fusionner le livre
                    if (confirm("Rassembler tous les chapitres en un seul livre ? (Le sommaire, qui n'est que le plan, est retiré du livre.)")) {
                      const mergedChapter = {
                        number: 1,
                        title: MERGED_BOOK_TITLE,
                        content: mergeChaptersHtml(chapters, { skipOutline: chapters.some((c) => !isOutlineTitle(c.title)) }),
                        status: "En cours"
                      };
                      const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
                      if (pId) {
                        setSaveStatus("saving");
                        const persisted = await replaceChaptersOnServer(pId, chapters, [mergedChapter]);
                        if (persisted) {
                          setChapters(persisted);
                          setActiveChapterIndex(0);
                          setSaveStatus("saved");
                        } else {
                          setSaveStatus("error");
                          alert("La fusion a échoué côté serveur.");
                        }
                      }
                    }
                  } else if (val === -2) {
                    // Découper en chapitres
                    handleSplitCurrentDocument();
                  } else {
                    setActiveChapterIndex(val);
                  }
                }}
                className="bg-orange-50 border border-orange-200 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[200px] truncate"
              >
                {chapters.length > 1 && <option value="-1">Tout le livre (Rassembler)</option>}
                {chapters.length === 1 && !isOutlineTitle(chapters[0]?.title) && <option value="-2">Découper en chapitres</option>}
                {chapters.map((chap, idx) => (
                  <option key={chap.id} value={idx}>
                    {chap.title}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {/* Right Essential Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Stats */}
            <div className="hidden lg:flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 px-3.5 py-1.5 rounded-xl border border-neutral-200/70 text-xs">
              <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{wordCount} MOTS</span>
              <div className="w-[1px] h-3.5 bg-neutral-300"></div>
              {saveStatus === "saving" && (
                <span className="text-orange-500 font-bold flex items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span> Enregistrement...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">cloud_done</span> Enregistré
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">cloud_off</span> Erreur
                </span>
              )}
            </div>

            <Link
              href="/projects/new"
              className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 text-neutral-800 dark:text-neutral-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              title="Démarrer un nouveau projet complet"
            >
              <span className="material-symbols-outlined text-base text-secondary">add_circle</span>
              <span className="hidden sm:inline">Nouveau Projet</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link 
                href="/pricing" 
                className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:border-neutral-300 group" 
                title="Gérer mes crédits d'écriture"
              >
                <Coins className="w-3.5 h-3.5 text-secondary transition-transform group-hover:scale-110" />
                <span className="tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
                  {walletBalance !== null ? Number(walletBalance).toLocaleString("fr-FR") : "..."}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">pièces</span>
                {coinFlash !== null && (
                  <span className="text-[11px] font-bold text-red-600 tabular-nums animate-pulse" aria-live="polite">
                    −{fmtCoins(coinFlash)}
                  </span>
                )}
              </Link>
              
            </div>
          </div>
        </div>

        {/* Profile Menu Toggle - Now Outside the scroll container */}
        <div className="relative shrink-0 pl-2 sm:pl-4 border-l border-neutral-100 dark:border-neutral-800 ml-2">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8.5 h-8.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 border border-neutral-200/90 flex items-center justify-center text-neutral-800 dark:text-neutral-200 font-bold text-xs shadow-2xs cursor-pointer transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="font-heading font-bold text-sm text-neutral-900 dark:text-neutral-100">{displayName || "Utilisateur"}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{displayEmail || ""}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="material-symbols-outlined text-base text-neutral-400">person</span>
                      <span>Mon Profil</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </header>

        {/* MOBILE VIEW SEGMENTED CONTROL (visible on mobile / small screens / small laptops) */}
        <div className="xl:hidden flex items-center justify-center p-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 gap-2 shrink-0 z-30">
          <button
            onClick={() => setMobileView("editor")}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              mobileView === "editor"
                ? "bg-[#C84B31] text-white shadow-2xs"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100"
            }`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">description</span>
            <span>Éditeur Manuscrit</span>
          </button>

          <button
            onClick={() => setMobileView("chat")}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 relative ${
              mobileView === "chat"
                ? "bg-secondary text-white shadow-2xs"
                : "bg-orange-50 text-secondary hover:bg-orange-100"
            }`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">auto_awesome</span>
            <span>Assistant Iris IA</span>
            {isAiThinking && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1"></span>}
          </button>
        </div>

        {/* 3. SPLIT WORKSPACE (TEXT EDITOR IN MIDDLE, CHAT ON RIGHT) */}
        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative pb-20 md:pb-0">
          {/* ================= 3A. RICH MANUSCRIPT EDITOR (MIDDLE / MAIN AREA) ================= */}
          <div className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
            mobileView === "editor" ? "flex" : "hidden xl:flex"
          }`}>
            {bookActionBar}
            <RichManuscriptEditor
              ref={editorRef}
              canvasHeader={canvasHeader}
              documentVariant={isOutlineView ? "outline" : "book"}
              category={projectData?.category}
              initialContent={currentChapter.content}
              chapterTitle={currentChapter.title}
              onTitleChange={(newTitle) => {
                const updated = [...chapters];
                updated[activeChapterIndex].title = newTitle;
                locallyEditedIdsRef.current.add(updated[activeChapterIndex].id);
                setChapters(updated);
                setSaveStatus("saving");
              }}
              onContentChange={(newHtml) => {
                const updated = [...chapters];
                updated[activeChapterIndex].content = newHtml;
                locallyEditedIdsRef.current.add(updated[activeChapterIndex].id);
                setChapters(updated);
                setSaveStatus("saving");
              }}
              onWordCountChange={(count) => setLiveWordCount(count)}
              onContinueWithAi={() => {
                setMobileView("chat");
                handleSendMessage("Rédiger la suite de ce chapitre avec l'IA");
              }}
              onGenerateFullChapter={handleGenerateFullChapter}
              onContextualAiAction={handleContextualAiAction}
              onSendSelectionToChat={handleSendSelectionToChat}
              isGenerating={isGeneratingChapter || isRewriting || isInitialGenerating || isBatchGenerating}
              generationLabel={
                isBatchGenerating
                  ? coinsUsedLive !== null
                    ? `${batchLabel} · ${fmtCoins(coinsUsedLive)} pièces utilisées`
                    : batchLabel
                  : isRewriting
                  ? "Iris réécrit votre livre"
                  : isInitialGenerating
                  ? "Iris rédige votre livre"
                  : "Iris écrit ce chapitre"
              }
              generationProgress={isBatchGenerating ? batchProgress : null}
              onStopGeneration={
                isBatchGenerating
                  ? () => {
                      batchStopRef.current = true;
                      setBatchLabel("Arrêt en cours… (fin du chapitre courant)");
                    }
                  : undefined
              }
              onFileSelected={handleFileSelectedForImport}
            />
          </div>

          {/* ================= 3B. DRAGGABLE RESIZER HANDLE (DESKTOP ONLY) ================= */}
          {!isChatCollapsed && (
            <div
              onMouseDown={() => setIsResizing(true)}
              className={`hidden xl:flex w-1.5 hover:w-2 bg-neutral-200/70 hover:bg-secondary cursor-col-resize transition-all shrink-0 z-20 items-center justify-center group ${
                isResizing ? "bg-secondary w-2" : ""
              }`}
              title="Faites glisser pour ajuster la largeur du chat IA"
            >
              <div className="w-1 h-8 rounded-full bg-neutral-400 group-hover:bg-white dark:bg-neutral-900 transition-colors"></div>
            </div>
          )}

          {/* ================= 3C. AI CHAT ASSISTANT PANEL (RIGHT SIDE, RESIZABLE) ================= */}
          {!isChatCollapsed && (
            <aside
              className={`h-full bg-white dark:bg-neutral-900 border-l border-neutral-200/80 dark:border-neutral-800 flex-col shrink-0 relative shadow-lg z-10 w-full xl:w-[var(--chat-width)] ${
                mobileView === "chat" ? "flex" : "hidden xl:flex"
              }`}
              style={{ '--chat-width': `${chatWidth}px` } as React.CSSProperties}
            >
              {/* Chat Header */}
              <div className="p-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="font-heading font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    Iris IA
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedAiModel}
                    onChange={(e) => setSelectedAiModel(e.target.value)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer hover:border-secondary transition-all"
                    title="Choisir le modèle d'IA"
                  >
                    <option value="gemini-3.6-flash">Gemini 2.5 Flash</option>
                    <option value="gpt-4o">ChatGPT (GPT-4o)</option>
                    <option value="claude-sonnet-5">Claude Sonnet</option>
                  </select>

                  <button
                    onClick={() => {
                      const newVal = !useWebSearch;
                      setUseWebSearch(newVal);
                      if (currentProjectId) {
                        localStorage.setItem(`iris_web_search_${currentProjectId}`, String(newVal));
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      useWebSearch
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:bg-neutral-800"
                    }`}
                    title={useWebSearch ? "Recherche web activée : l'IA utilise des données réelles et récentes" : "Recherche web désactivée : l'IA utilise uniquement ses connaissances internes"}
                  >
                    <span className="material-symbols-outlined text-sm">{useWebSearch ? "travel_explore" : "explore_off"}</span>
                    <span className="hidden xl:inline">{useWebSearch ? "Web" : "Web"}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Voulez-vous effacer l'historique de cette discussion pour recommencer à zéro ?")) {
                        const welcomeMsg: Message = {
                          id: Date.now(),
                          sender: "ai",
                          text: `Bonjour ! Je suis Iris IA, votre co-auteur sur "${bookTitle}". Comment puis-je vous aider ?`,
                          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        };
                        setMessages([welcomeMsg]);
                        if (currentProjectId && typeof window !== "undefined") {
                          localStorage.removeItem(`iris_chat_history_${currentProjectId}`);
                        }
                      }
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                    title="Réinitialiser et effacer la discussion"
                  >
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                  </button>

                  <button
                    onClick={() => setIsChatCollapsed(true)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 transition-colors"
                    title="Masquer le panneau de chat"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 max-w-[92%] ${
                      msg.sender === "user" ? "ml-auto items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-2xs whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-secondary text-white rounded-tr-xs chat-bubble-user font-medium"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-xs chat-bubble-text border border-neutral-200/60"
                      }`}
                    >
                      {msg.sender === "ai" ? (
                        <div className="prose prose-sm prose-neutral max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}

                      {/* Insertion Button if AI proposed manuscript text */}
                      {msg.suggestedTextToInsert && (
                        <div className="mt-3 pt-3 border-t border-neutral-200/80 dark:border-neutral-800 flex justify-end">
                          <button
                            onClick={() => handleInsertIntoManuscript(msg.suggestedTextToInsert!)}
                            className="bg-white dark:bg-neutral-900 hover:bg-orange-50 border border-secondary/40 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">add_to_photos</span>
                            <span>Insérer dans le chapitre</span>
                          </button>
                        </div>
                      )}

                      {/* Action Card for Chapter Modification */}
                      {msg.chapterModification && (
                        <div className={`mt-3 pt-3 border-t flex flex-col gap-2.5 -mx-1 -mb-1 p-3 rounded-xl border shadow-2xs ${
                          msg.chapterModification.isUndone
                            ? "bg-neutral-50/90 border-neutral-200 dark:border-neutral-800"
                            : "bg-blue-50/80 border-blue-200/90"
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`material-symbols-outlined text-base ${
                                msg.chapterModification.isUndone ? "text-neutral-500 dark:text-neutral-400" : "text-[#1b6df9]"
                              }`}>
                                {msg.chapterModification.isUndone ? "undo" : "auto_fix_high"}
                              </span>
                              <span className="text-xs font-extrabold text-neutral-900 dark:text-neutral-100 truncate">
                                {msg.chapterModification.isUndone ? "Modification annulée • " : "Chapitre modifié • "}
                                <span className="text-blue-900 font-extrabold">
                                  {msg.chapterModification.chapterTitle || `Chapitre ${msg.chapterModification.chapterIndex + 1}`}
                                </span>
                              </span>
                            </div>
                          </div>

                          {msg.chapterModification.summary && (
                            <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed font-body">
                              {msg.chapterModification.summary}
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200/50">
                            {!msg.chapterModification.isUndone && msg.chapterModification.previousContent !== undefined && (
                              <button
                                onClick={() => handleUndoModification(msg.id, msg.chapterModification!)}
                                className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Annuler cette réécriture et restaurer la version précédente"
                              >
                                <span className="material-symbols-outlined text-sm text-neutral-500 dark:text-neutral-400">undo</span>
                                <span>Annuler</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleGoToChapter(msg.chapterModification!.chapterIndex)}
                              className="bg-[#1b6df9] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>Aller au chapitre</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono font-bold tracking-wider px-1">
                      {msg.sender === "user" ? "VOUS" : "IRIS IA"} • {msg.time}
                    </span>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 p-2">
                    <span className="material-symbols-outlined text-base text-secondary animate-spin">
                      progress_activity
                    </span>
                    <span>Iris formule une réponse...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Action Prompt Chips */}
              <div className="p-3 bg-neutral-50/50 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-1.5 shrink-0">
                <button
                  onClick={() => handleSendMessage("Proposer un plan en 5 chapitres pour ce livre")}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 hover:text-neutral-900 dark:text-neutral-100 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-all shadow-2xs"
                >
                  Proposer un plan
                </button>
                <button
                  onClick={() => handleSendMessage("Développer le paragraphe actuel avec plus de détails")}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 hover:text-neutral-900 dark:text-neutral-100 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-all shadow-2xs"
                >
                  Enrichir le texte
                </button>
                <button
                  onClick={() => handleSendMessage("Proposer 3 titres accrocheurs pour ce projet")}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 hover:text-neutral-900 dark:text-neutral-100 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-all shadow-2xs"
                >
                  Idées de titres
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800 shrink-0">
                {/* Pastille du passage sélectionné (édition ciblée) */}
                {attachedSelection && (
                  <div className="mb-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-secondary text-base mt-0.5">content_cut</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-secondary">Passage sélectionné</p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 italic">
                        « {attachedSelection.text.slice(0, 140)}{attachedSelection.text.length > 140 ? "…" : ""} »
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedSelection(null)}
                      className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {/* Documents analysés joints au chat */}
                {(chatAttachments.length > 0 || isAnalyzingChatFile) && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {chatAttachments.map((att, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full pl-2.5 pr-1.5 py-1 text-[11px] font-bold text-blue-800 max-w-[200px]">
                        <span className="material-symbols-outlined text-sm">description</span>
                        <span className="truncate">{att.name}</span>
                        <button
                          onClick={() => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 rounded-full hover:bg-white dark:bg-neutral-900 text-blue-500 hover:text-red-500 transition-colors shrink-0"
                          title="Retirer ce document"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                    {isAnalyzingChatFile && (
                      <span className="inline-flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-full px-2.5 py-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Analyse du document…
                      </span>
                    )}
                  </div>
                )}
                {chatAnalyzeError && (
                  <p className="mb-2 text-[11px] text-red-600 font-medium">{chatAnalyzeError}</p>
                )}

                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.epub,.txt,.md,.markdown"
                  className="hidden"
                  onChange={(e) => { handleChatFile(e.target.files?.[0] || null); e.target.value = ""; }}
                />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className={`relative flex items-center bg-neutral-50 dark:bg-neutral-800/50 border rounded-2xl px-2 py-2 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all ${attachedSelection ? "border-secondary/60" : "border-neutral-200 dark:border-neutral-800"}`}
                >
                  {/* Bouton + : joindre un document à analyser */}
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isAnalyzingChatFile}
                    title="Joindre un document à analyser (20 pièces)"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-secondary hover:bg-white dark:bg-neutral-900 transition-colors shrink-0 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isListening
                        ? "Écoute en cours, dictez votre message…"
                        : attachedSelection
                        ? "Ex: rends ce passage plus percutant..."
                        : "Discutez, dictez ou demandez à l'assistant..."
                    }
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 py-1 px-1"
                  />

                  {/* Micro : dicter ce qu'on veut modifier */}
                  {micSupported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      title={isListening ? "Arrêter la dictée" : "Dicter à la voix"}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-secondary hover:bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{isListening ? "stop" : "mic"}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="bg-secondary text-white p-2 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all ml-1 shadow-2xs shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </form>

                {/* Retour de dictée. Sans cela, un micro refusé ou une coupure
                    du moteur ne produisait aucun signal : le bouton cessait
                    simplement de clignoter. */}
                {isListening && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic px-2 pt-1.5" aria-live="polite">
                    {micInterim ? `« ${micInterim} »` : "Parlez, j'écoute…"}
                  </p>
                )}
                {micError && (
                  <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mt-1.5">
                    {micError}
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Manuscript Import Choice Modal */}
      <ImportManuscriptModal
        isOpen={isImportModalOpen}
        file={importFile}
        onClose={() => {
          if (!isImportLoading) {
            setIsImportModalOpen(false);
            setImportFile(null);
          }
        }}
        onConfirm={handleConfirmImport}
        isLoading={isImportLoading}
      />

      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={{
          id: currentProjectId || undefined,
          title: bookTitle,
          subtitle: projectData?.subtitle || undefined,
          // La catégorie choisit la palette typographique et la forme décide de
          // la mise en page : sans elles, l'export depuis l'éditeur retombait
          // sur la composition générique, quelle que soit la nature du livre.
          category: projectData?.category || undefined,
          work_type: bookWorkType,
          cover_url: (projectData as any)?.cover_url || undefined,
          chapters: chapters
        }}
        hasUnsavedChanges={saveStatus !== "saved"}
      />

      {/* GEO SCORE MODAL */}
      <GeoScoreModal
        isOpen={isGeoScoreModalOpen}
        onClose={() => setIsGeoScoreModalOpen(false)}
        bookTitle={bookTitle}
        bookContent={chapters.map(c => c.content).join("\n\n")}
      />

      <ChapterGenerateModal
        key={`chapmodal-${activeChapterIndex}-${isChapterModalOpen}`}
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        onConfirm={(opts) => runChapterGeneration(activeChapterIndex, opts)}
        chapterTitle={currentChapter?.title || "Ce chapitre"}
        hasContent={((currentChapter?.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length) > 40}
        defaultModel={projectModel}
      />
    </div>
  );
}

export default function RedactionPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium animate-pulse">Chargement de votre studio...</p>
        </div>
      </div>
    }>
      <RedactionContent />
    </Suspense>
  );
}
