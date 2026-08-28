"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import type { RichManuscriptEditorHandle } from "@/components/RichManuscriptEditor";
import type { ChapterGenerateOptions } from "@/components/ChapterGenerateModal";

// Lazy-load heavy components to reduce initial bundle size by ~1.5MB
const RichManuscriptEditor = dynamic(
  () => import("@/components/RichManuscriptEditor"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div> }
);
const ImportManuscriptModal = dynamic(() => import("@/components/ImportManuscriptModal"), { ssr: false });
const ExportBookModal = dynamic(() => import("@/components/ExportBookModal"), { ssr: false });
const GeoScoreModal = dynamic(() => import("@/components/GeoScoreModal"), { ssr: false });

const GenerateBookModal = dynamic(() => import("@/components/GenerateBookModal"), { ssr: false });
const ChapterGenerateModal = dynamic(() => import("@/components/ChapterGenerateModal"), { ssr: false });

// Lazy-load parsers only when needed (mammoth ~600KB, jszip ~140KB)
const loadParser = () => import("@/lib/parser");
import { splitHtmlIntoChapters } from "@/lib/parser/splitChapters";
import { SIZE_PRESETS } from "@/lib/book/generationPresets";
import type { BookSizeKey } from "@/lib/book/generationPresets";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import ReactMarkdown from "react-markdown";

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

