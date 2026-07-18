"use client";

import { useState } from "react";
import { Send, Menu, X, BookOpen, Plus, FileText, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour ! Je suis Livre-Génie. Quel est le sujet du livre que nous allons écrire ensemble aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "C'est un excellent sujet. Pour commencer, quelle est votre cible principale pour ce livre ?" 
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#121212] border-r border-white/10 z-50 flex flex-col`}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-white">Livre-Génie</span>
              </Link>
              <button 
                className="lg:hidden p-2 text-muted-foreground hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors mb-6">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nouveau projet</span>
              </button>

              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Chapitres</h3>
                {[
                  "1. Introduction",
                  "2. Les bases de la compta",
                  "3. Optimisation fiscale"
                ].map((chap, i) => (
                  <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{chap}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
                <span>Paramètres</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative w-full">
        {/* Header */}
        <header className="h-16 flex items-center px-4 border-b border-white/10 bg-background/80 backdrop-blur-md z-10 sticky top-0">
          <button 
            className="p-2 mr-4 text-muted-foreground hover:text-white rounded-lg hover:bg-white/5 transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-semibold text-white">Création du livre</h1>
            <span className="text-xs text-muted-foreground">Projet: Les secrets de la comptabilité</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={`flex gap-4 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "assistant" 
                    ? "bg-gradient-to-br from-primary to-accent" 
                    : "bg-white/10"
                }`}>
                  {msg.role === "assistant" ? (
                    <Sparkles className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-medium text-white">VO</span>
                  )}
                </div>
                <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] ${
                  msg.role === "assistant" 
                    ? "bg-[#1A1A1A] border border-white/5 text-gray-200" 
                    : "bg-primary text-white"
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez votre message..."
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none overflow-hidden"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-3 bottom-3 p-2 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Livre-Génie peut faire des erreurs. Vérifiez toujours les informations importantes.
          </p>
        </div>
      </main>
    </div>
  );
}
