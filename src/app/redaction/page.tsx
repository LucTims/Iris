"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RichManuscriptEditor, { RichManuscriptEditorHandle } from "@/components/RichManuscriptEditor";
import ImportManuscriptModal from "@/components/ImportManuscriptModal";
import ExportBookModal from "@/components/ExportBookModal";
import RewriteModal from "@/components/RewriteModal";
import { parseManuscriptFile, splitHtmlIntoChapters } from "@/lib/parser";

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
  const { displayName, displayEmail, signOut } = useUser();
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

  // Book Project State
  const [bookTitle, setBookTitle] = useState("Mon Projet de Livre");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [projectData, setProjectData] = useState<any>(null);

  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: 1,
      number: 1,
      title: "Chapitre 1 : L'Ombre du Baobab",
      content: `Le soleil de midi écrasait le Mandé d'une chaleur de plomb, transformant l'horizon en un miroir frémissant où se confondaient la terre rouge et le ciel de nacre. Sous le grand baobab qui veillait sur Niani depuis des générations, le silence n'était troublé que par le bourdonnement lancinant des insectes et le souffle court d'un enfant qui refusait de s'avouer vaincu.\n\nSoundiata, les jambes inertes mais le regard embrasé d'une volonté farouche, fixait la branche basse de l'arbre séculaire. Pour beaucoup, il n'était qu'un fils infirme, un prince sans royaume intérieur. Mais dans le secret de son âme, une force commençait à gronder, plus puissante que les armées de son demi-frère Dankaran Touman.`,
      status: "En cours"
    },
    {
      id: 2,
      number: 2,
      title: "Chapitre 2 : Le Serment de Sogolon",
      content: `Sogolon Kèdjou regardait son fils avec des yeux emplis de larmes et de fierté. Le pilon de baobab reposait sur le sol dusty, témoin des moqueries et des humiliations subies. Mais ce jour-là, l'air lui-même semblait retenir son souffle.`,
      status: "Brouillon"
    },
    {
      id: 3,
      number: 3,
      title: "Chapitre 3 : L'Éveil du Lion",
      content: `C'est en saisissant la barre de fer forgee par Farakourou que l'impossible se produisit. Le fer se courba, la terre trembla, et sous les yeux stupéfaits du Mandé, Soundiata se mit debout.`,
      status: "Brouillon"
    }
  ]);

  // Chat Conversation State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichManuscriptEditorHandle>(null);

  // Manuscript Import & Export State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);

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

        try {
          // Get context from localStorage to see what to generate
          let includeDetailedPlan = true;
          let includeToc = false;
          try {
            const ctxRaw = localStorage.getItem("iris_current_project");
            if (ctxRaw) {
              const ctx = JSON.parse(ctxRaw);
              if (ctx.includeDetailedPlan !== undefined) includeDetailedPlan = ctx.includeDetailedPlan;
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
              includeDetailedPlan,
              includeToc
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
              setChapters(prev => prev.map(chap =>
                chap.id === chapterId
                  ? { ...chap, content: currentText, title: includeDetailedPlan ? "Plan Détaillé" : (includeToc ? "Sommaire" : "Chapitre 1"), status: "En cours" }
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
          }

          const firstChapter = fetchedChapters[0];
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

  // Handle Sending a User Message & AI Response
  const handleRewriteChapter = async (instructions: string) => {
    const chapter = chapters[activeChapterIndex];
    if (!chapter || !chapter.content) {
      alert("Le chapitre est vide, rien à réécrire.");
      return;
    }

    setIsAiThinking(true);
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/rewrite-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: chapter.content,
          instructions,
          projectContext: projectData,
          model: selectedAiModel
        })
      });

      if (!response.ok) throw new Error("Erreur de réécriture");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let newText = "";

      // Vider le chapitre actuel avant d'écrire par dessus
      setChapters(prev => prev.map(chap =>
        chap.id === chapter.id ? { ...chap, content: "" } : chap
      ));

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            newText += chunk;
            setChapters(prev => prev.map(chap =>
              chap.id === chapter.id ? { ...chap, content: newText } : chap
            ));
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la réécriture du document:", error);
      alert("Erreur lors de la réécriture. Veuillez réessayer.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query.trim()) return;

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
            context: {
              title: bookTitle,
              synopsis: projectData?.synopsis || currentChapter.content.substring(0, 500),
              tone: projectData?.tone || "professionnel"
            },
            chapters,
            activeChapterIndex,
            projectId: currentProjectId
          })
        });

        if (!response.ok) throw new Error("API Chat Error");

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
      } catch (error) {
        console.error(error);
        setIsAiThinking(false);
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          sender: "ai",
          text: "⚠️ Désolé, je rencontre une erreur de communication. Veuillez réessayer.",
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
  const handleContextualAiAction = async (actionType: string, selectedText: string): Promise<string> => {
    try {
      const response = await fetch("/api/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          selectedText,
          synopsis: projectData?.synopsis || "",
          tone: projectData?.tone || "professionnel",
          model: selectedAiModel,
          projectId: currentProjectId
        })
      });

      if (!response.ok) throw new Error("Erreur AI contextuelle");

      // For contextual actions, we might just want to wait for the full response to keep it simple,
      // or we can read the stream and return it. Since onContextualAiAction expects a Promise<string>,
      // we'll accumulate the stream and return the final string.
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            fullText += decoder.decode(value, { stream: !done });
          }
        }
      }
      return fullText;
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

      const response = await fetch("/api/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          synopsis: projectData?.synopsis || "",
          tone: projectData?.tone || "professionnel",
          chapterTitle: currentChapter.title,
          chapterNumber: currentChapter.number,
          previousChaptersSummary,
          model: selectedAiModel,
          projectId: currentProjectId
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


  // Handle File Selection for Manuscript Import
  const handleFileSelectedForImport = (file: File) => {
    setImportFile(file);
    setIsImportModalOpen(true);
  };

  // Split current document by internal headings (Parties / Chapitres)
  const handleSplitCurrentDocument = () => {
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
      const newChapters: Chapter[] = split.map((sp, idx) => ({
        id: Date.now() + idx,
        number: idx + 1,
        title: sp.title || `Chapitre ${idx + 1}`,
        content: sp.content || "",
        status: "Brouillon"
      }));
      setChapters(newChapters);
      setActiveChapterIndex(0);
      setSaveStatus("saving");
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
        const newChapters: Chapter[] = parsedChapters.map((pc, idx) => ({
          id: Date.now() + idx,
          number: idx + 1,
          title: pc.title || `Chapitre ${idx + 1}`,
          content: pc.content || "",
          status: "Brouillon"
        }));

        setChapters(newChapters);
        setActiveChapterIndex(0);
        setSaveStatus("saving");
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
        <header className="bg-white border-b border-neutral-200/80 h-16 px-6 flex items-center justify-between gap-4 shrink-0 z-30">
          {/* Left: Book Title & Active Chapter Picker */}
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span className="hidden sm:inline">Mes Livres</span>
            </Link>

            <div className="flex items-center gap-2">
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
                onChange={(e) => setActiveChapterIndex(Number(e.target.value))}
                className="bg-orange-50 border border-orange-200 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[200px] truncate"
              >
                {chapters.map((chap, idx) => (
                  <option key={chap.id} value={idx}>
                    {chap.title}
                  </option>
                ))}
              </select>

              {/* Action pour scinder un document long contenant plusieurs sous-parties en chapitres distincts */}
              {chapters.length === 1 && (
                <button
                  onClick={handleSplitCurrentDocument}
                  className="bg-orange-100 hover:bg-orange-200 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-orange-300/60 shadow-2xs"
                  title="Scinder ce document en plusieurs chapitres selon les grands titres (ex: Première Partie, Deuxième Partie, Troisième Partie...)"
                >
                  <span className="material-symbols-outlined text-sm">content_cut</span>
                  <span className="hidden xl:inline">Scinder par chapitres</span>
                </button>
              )}

              <button
                onClick={() => setIsRewriteModalOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                title="Demander à l'IA de réécrire complètement ce document selon vos consignes"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="hidden xl:inline">Réécrire</span>
              </button>
            </div>
          </div>

          {/* Right Essential Actions */}
          <div className="flex items-center gap-3">
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

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Exporter / Télécharger</span>
            </button>

            {/* Profile Menu Toggle */}
            <div className="relative">
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
          </div>
        </header>

        {/* MOBILE VIEW SEGMENTED CONTROL (visible on mobile / small screens) */}
        <div className="lg:hidden flex items-center justify-center p-2 bg-white border-b border-neutral-200 gap-2 shrink-0 z-30">
          <button
            onClick={() => setMobileView("editor")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mobileView === "editor"
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <span className="material-symbols-outlined text-base">description</span>
            <span>Éditeur Manuscrit</span>
          </button>

          <button
            onClick={() => setMobileView("chat")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
              mobileView === "chat"
                ? "bg-secondary text-white shadow-2xs"
                : "bg-orange-50 text-secondary hover:bg-orange-100"
            }`}
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>Assistant Iris IA</span>
            {isAiThinking && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>}
          </button>
        </div>

        {/* 3. SPLIT WORKSPACE (TEXT EDITOR IN MIDDLE, CHAT ON RIGHT) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
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
              onContextualAiAction={handleContextualAiAction}
              isGenerating={isGeneratingChapter}
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
              className={`h-full bg-white border-l border-neutral-200/80 flex-col shrink-0 relative shadow-lg z-10 w-full lg:w-auto ${
                mobileView === "chat" ? "flex" : "hidden lg:flex"
              }`}
              style={{ width: typeof window !== "undefined" && window.innerWidth >= 1024 ? `${chatWidth}px` : undefined }}
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
                    <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash (Gratuit)</option>
                    <option value="gemini-2.5-pro">🧠 Gemini 2.5 Pro (Haute Qualité)</option>
                  </select>

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
                      {msg.text}

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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Discutez ou demandez à l'IA..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-neutral-900 placeholder:text-neutral-400 py-1"
                  />
                  <button
                    type="submit"
                    className="bg-secondary text-white p-2 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all ml-1 shadow-2xs"
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

      <RewriteModal
        isOpen={isRewriteModalOpen}
        onClose={() => setIsRewriteModalOpen(false)}
        onRewrite={handleRewriteChapter}
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