function RedactionContent() {
  const searchParams = useSearchParams();
  const isNewProject = searchParams?.get("new") === "true";
  const urlProjectId = searchParams?.get("projectId");
  const { displayName, displayEmail, signOut, walletBalance } = useUser();
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
  const [selectedAiModel, setSelectedAiModel] = useState("gemini-2.5-flash");
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
  const { isListening, isSupported: micSupported, toggle: toggleMic } = useSpeechToText((t) =>
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
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  // Signal d'arrêt de la génération complète (respecté entre deux chapitres).
  const batchStopRef = useRef(false);
  // Job serveur de génération de livre en cours (voir /api/generate-book/*).
  const bookJobIdRef = useRef<string | null>(null);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichManuscriptEditorHandle>(null);

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
              projectId: project.id,
              model: project.model || ctx?.model || "gemini-2.5-flash",
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
            data.chapters && data.chapters.length > 0
              ? data.chapters.map((ch: any) => ({
                  id: ch.id,
                  number: ch.number,
                  title: ch.title || `Chapitre ${ch.number}`,
                  content: ch.content || "",
                  status: ch.status || "Brouillon"
                }))
              : [];

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
      text: `✂️ Sur le passage sélectionné : ${instruction}`,
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
          text: "J'ai modifié le passage sélectionné directement dans votre chapitre. ✅",
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
        text: `⚠️ Je n'ai pas pu modifier ce passage (${detail}). Veuillez réessayer.`,
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
          text: `⚠️ ${error?.message || "Désolé, je rencontre une erreur de communication. Veuillez réessayer."}`,
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
        ? outlineChapter.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000)
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

    let items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => splitTitleBrief(m[1]))
      .filter((c) => c.title.length > 1);
    if (items.length === 0) {
      items = Array.from(html.matchAll(/<(?:h2|h3)[^>]*>([\s\S]*?)<\/(?:h2|h3)>/gi))
        .map((m) => ({ title: clean(m[1]), brief: "" }))
        .filter((c) => c.title.length > 2 && !/sommaire|table des mati/i.test(c.title));
    }
    // Dédoublonnage sur le titre en conservant l'ordre
    const seen = new Set<string>();
    return items.filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true))).slice(0, 24);
  };

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

  // Ouvre le popup de configuration (longueur + modèle).
  const handleGenerateWholeBook = () => setIsBookModalOpen(true);

  // Génère automatiquement tout le livre selon les options du popup : un chapitre
  // par point (du sommaire, ou d'une structure proposée par l'IA en mode prototype),
  // rédigé séquentiellement (un appel IA par chapitre pour tenir la limite de 60 s).
  const runWholeBookGeneration = async (opts: { sizeKey: BookSizeKey; model: string }) => {
    setIsBookModalOpen(false);
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

      // (Re)crée la structure : sommaire en tête (mode sommaire) puis un chapitre par point.
      const draft: { number: number; title: string; content: string; status: string }[] = [];
      let num = 1;
      if (sommaire) {
        draft.push({ number: num++, title: sommaire.title, content: sommaireOnly, status: "En cours" });
      }
      for (const c of planChapters) {
        draft.push({ number: num++, title: c.title, content: "", status: "Brouillon" });
      }

      const created = await replaceChaptersOnServer(pId, chapters, draft);
      if (!created || created.length === 0) {
        alert("Erreur lors de la préparation des chapitres.");
        return;
      }
      setChapters(created);

      const startIdx = sommaire ? 1 : 0;
      const total = created.length - startIdx;
      const outline = sommaire
        ? sommaireOnly.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000)
        : planChapters.map((c, k) => `${k + 1}. ${c.title} — ${c.brief}`).join("\n").substring(0, 2000);

      // Démarre le job de génération CÔTÉ SERVEUR : chaque chapitre s'enchaîne
      // tout seul sur le serveur (voir /api/generate-book/*), donc fermer cet
      // onglet n'interrompt plus rien — contrairement à l'ancienne boucle qui
      // tournait ici, dans le navigateur, chapitre après chapitre.
      const plan = created.slice(startIdx).map((c, k) => ({
        chapterId: c.id,
        number: c.number,
        title: c.title,
        brief: planChapters[k]?.brief || "",
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
            characters: (projectData as any)?.characters || undefined,
            instructions: projectData?.instructions || undefined,
            bookOutline: outline,
            model,
            targetWords: preset.wordsPerChapter,
            useWebSearch,
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
      bookJobIdRef.current = jobId;

      // Poll le statut du job jusqu'à complétion/échec/annulation, en
      // reflétant la progression réelle des chapitres depuis la base.
      await new Promise<void>((resolve) => {
        const poll = async () => {
          if (batchStopRef.current) {
            try {
              await fetch("/api/generate-book/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
              });
            } catch { /* best-effort */ }
            resolve();
            return;
          }

          try {
            const res = await fetch(`/api/generate-book/status?jobId=${jobId}`);
            const data = await res.json().catch(() => null);
            if (data?.chapters) {
              setChapters(data.chapters);
            }
            const job = data?.job;
            if (job) {
              const doneCount = Math.min(job.current_index, total);
              setBatchProgress({ current: doneCount, total });
              setBatchLabel(
                job.status === "running"
                  ? `Rédaction ${doneCount + 1}/${total}…`
                  : job.status
              );
              if (job.status === "failed") {
                if (job.last_error === "insufficient_funds") {
                  alert("Pièces insuffisantes pour continuer la génération du livre. Les chapitres déjà rédigés sont enregistrés.");
                } else {
                  alert("Une erreur est survenue pendant la génération du livre. Les chapitres déjà rédigés sont enregistrés. Vous pouvez relancer la génération pour reprendre.");
                }
                resolve();
                return;
              }
              if (job.status === "completed" || job.status === "canceled") {
                resolve();
                return;
              }
            }
          } catch (err) {
            console.warn("Erreur de polling du job de génération:", err);
          }
          setTimeout(poll, 3000);
        };
        poll();
      });

      setActiveChapterIndex(startIdx);
    } catch (error) {
      console.error("Erreur lors de la génération complète du livre:", error);
      alert("Une erreur est survenue pendant la génération du livre. Les chapitres déjà rédigés sont enregistrés.");
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
      batchStopRef.current = false;
    }
  };

  // Vrai ? au moins un chapitre (hors sommaire) est encore VIDE → on peut reprendre.
  const isRealChapterEmpty = (c: Chapter) =>
    !/sommaire|table des mati/i.test(c.title || "") &&
    (c.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length < 40;
  const hasUnwrittenChapters = chapters.some(isRealChapterEmpty) && chapters.some((c) => !isRealChapterEmpty(c) || /sommaire|table des mati/i.test(c.title || ""));

  // REPRISE : ne (re)génère QUE les chapitres restés vides, sans toucher aux
  // chapitres déjà rédigés (contrairement à « Générer tout le livre » qui
  // recrée toute la structure). Sert après un arrêt pour pièces insuffisantes.
  const continueBookGeneration = async () => {
    const pId = currentProjectId || localStorage.getItem("iris_current_project_id");
    if (!pId) { alert("Projet introuvable. Enregistrez d'abord votre projet."); return; }

    const targets = chapters
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => isRealChapterEmpty(c));
    if (targets.length === 0) { alert("Tous les chapitres sont déjà rédigés."); return; }

    const model = selectedAiModel;
    batchStopRef.current = false;
    setBatchProgress(null);
    setIsBatchGenerating(true);
    setBatchLabel("Reprise de la rédaction…");
    try {
      const sommaire = findSommaireChapter();
      let outline = "";
      let planList: { title: string; brief: string }[] = [];
      if (sommaire) {
        const only = (sommaire.content.split(/<hr[^>]*data-page-break[^>]*>/i)[0] || sommaire.content).trim();
        planList = parseSommaireChapters(only);
        outline = only.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000);
      }

      const total = targets.length;
      const plan = targets.map(({ c: chap }) => ({
        chapterId: chap.id,
        number: chap.number,
        title: chap.title,
        brief: planList.find((p) => p.title.trim() === (chap.title || "").trim())?.brief || "",
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
            characters: (projectData as any)?.characters || undefined,
            instructions: projectData?.instructions || undefined,
            bookOutline: outline,
            model,
            useWebSearch,
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
      bookJobIdRef.current = jobId;

      await new Promise<void>((resolve) => {
        const poll = async () => {
          if (batchStopRef.current) {
            try {
              await fetch("/api/generate-book/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
              });
            } catch { /* best-effort */ }
            resolve();
            return;
          }
          try {
            const res = await fetch(`/api/generate-book/status?jobId=${jobId}`);
            const data = await res.json().catch(() => null);
            if (data?.chapters) setChapters(data.chapters);
            const job = data?.job;
            if (job) {
              setBatchProgress({ current: Math.min(job.current_index, total), total });
              setBatchLabel(job.status === "running" ? `Rédaction ${Math.min(job.current_index + 1, total)}/${total}…` : job.status);
              if (job.status === "failed") {
                alert(
                  job.last_error === "insufficient_funds"
                    ? "Pièces insuffisantes pour continuer. Les chapitres déjà rédigés sont enregistrés — rechargez puis cliquez à nouveau sur « Continuer la rédaction »."
                    : "La génération s'est interrompue. Les chapitres déjà rédigés sont enregistrés. Réessayez ou changez de modèle."
                );
                resolve();
                return;
              }
              if (job.status === "completed" || job.status === "canceled") {
                resolve();
                return;
              }
            }
          } catch (err) {
            console.warn("Erreur de polling du job de génération:", err);
          }
          setTimeout(poll, 3000);
        };
        poll();
      });

      setActiveChapterIndex(0);
    } catch (error) {
      console.error("Erreur lors de la reprise de la rédaction:", error);
      alert("Une erreur est survenue pendant la reprise. Les chapitres déjà rédigés sont enregistrés.");
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
      batchStopRef.current = false;
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
          outline = only.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000);
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
        } catch {
          /* échec de sauvegarde silencieux */
        }
      }
    } catch (error) {
      console.error("Erreur lors de la génération du chapitre:", error);
      alert("Une erreur est survenue lors de la génération du chapitre.");
    } finally {
      setIsGeneratingChapter(false);
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* 1. REUSABLE GLOBAL SIDEBAR (LEFT SIDE) */}
      <Sidebar />

      {/* MAIN STUDIO CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 2. SLEEK ESSENTIAL HEADER BAR */}
        <header className="bg-white border-b border-neutral-200/80 h-16 px-2 sm:px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar h-full pr-2">
            {/* Left: Book Title & Active Chapter Picker */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span className="hidden sm:inline">Mes Livres</span>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {/* Editable Book Title Input */}
              <div className="flex items-center gap-1.5 bg-neutral-100/80 hover:bg-white border border-neutral-200 focus-within:border-secondary focus-within:bg-white rounded-xl px-3 py-1 transition-all">
                <span className="material-symbols-outlined text-sm text-neutral-400">edit</span>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="font-heading font-extrabold text-sm sm:text-base text-neutral-900 bg-transparent border-none outline-none focus:ring-0 w-40 sm:w-56 truncate"
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
                    if (confirm("Voulez-vous vraiment fusionner tous les chapitres en un seul document ? (Cette action supprimera le découpage actuel)")) {
                      const mergedContent = chapters.map(c => `<h1>${c.title}</h1>\n${c.content}`).join('\n<br/>\n');
                      const mergedChapter = {
                        number: 1,
                        title: "Livre complet",
                        content: mergedContent,
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
                {chapters.length > 1 && <option value="-1">Tout le livre (Fusionner)</option>}
                {chapters.length === 1 && <option value="-2">Découper en chapitres</option>}
                {chapters.map((chap, idx) => (
                  <option key={chap.id} value={idx}>
                    {chap.title}
                  </option>
                ))}
              </select>

              {/* Reprise : visible seulement si des chapitres restent vides
                  ET qu'au moins un est déjà rédigé (livre partiellement écrit). */}
              {hasUnwrittenChapters && !isBatchGenerating && (
                <button
                  onClick={continueBookGeneration}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                  title="Reprendre la rédaction : ne (ré)génère que les chapitres restés vides, sans toucher aux chapitres déjà écrits"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  <span className="hidden xl:inline">Continuer la rédaction</span>
                </button>
              )}

              <button
                onClick={handleGenerateWholeBook}
                disabled={isBatchGenerating}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                title="Rédiger automatiquement tous les chapitres à partir du sommaire (un chapitre après l'autre)"
              >
                <span className="material-symbols-outlined text-sm">auto_stories</span>
                <span className="hidden xl:inline">Générer tout le livre</span>
              </button>
            </div>
          </div>

          {/* Right Essential Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Stats */}
            <div className="hidden lg:flex items-center gap-3 bg-neutral-50 px-3.5 py-1.5 rounded-xl border border-neutral-200/70 text-xs">
              <span className="font-mono font-bold text-neutral-700">{wordCount} MOTS</span>
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
              className="bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              title="Démarrer un nouveau projet complet"
            >
              <span className="material-symbols-outlined text-base text-secondary">add_circle</span>
              <span className="hidden sm:inline">Nouveau Projet</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/pricing" className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs" title="Acheter des pièces">
                <span className="text-sm">🪙</span>
                <span>{walletBalance !== null ? walletBalance : "..."}</span>
              </Link>
              
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span className="hidden sm:inline">Exporter / Télécharger</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Menu Toggle - Now Outside the scroll container */}
        <div className="relative shrink-0 pl-2 sm:pl-4 border-l border-neutral-100 ml-2">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName || "Utilisateur"}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail || ""}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">person</span>
                      <span>Mon Profil</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100">
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </header>

        {/* MOBILE VIEW SEGMENTED CONTROL (visible on mobile / small screens) */}
        <div className="lg:hidden flex items-center justify-center p-2 bg-white border-b border-neutral-200 gap-2 shrink-0 z-30">
          <button
            onClick={() => setMobileView("editor")}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 ${
              mobileView === "editor"
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:text-neutral-900"
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
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative pb-20 md:pb-0">
          {/* ================= 3A. RICH MANUSCRIPT EDITOR (MIDDLE / MAIN AREA) ================= */}
          <div className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
            mobileView === "editor" ? "flex" : "hidden lg:flex"
          }`}>
            <RichManuscriptEditor
              ref={editorRef}
              initialContent={currentChapter.content}
              chapterTitle={currentChapter.title}
              onTitleChange={(newTitle) => {
                const updated = [...chapters];
                updated[activeChapterIndex].title = newTitle;
                setChapters(updated);
                setSaveStatus("saving");
              }}
              onContentChange={(newHtml) => {
                const updated = [...chapters];
                updated[activeChapterIndex].content = newHtml;
                setChapters(updated);
                setSaveStatus("saving");
              }}
              onWordCountChange={(count) => setLiveWordCount(count)}
              onContinueWithAi={() => {
                setMobileView("chat");
                handleSendMessage("Rédiger la suite de ce chapitre avec l'IA");
              }}
              onGenerateFullChapter={handleGenerateFullChapter}
              onGenerateWholeBook={handleGenerateWholeBook}
              bookViewMode={
                chapters.length <= 1 || /sommaire|table des mati/i.test(currentChapter?.title || "")
                  ? "full"
                  : "chapter"
              }
              onGenerateChapter={() => setIsChapterModalOpen(true)}
              onContextualAiAction={handleContextualAiAction}
              onSendSelectionToChat={handleSendSelectionToChat}
              isGenerating={isGeneratingChapter || isRewriting || isInitialGenerating || isBatchGenerating}
              generationLabel={
                isBatchGenerating
                  ? batchLabel
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
              className={`hidden lg:flex w-1.5 hover:w-2 bg-neutral-200/70 hover:bg-secondary cursor-col-resize transition-all shrink-0 z-20 items-center justify-center group ${
                isResizing ? "bg-secondary w-2" : ""
              }`}
              title="Faites glisser pour ajuster la largeur du chat IA"
            >
              <div className="w-1 h-8 rounded-full bg-neutral-400 group-hover:bg-white transition-colors"></div>
            </div>
          )}

          {/* ================= 3C. AI CHAT ASSISTANT PANEL (RIGHT SIDE, RESIZABLE) ================= */}
          {!isChatCollapsed && (
            <aside
              className={`h-full bg-white border-l border-neutral-200/80 flex-col shrink-0 relative shadow-lg z-10 w-full lg:w-[var(--chat-width)] ${
                mobileView === "chat" ? "flex" : "hidden lg:flex"
              }`}
              style={{ '--chat-width': `${chatWidth}px` } as React.CSSProperties}
            >
              {/* Chat Header */}
              <div className="p-3.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="font-heading font-extrabold text-xs sm:text-sm text-neutral-900 truncate">
                    Iris IA
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedAiModel}
                    onChange={(e) => setSelectedAiModel(e.target.value)}
                    className="bg-white border border-neutral-200 text-neutral-800 text-[11px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer hover:border-secondary transition-all"
                    title="Choisir le modèle d'IA"
                  >
                    <option value="gemini-2.5-flash">✨ Gemini 2.5 Flash (~20 ✨/page)</option>
                    <option value="gpt-4o">🚀 ChatGPT (GPT-4o) (~80 ✨/page)</option>
                    <option value="claude-3-5-sonnet-20240620">🖋️ Claude 3.5 Sonnet (~150 ✨/page)</option>
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
                        : "bg-neutral-50 border-neutral-200 text-neutral-400 hover:bg-neutral-100"
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
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                    title="Réinitialiser et effacer la discussion"
                  >
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                  </button>

                  <button
                    onClick={() => setIsChatCollapsed(true)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors"
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
                          : "bg-neutral-100 text-neutral-900 rounded-tl-xs chat-bubble-text border border-neutral-200/60"
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
                        <div className="mt-3 pt-3 border-t border-neutral-200/80 flex justify-end">
                          <button
                            onClick={() => handleInsertIntoManuscript(msg.suggestedTextToInsert!)}
                            className="bg-white hover:bg-orange-50 border border-secondary/40 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
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
                            ? "bg-neutral-50/90 border-neutral-200"
                            : "bg-blue-50/80 border-blue-200/90"
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`material-symbols-outlined text-base ${
                                msg.chapterModification.isUndone ? "text-neutral-500" : "text-[#1b6df9]"
                              }`}>
                                {msg.chapterModification.isUndone ? "undo" : "auto_fix_high"}
                              </span>
                              <span className="text-xs font-extrabold text-neutral-900 truncate">
                                {msg.chapterModification.isUndone ? "Modification annulée • " : "Chapitre modifié • "}
                                <span className="text-blue-900 font-extrabold">
                                  {msg.chapterModification.chapterTitle || `Chapitre ${msg.chapterModification.chapterIndex + 1}`}
                                </span>
                              </span>
                            </div>
                          </div>

                          {msg.chapterModification.summary && (
                            <p className="text-[11px] text-neutral-700 font-medium leading-relaxed font-body">
                              {msg.chapterModification.summary}
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200/50">
                            {!msg.chapterModification.isUndone && msg.chapterModification.previousContent !== undefined && (
                              <button
                                onClick={() => handleUndoModification(msg.id, msg.chapterModification!)}
                                className="bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Annuler cette réécriture et restaurer la version précédente"
                              >
                                <span className="material-symbols-outlined text-sm text-neutral-500">undo</span>
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
              <div className="p-3 bg-neutral-50/50 border-t border-neutral-100 flex flex-wrap gap-1.5 shrink-0">
                <button
                  onClick={() => handleSendMessage("Proposer un plan en 5 chapitres pour ce livre")}
                  className="px-3 py-1.5 bg-white border border-neutral-200 hover:border-secondary hover:text-secondary rounded-full text-xs font-semibold text-neutral-700 transition-all shadow-2xs"
                >
                  💡 Proposer un plan
                </button>
                <button
                  onClick={() => handleSendMessage("Développer le paragraphe actuel avec plus de détails")}
                  className="px-3 py-1.5 bg-white border border-neutral-200 hover:border-secondary hover:text-secondary rounded-full text-xs font-semibold text-neutral-700 transition-all shadow-2xs"
                >
                  ✨ Enrichir le texte
                </button>
                <button
                  onClick={() => handleSendMessage("Proposer 3 titres accrocheurs pour ce projet")}
                  className="px-3 py-1.5 bg-white border border-neutral-200 hover:border-secondary hover:text-secondary rounded-full text-xs font-semibold text-neutral-700 transition-all shadow-2xs"
                >
                  🎨 Idées de titres
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-neutral-200/80 shrink-0">
                {/* Pastille du passage sélectionné (édition ciblée) */}
                {attachedSelection && (
                  <div className="mb-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-secondary text-base mt-0.5">content_cut</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-secondary">Passage sélectionné</p>
                      <p className="text-[11px] text-neutral-600 line-clamp-2 italic">
                        « {attachedSelection.text.slice(0, 140)}{attachedSelection.text.length > 140 ? "…" : ""} »
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Écrivez ce qu'il faut en faire, Iris ne modifiera que ce passage.</p>
                    </div>
                    <button
                      onClick={() => setAttachedSelection(null)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-white transition-colors shrink-0"
                      title="Retirer le passage"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
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
                          className="p-0.5 rounded-full hover:bg-white text-blue-500 hover:text-red-500 transition-colors shrink-0"
                          title="Retirer ce document"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </span>
                    ))}
                    {isAnalyzingChatFile && (
                      <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 rounded-full px-2.5 py-1 text-[11px] font-bold text-neutral-600">
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
                  className={`relative flex items-center bg-neutral-50 border rounded-2xl px-2 py-2 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all ${attachedSelection ? "border-secondary/60" : "border-neutral-200"}`}
                >
                  {/* Bouton + : joindre un document à analyser */}
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isAnalyzingChatFile}
                    title="Joindre un document à analyser (20 pièces)"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-secondary hover:bg-white transition-colors shrink-0 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isListening
                        ? "🎤 Parlez, Iris vous écoute…"
                        : attachedSelection
                        ? "Ex: rends ce passage plus percutant..."
                        : "Discutez, dictez ou demandez à l'IA..."
                    }
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-neutral-900 placeholder:text-neutral-400 py-1 px-1"
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
                          : "text-neutral-500 hover:text-secondary hover:bg-white"
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
          chapters: chapters
        }}
      />

      {/* GEO SCORE MODAL */}
      <GeoScoreModal
        isOpen={isGeoScoreModalOpen}
        onClose={() => setIsGeoScoreModalOpen(false)}
        bookTitle={bookTitle}
        bookContent={chapters.map(c => c.content).join("\n\n")}
      />

      <GenerateBookModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onConfirm={runWholeBookGeneration}
        defaultModel={selectedAiModel}
        sommaireChapters={sommaireChapterCount}
        balance={walletBalance}
      />

      <ChapterGenerateModal
        key={`chapmodal-${activeChapterIndex}-${isChapterModalOpen}`}
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        onConfirm={(opts) => runChapterGeneration(activeChapterIndex, opts)}
        chapterTitle={currentChapter?.title || "Ce chapitre"}
        hasContent={((currentChapter?.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length) > 40}
        defaultModel={selectedAiModel}
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
          <p className="text-sm text-neutral-500 font-medium animate-pulse">Chargement de votre studio...</p>
        </div>
      </div>
    }>
      <RedactionContent />
    </Suspense>
  );
}
