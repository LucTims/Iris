"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RichManuscriptEditor from "@/components/RichManuscriptEditor";

interface Message {
  id: number;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestedTextToInsert?: string;
}

interface Chapter {
  id: number;
  number: number;
  title: string;
  content: string;
  status: "Brouillon" | "En cours" | "Terminé";
}

export default function RedactionPage() {
  const searchParams = useSearchParams();
  const isNewProject = searchParams?.get("new") === "true";

  // Global Layout State
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Chat Panel Resizing & Collapsing State
  const [chatWidth, setChatWidth] = useState(420); // Default 420px
  const [isResizing, setIsResizing] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Book Project State
  const [bookTitle, setBookTitle] = useState("L'Épopée de Soundiata");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Bonjour Martin ! Je suis votre assistant co-auteur. Je vois que vous travaillez sur le premier chapitre de \"L'Épopée de Soundiata\". C'est un récit épique fascinant.\n\nPour rendre le départ du héros plus poignant, souhaiteriez-vous mettre l'accent sur sa force intérieure naissante ou sur la résilience de sa mère ?",
      time: "09:41"
    }
  ]);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // Load project on mount
  useEffect(() => {
    const projectContextStr = localStorage.getItem("iris_current_project");
    const projectContext = projectContextStr ? JSON.parse(projectContextStr) : null;

    if (projectContext && projectContext.title) {
      setBookTitle(projectContext.title);
    }
    
    if (isNewProject) {
      setChapters([
        {
          id: 1,
          number: 1,
          title: "Plan Détaillé (En génération...)",
          content: "",
          status: "Brouillon"
        }
      ]);
      setMessages([]);
      setIsAiThinking(true);
      
      let isSubscribed = true;

      const generatePlan = async () => {
        try {
          const response = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectContext || {})
          });

          if (!response.ok) throw new Error("Erreur API");
          
          setIsAiThinking(false);

          const aiMessageId = Date.now();
          setMessages([
            {
              id: aiMessageId,
              sender: "ai",
              text: "",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                const chunkValue = decoder.decode(value, { stream: true });
                currentText += chunkValue;
                
                if (isSubscribed) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId ? { ...msg, text: currentText } : msg
                  ));
                }
              }
            }
            
            if (isSubscribed) {
              setChapters(prev => prev.map(chap => 
                chap.id === 1 ? { ...chap, content: currentText, title: "Plan Détaillé", status: "En cours" } : chap
              ));
            }
          }
        } catch (error) {
          console.error("Génération échouée", error);
          setIsAiThinking(false);
          setMessages([
            {
              id: Date.now(),
              sender: "ai",
              text: "⚠️ Une erreur est survenue lors de la génération. Avez-vous bien ajouté votre clé API `GOOGLE_GENERATIVE_AI_API_KEY` dans le fichier `.env.local` et redémarré le serveur de développement ?",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      };

      generatePlan();

      return () => {
        isSubscribed = false;
      };
    } else if (projectContextStr) {
      // Si ce n'est pas un nouveau projet mais qu'on a un projet en mémoire, on vide le chat par défaut
      setMessages([
        {
          id: 1,
          sender: "ai",
          text: `Bonjour ! Je suis Iris IA, votre co-auteur. Je suis prêt à travailler sur votre projet "${projectContext?.title}". Que voulez-vous faire ?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  }, [isNewProject]);

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

  // Calculate current word count
  const currentChapter = chapters[activeChapterIndex] || chapters[0];
  const wordCount = currentChapter.content.trim() ? currentChapter.content.trim().split(/\s+/).length : 0;

  // Handle Sending a User Message & AI Response
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

    const chatRequest = async () => {
      try {
        const projectContextStr = localStorage.getItem("iris_current_project");
        const projectContext = projectContextStr ? JSON.parse(projectContextStr) : null;
        
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            context: {
              title: bookTitle,
              synopsis: projectContext?.synopsis || currentChapter.content.substring(0, 500),
              tone: projectContext?.tone || "professionnel"
            }
          })
        });

        if (!response.ok) throw new Error("API Chat Error");

        setIsAiThinking(false);

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
    const updated = [...chapters];
    updated[activeChapterIndex].content += textToInsert;
    setChapters(updated);
  };

  // Start New Book Project Workflow
  const handleStartNewProject = () => {
    const titlePrompt = prompt("Entrez le titre de votre nouveau projet de livre :", "Le Guide de l'Auteur Moderne");
    if (!titlePrompt) return;

    setBookTitle(titlePrompt);
    setChapters([
      {
        id: Date.now(),
        number: 1,
        title: "Chapitre 1 : Introduction & Vision",
        content: `Bienvenue dans l'écriture de votre ouvrage "${titlePrompt}".\n\nCommencez à saisir vos idées ici ou demandez à l'assistant IA à droite de vous proposer un plan complet ou une introduction.`,
        status: "Brouillon"
      }
    ]);
    setActiveChapterIndex(0);
    setMessages([
      {
        id: Date.now(),
        sender: "ai",
        text: `Félicitations pour le lancement de votre nouveau livre "${titlePrompt}" ! 🎉\n\nJe suis prêt à vous aider. Quel est le public cible et le message principal que vous souhaitez transmettre dans cet ouvrage ?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

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
                className="bg-orange-50 border border-orange-200 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer"
              >
                {chapters.map((chap, idx) => (
                  <option key={chap.id} value={idx}>
                    {chap.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Essential Actions */}
          <div className="flex items-center gap-3">
            {/* Live Stats */}
            <div className="hidden lg:flex items-center gap-3 bg-neutral-50 px-3.5 py-1.5 rounded-xl border border-neutral-200/70 text-xs">
              <span className="font-mono font-bold text-neutral-700">{wordCount} MOTS</span>
              <div className="w-[1px] h-3.5 bg-neutral-300"></div>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">cloud_done</span> Enregistré
              </span>
            </div>

            <button
              onClick={handleStartNewProject}
              className="bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              title="Démarrer un nouveau projet"
            >
              <span className="material-symbols-outlined text-base text-secondary">add_circle</span>
              <span className="hidden sm:inline">Nouveau Projet</span>
            </button>

            <Link
              href="/export"
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              <span>Exporter PDF</span>
            </Link>

            {/* Profile Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                ML
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">Martin Laurent</p>
                    <p className="text-xs text-neutral-500 truncate">martin@exemple.com</p>
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
                    <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. SPLIT WORKSPACE (TEXT EDITOR IN MIDDLE, CHAT ON RIGHT) */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          {/* ================= 3A. RICH MANUSCRIPT EDITOR (MIDDLE / MAIN AREA) ================= */}
          <RichManuscriptEditor
            initialContent={currentChapter.content}
            chapterTitle={currentChapter.title}
            onTitleChange={(newTitle) => {
              const updated = [...chapters];
              updated[activeChapterIndex].title = newTitle;
              setChapters(updated);
            }}
            onContentChange={(newHtml) => {
              const updated = [...chapters];
              updated[activeChapterIndex].content = newHtml;
              setChapters(updated);
            }}
            onContinueWithAi={() => handleSendMessage("Rédiger la suite de ce chapitre avec l'IA")}
          />

          {/* ================= 3B. DRAGGABLE RESIZER HANDLE ================= */}
          {!isChatCollapsed && (
            <div
              onMouseDown={() => setIsResizing(true)}
              className={`w-1.5 hover:w-2 bg-neutral-200/70 hover:bg-secondary cursor-col-resize transition-all shrink-0 z-20 flex items-center justify-center group ${
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
              style={{ width: `${chatWidth}px` }}
              className="h-full bg-white border-l border-neutral-200/80 flex flex-col shrink-0 relative shadow-lg z-10"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-heading font-extrabold text-sm text-neutral-900">
                    Assistant Co-Auteur IA
                  </span>
                </div>

                <div className="flex items-center gap-1">
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
    </div>
  );
}
