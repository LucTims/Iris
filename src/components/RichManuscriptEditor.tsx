"use client";

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import HardBreak from '@tiptap/extension-hard-break';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import {
  FONT_CATEGORY_ORDER,
  fontsByCategory,
  googleFontsImportUrl,
} from '@/lib/export/fontRegistry';

const FONTS_BY_CATEGORY = fontsByCategory();
const GOOGLE_FONTS_IMPORT = googleFontsImportUrl();

import { ConvertKit } from '@tiptap-pro/extension-convert-kit';
import { TableKit } from '@tiptap-pro/extension-pages-tablekit';
import { Pages } from '@tiptap-pro/extension-pages';

import { FontSize } from './editor/FontSizeExtension';
import { LineHeight } from './editor/LineHeightExtension';
import { ResizableImage } from './editor/ResizableImageExtension';
import { Callout, CalloutType } from './editor/CalloutExtension';
import { KeyFigure } from './editor/KeyFigureExtension';
import { PullQuote } from './editor/PullQuoteExtension';
import { DropCap } from './editor/DropCapExtension';
import { SectionDivider, DividerStyle } from './editor/SectionDividerExtension';
import { RichManuscriptEditorHandle, RichManuscriptEditorProps, PageFormatType } from './editor/types';
import { AnimatePresence } from 'framer-motion';
import EditorGenerationOverlay from './EditorGenerationOverlay';

export type { RichManuscriptEditorHandle, RichManuscriptEditorProps };

const RichManuscriptEditor = forwardRef<RichManuscriptEditorHandle, RichManuscriptEditorProps>(
  function RichManuscriptEditor(
    {
      initialContent = "",
      chapterTitle = "Chapitre 1",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onTitleChange,
      onContentChange,
      onWordCountChange,
      onContinueWithAi,
      onGenerateFullChapter,
      onGenerateWholeBook,
      bookViewMode = "full",
      onGenerateChapter,
      onContextualAiAction,
      onSendSelectionToChat,
      isGenerating = false,
      generationLabel,
      generationProgress,
      onStopGeneration,
      onFileSelected,
    },
    ref
  ) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Set default zoom on small screens to prevent overflow
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) {
        setZoomLevel(50);
      } else if (window.innerWidth < 1024) {
        setZoomLevel(75);
      }
    }
  }, []);
  const [pageFormat, setPageFormat] = useState<PageFormatType>("A4");
  const [showRuler, setShowRuler] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [, forceUpdate] = useState(0);

  // Modals & Inserters
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkTextInput, setLinkTextInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  // Inline free-form AI instruction on a selection (Option B)
  const [showInlineAi, setShowInlineAi] = useState(false);
  const [inlineInstruction, setInlineInstruction] = useState("");
  const pendingSelRef = useRef<{ from: number; to: number; text: string } | null>(null);
  // Grid picker for table insertion (hover to choose rows × cols)
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHover, setTableHover] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const tablePickerBtnRef = useRef<HTMLDivElement>(null);
  const [tablePickerPos, setTablePickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Initialize Tiptap Pro Pages Editor
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading,
      Bold,
      Italic,
      Underline,
      Strike,
      HardBreak,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      Callout,
      KeyFigure,
      PullQuote,
      DropCap,
      SectionDivider,
      Link.configure({ openOnClick: true, HTMLAttributes: { class: 'text-secondary underline cursor-pointer' } }),
      ResizableImage,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
      FontSize,
      LineHeight,
      ConvertKit.configure({
        table: false, // Handled by TableKit
      }),
      TableKit,
      Pages.configure({
        pageFormat: 'A4',
        header: `<span style="font-size: 10px; font-weight: bold; color: #9ca3af;">IRIS MANUSCRIT</span>`,
        footer: `<span style="font-size: 10px; font-weight: bold; color: #9ca3af;">Page {page} sur {total}</span>`,
      }),
    ],
    content: initialContent || "",
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      setWordCount(words);
      if (onWordCountChange) onWordCountChange(words);
      if (onContentChange) onContentChange(editor.getHTML());

      const count = (editor.storage.pages as any)?.getPageCount?.() || 1;
      setPageCount(count);
    },
    onTransaction: () => {
      forceUpdate(n => n + 1);
    },
  });

  // Expose Imperative Handle
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getContent: () => {
      return editor ? editor.getHTML() : "";
    },
    setContent: (content: string) => {
      if (editor) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    },
    insertContent: (content: string) => {
      if (editor) {
        editor.chain().focus().insertContent(content).run();
      }
    },
    replaceContent: (newContent: string) => {
      if (editor) {
        editor.chain().focus().setContent(newContent).run();
      }
    },
    replaceRange: (from: number, to: number, newContent: string) => {
      if (editor) {
        const size = editor.state.doc.content.size;
        const safeFrom = Math.max(0, Math.min(from, size));
        const safeTo = Math.max(safeFrom, Math.min(to, size));
        editor.chain().focus().insertContentAt({ from: safeFrom, to: safeTo }, newContent).run();
      }
    },
    getSelection: () => {
      if (!editor) return null;
      const { from, to } = editor.state.selection;
      if (from === to) return null;
      const text = editor.state.doc.textBetween(from, to, " ");
      if (!text.trim()) return null;
      return { text, from, to };
    },
    focus: () => {
      if (editor) {
        editor.commands.focus();
      }
    },
  }), [editor]);

  // Sync initialContent when active chapter changes
  useEffect(() => {
    if (!editor) return;
    const nextContent = initialContent ?? "";
    if (nextContent !== editor.getHTML()) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  // Zoom initial adapté à l'écran : la page A4 (~794px) déborde d'un mobile, on
  // réduit donc le zoom au tout premier rendu pour qu'elle tienne à l'écran.
  // On ne le fait qu'une fois — l'utilisateur reste libre d'ajuster ensuite.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    // Valeurs alignées sur les options du sélecteur de zoom (50 / 75 / 100…).
    if (w < 640) setZoomLevel(50);
    else if (w < 1024) setZoomLevel(75);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update dynamic word count and page count
  useEffect(() => {
    if (!editor) return;
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    setWordCount(words);

    const count = (editor.storage.pages as any)?.getPageCount?.() || 1;
    setPageCount(count);
  }, [editor?.getText()]);

  // Update header content with chapter title
  useEffect(() => {
    if (!editor) return;
    if ((editor.commands as any).setHeader) {
      (editor.commands as any).setHeader(
        `<div style="display: flex; justify-content: space-between; width: 100%; font-size: 10px; font-weight: bold; color: #9ca3af;"><span>IRIS MANUSCRIT</span><span>${chapterTitle || "Chapitre"}</span></div>`
      );
    }
  }, [editor, chapterTitle]);

  // Close Top Dropdown Menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      onFileSelected(file);
    }
    e.target.value = "";
  };

  const handleAddNewPage = () => {
    if (!editor) return;
    if ((editor.commands as any).insertPageBreak) {
      (editor.commands as any).insertPageBreak();
    } else if ((editor.commands as any).setPageBreak) {
      (editor.commands as any).setPageBreak();
    } else {
      editor.chain().focus().insertContent('<hr data-page-break>').run();
    }
  };

  const handlePageFormatChange = (newFormat: PageFormatType) => {
    setPageFormat(newFormat);
    if (editor && (editor.commands as any).setPageFormat) {
      (editor.commands as any).setPageFormat(newFormat);
    }
  };

  const handleContextualAction = async (actionType: string) => {
    if (!editor || !onContextualAiAction) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    setIsAiLoading(true);
    try {
      const newText = await onContextualAiAction(actionType, selectedText);
      if (newText) {
        editor.chain().focus().insertContent(newText).run();
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'action IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Option B — open the inline instruction field, capturing the selection now
  // (so it survives the input focus stealing the visual selection).
  const openInlineAi = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;
    pendingSelRef.current = { from, to, text };
    setInlineInstruction("");
    setShowInlineAi(true);
  };

  const handleCustomInlineAction = async () => {
    const sel = pendingSelRef.current;
    if (!editor || !onContextualAiAction || !inlineInstruction.trim() || !sel) return;

    setIsAiLoading(true);
    try {
      const newText = await onContextualAiAction("custom", sel.text, inlineInstruction.trim());
      if (newText) {
        const size = editor.state.doc.content.size;
        const from = Math.max(0, Math.min(sel.from, size));
        const to = Math.max(from, Math.min(sel.to, size));
        editor.chain().focus().insertContentAt({ from, to }, newText).run();
      }
    } catch (err) {
      console.error(err);
      const detail = err instanceof Error && err.message ? err.message : "erreur inconnue";
      alert(`Erreur lors de l'action IA : ${detail}`);
    } finally {
      setIsAiLoading(false);
      setInlineInstruction("");
      setShowInlineAi(false);
      pendingSelRef.current = null;
    }
  };

  // Option A — hand the current selection to the chat panel
  const handleSendToChat = () => {
    if (!editor || !onSendSelectionToChat) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;
    onSendSelectionToChat({ text, from, to });
  };

  const handleInsertCallout = (type: CalloutType) => {
    if (!editor) return;
    (editor.chain().focus() as any).insertCallout(type).run();
    setActiveMenu(null);
  };

  const handleInsertKeyFigure = () => {
    if (!editor) return;
    (editor.chain().focus() as any).insertKeyFigure().run();
    setActiveMenu(null);
  };

  const handleInsertPullQuote = () => {
    if (!editor) return;
    (editor.chain().focus() as any).insertPullQuote().run();
    setActiveMenu(null);
  };

  const handleInsertDropCap = () => {
    if (!editor) return;
    (editor.chain().focus() as any).insertDropCap().run();
    setActiveMenu(null);
  };

  const handleInsertSectionDivider = (style: DividerStyle = "ornament") => {
    if (!editor) return;
    (editor.chain().focus() as any).insertSectionDivider(style).run();
    setActiveMenu(null);
  };

  const handleInsertTable = (rows = 3, cols = 3) => {
    if (!editor) return;
    const r = Math.max(1, rows);
    const c = Math.max(1, cols);
    if ((editor.commands as any).insertTable) {
      (editor.commands as any).insertTable({ rows: r, cols: c, withHeaderRow: true });
    } else {
      const th = Array.from({ length: c }, (_, i) =>
        `<th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête ${i + 1}</th>`
      ).join("");
      const bodyRows = Array.from({ length: Math.max(0, r - 1) }, () =>
        `<tr>${Array.from({ length: c }, () => `<td style="border: 1px solid #d1d5db; padding: 10px 14px;"></td>`).join("")}</tr>`
      ).join("");
      const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;"><thead><tr style="background-color: #f3f4f6;">${th}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;
      editor.chain().focus().insertContent(tableHTML).run();
    }
    setShowTablePicker(false);
    setTableHover({ rows: 0, cols: 0 });
    setActiveMenu(null);
  };

  const handleInsertLinkSubmit = () => {
    if (!editor || !linkUrlInput) return;
    if (linkTextInput) {
      editor.chain().focus().insertContent(`<a href="${linkUrlInput}">${linkTextInput}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: linkUrlInput }).run();
    }
    setIsLinkModalOpen(false);
    setLinkUrlInput("");
    setLinkTextInput("");
  };

  const insertImageIntoDOM = (src: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src }).run();
    }
    setIsImageModalOpen(false);
    setImageUrlInput("");
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) insertImageIntoDOM(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const getFontSize = () => {
    if (!editor) return 16;
    const fs = editor.getAttributes('textStyle').fontSize;
    if (!fs) return 16;
    const parsed = parseInt(String(fs).replace('px', ''), 10);
    return isNaN(parsed) ? 16 : parsed;
  };

  const getLineHeight = () => {
    if (!editor) return 'default';
    const p = editor.getAttributes('paragraph').lineHeight;
    const h = editor.getAttributes('heading').lineHeight;
    return p || h || 'default';
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden min-w-0 font-body">
      {/* ================= 0. GENERATION / REWRITE ANIMATION OVERLAY ================= */}
      <AnimatePresence>
        {isGenerating && (
          <EditorGenerationOverlay
            label={generationLabel || "Iris écrit votre livre"}
            progress={generationProgress}
            onStop={onStopGeneration}
          />
        )}
      </AnimatePresence>

      {/* ================= 1. GOOGLE DOCS STYLE TOP MENU BAR ================= */}
      <div ref={menuRef} className="bg-white border-b border-neutral-200/80 px-2 sm:px-6 py-1 sm:py-2 flex flex-wrap items-center gap-0.5 sm:gap-2 text-xs sm:text-sm font-semibold shrink-0 z-50 select-none">
        {[
          {
            id: "edition", label: "Édition", items: [
              { label: "Annuler (Ctrl+Z)", action: () => editor.chain().focus().undo().run() },
              { label: "Rétablir (Ctrl+Y)", action: () => editor.chain().focus().redo().run() },
              { label: "Tout sélectionner", action: () => editor.chain().focus().selectAll().run() },
              { label: "Effacer le formatage", action: () => editor.chain().focus().clearNodes().unsetAllMarks().run() }
            ]
          },
          {
            id: "affichage", label: "Affichage", items: [
              { label: "Format A4", action: () => handlePageFormatChange("A4") },
              { label: "Format A5", action: () => handlePageFormatChange("A5") },
              { label: "Zoom 75%", action: () => setZoomLevel(75) },
              { label: "Zoom 100%", action: () => setZoomLevel(100) },
              { label: "Zoom 125%", action: () => setZoomLevel(125) },
              { label: "Zoom 150%", action: () => setZoomLevel(150) },
              { label: "Afficher/Masquer la règle", action: () => setShowRuler(!showRuler) }
            ]
          },
          {
            id: "insertion", label: "Insertion", items: [
              { label: "📥 Importer un manuscrit (.docx, .epub)", action: handleImportButtonClick },
              { label: "📄 Saut de page (Ctrl+Enter)", action: handleAddNewPage },
              { label: "🖼️ Image...", action: () => setIsImageModalOpen(true) },
              { label: "📊 Tableau (3 × 3)", action: () => handleInsertTable(3, 3) },
              { label: "🔵 Encadré Info", action: () => handleInsertCallout("info") },
              { label: "🟠 Encadré Attention", action: () => handleInsertCallout("warning") },
              { label: "🟢 Encadré Conseil", action: () => handleInsertCallout("tip") },
              { label: "🟣 Encadré Exemple", action: () => handleInsertCallout("example") },
              { label: "🔢 Chiffre clé", action: handleInsertKeyFigure },
              { label: "💬 Citation en avant", action: handleInsertPullQuote },
              { label: "🅰️ Lettrine (drop cap)", action: handleInsertDropCap },
              { label: "✦ Séparateur étoiles", action: () => handleInsertSectionDivider("stars") },
              { label: "❖ Séparateur ornement", action: () => handleInsertSectionDivider("ornament") },
              { label: "── Séparateur ligne", action: () => handleInsertSectionDivider("line") },
              { label: "••• Séparateur points", action: () => handleInsertSectionDivider("dots") },
              { label: "🔗 Lien hypertexte...", action: () => setIsLinkModalOpen(true) },
              { label: "➖ Ligne horizontale", action: () => editor.chain().focus().setHorizontalRule().run() }
            ]
          }
        ].map((menu) => (
          <div key={menu.id} className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm text-neutral-800 font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap ${activeMenu === menu.id ? "bg-neutral-100 font-bold text-neutral-900" : ""}`}
            >
              {menu.label}
            </button>
            {activeMenu === menu.id && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                {menu.items.map((subItem, idx) => (
                  <button key={idx} onClick={() => { subItem.action(); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-orange-50 hover:text-secondary transition-colors">
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= 2. RICH ICON TOOLBAR ================= */}
      <div className="h-11 sm:h-14 bg-[#EDF2F9]/80 border-b border-neutral-200/90 px-2 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-40 select-none">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Undo / Redo */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-neutral-200/70 text-neutral-700 disabled:opacity-40 flex items-center justify-center transition-colors" title="Annuler (Ctrl+Z)">
            <span className="material-symbols-outlined text-lg">undo</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-neutral-200/70 text-neutral-700 disabled:opacity-40 flex items-center justify-center transition-colors" title="Rétablir (Ctrl+Y)">
            <span className="material-symbols-outlined text-lg">redo</span>
          </button>

          <div className="w-[1px] h-5 sm:h-6 bg-neutral-300 mx-0.5 sm:mx-1"></div>

          {/* Page Format & Zoom */}
          <select 
            value={pageFormat} 
            onChange={(e) => handlePageFormatChange(e.target.value as PageFormatType)} 
            className="bg-white border border-neutral-300 text-xs font-bold px-2 py-1.5 rounded-xl outline-none cursor-pointer shadow-2xs"
            title="Format de page"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
          </select>

          <select 
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(Number(e.target.value))} 
            className="bg-white border border-neutral-300 text-xs font-bold px-2 py-1.5 rounded-xl outline-none cursor-pointer shadow-2xs"
            title="Zoom"
          >
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>

          {/* Block Type */}
          <select 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'p') editor.chain().focus().setParagraph().run();
              else if (val.startsWith('h')) editor.chain().focus().toggleHeading({ level: parseInt(val.charAt(1), 10) as any }).run();
              else if (val === 'blockquote') editor.chain().focus().toggleBlockquote().run();
            }} 
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              editor.isActive('blockquote') ? 'blockquote' : 'p'
            }
            className="bg-white border border-neutral-300 text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer max-w-[125px] shadow-2xs"
            title="Type de bloc"
          >
            <option value="p">Texte normal</option>
            <option value="h1">Titre 1</option>
            <option value="h2">Titre 2</option>
            <option value="h3">Titre 3</option>
            <option value="blockquote">Citation</option>
          </select>

          {/* 21 Google Book Fonts */}
          <select 
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                editor.chain().focus().setFontFamily(val).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }} 
            value={editor.getAttributes('textStyle').fontFamily || ''}
            className="bg-white border border-neutral-300 text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer max-w-[145px] shadow-2xs"
            title="Police d'écriture"
          >
            {/* Bibliothèque complète — toutes ces polices sont embarquées en TTF
                et réellement rendues à l'export PDF (voir fontRegistry). */}
            <option value="">Police par défaut</option>
            {FONT_CATEGORY_ORDER.map((cat) => {
              const fonts = FONTS_BY_CATEGORY[cat];
              if (!fonts || fonts.length === 0) return null;
              return (
                <optgroup key={cat} label={`─── ${cat} ───`}>
                  {fonts.map((f) => (
                    <option key={f.pdf} value={f.css} style={{ fontFamily: f.css }}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          {/* Font Size Stepper: − [16] + */}
          <div className="flex items-center gap-0 mx-1">
            <button
              onClick={() => {
                const current = getFontSize();
                const next = Math.max(8, current - 1);
                (editor.commands as any).setFontSize(`${next}px`);
              }}
              className="px-2 py-1.5 hover:bg-neutral-200 text-neutral-700 rounded-l-xl border border-neutral-300 text-xs font-bold transition-colors"
              title="Diminuer la taille de police"
            >
              −
            </button>
            <input
              type="number"
              min={8}
              max={144}
              value={getFontSize()}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 8 && val <= 144) {
                  (editor.commands as any).setFontSize(`${val}px`);
                }
              }}
              className="w-10 text-center text-xs font-bold py-1.5 border-y border-neutral-300 focus:outline-none focus:ring-1 focus:ring-secondary appearance-none bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              title="Taille de police (px)"
            />
            <button
              onClick={() => {
                const current = getFontSize();
                const next = Math.min(144, current + 1);
                (editor.commands as any).setFontSize(`${next}px`);
              }}
              className="px-2 py-1.5 hover:bg-neutral-200 text-neutral-700 rounded-r-xl border border-neutral-300 text-xs font-bold transition-colors"
              title="Augmenter la taille de police"
            >
              +
            </button>
          </div>

          <div className="w-[1px] h-5 sm:h-6 bg-neutral-300 mx-0.5 sm:mx-1"></div>

          {/* Formatting */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-sm ${editor.isActive('bold') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Gras (Ctrl+B)">B</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center italic font-serif text-sm ${editor.isActive('italic') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Italique (Ctrl+I)">I</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center underline text-sm ${editor.isActive('underline') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Souligné (Ctrl+U)">U</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center line-through text-sm ${editor.isActive('strike') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Barré">S</button>

          {/* Colors */}
          <label className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Couleur du texte">
            <span className="material-symbols-outlined text-lg text-secondary">format_color_text</span>
            <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} className="opacity-0 absolute w-0 h-0" />
          </label>
          <label className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Surlignage">
            <span className="material-symbols-outlined text-lg text-amber-500">ink_highlighter</span>
            <input type="color" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} className="opacity-0 absolute w-0 h-0" />
          </label>

          <div className="w-[1px] h-5 sm:h-6 bg-neutral-300 mx-0.5 sm:mx-1"></div>

          {/* Alignments */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Aligner à gauche"><span className="material-symbols-outlined text-lg">format_align_left</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Centrer"><span className="material-symbols-outlined text-lg">format_align_center</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Aligner à droite"><span className="material-symbols-outlined text-lg">format_align_right</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'justify' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Justifier"><span className="material-symbols-outlined text-lg">format_align_justify</span></button>

          <div className="w-[1px] h-5 sm:h-6 bg-neutral-300 mx-0.5 sm:mx-1"></div>

          {/* Line Height Selector */}
          <select
            value={getLineHeight()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'default') {
                (editor.commands as any).unsetLineHeight();
              } else {
                (editor.commands as any).setLineHeight(val);
              }
            }}
            className="bg-white border border-neutral-300 text-xs font-bold px-2 py-1.5 rounded-xl outline-none cursor-pointer w-[72px] shadow-2xs"
            title="Interligne"
          >
            <option value="default">↕ Auto</option>
            <option value="1">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="1.6">1.6</option>
            <option value="1.8">1.8</option>
            <option value="2">2.0</option>
            <option value="2.5">2.5</option>
            <option value="3">3.0</option>
          </select>

          {/* Lists */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive('bulletList') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Liste à puces"><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${editor.isActive('orderedList') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Liste numérotée"><span className="material-symbols-outlined text-lg">format_list_numbered</span></button>

          <div className="w-[1px] h-5 sm:h-6 bg-neutral-300 mx-0.5 sm:mx-1"></div>

          {/* Inserts */}
          <button onClick={handleImportButtonClick} title="Importer un manuscrit (.docx, .epub)" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-lg">file_upload</span></button>
          <button onClick={() => setIsImageModalOpen(true)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Insérer une image"><span className="material-symbols-outlined text-lg">image</span></button>
          <button onClick={() => setIsLinkModalOpen(true)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Insérer un lien"><span className="material-symbols-outlined text-lg">link</span></button>
          <div className="relative" ref={tablePickerBtnRef}>
            <button onClick={() => {
              const next = !showTablePicker;
              if (next && tablePickerBtnRef.current) {
                const rect = tablePickerBtnRef.current.getBoundingClientRect();
                const pickerWidth = 222;
                setTablePickerPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - pickerWidth) });
              }
              setShowTablePicker(next);
            }} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors ${showTablePicker ? "bg-orange-100/70 text-secondary" : ""}`} title="Insérer un tableau"><span className="material-symbols-outlined text-lg">table_chart</span></button>
            {showTablePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowTablePicker(false); setTableHover({ rows: 0, cols: 0 }); }} />
                <div className="fixed z-50 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3" style={tablePickerPos}>
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(10, 18px)" }} onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}>
                    {Array.from({ length: 8 }).map((_, r) =>
                      Array.from({ length: 10 }).map((_, c) => {
                        const active = r < tableHover.rows && c < tableHover.cols;
                        return (
                          <button
                            key={`${r}-${c}`}
                            onMouseEnter={() => setTableHover({ rows: r + 1, cols: c + 1 })}
                            onClick={() => handleInsertTable(r + 1, c + 1)}
                            className={`w-[18px] h-[18px] rounded-[3px] border transition-colors ${active ? "bg-secondary border-secondary" : "bg-neutral-50 border-neutral-200 hover:border-secondary/50"}`}
                          />
                        );
                      })
                    )}
                  </div>
                  <div className="mt-2 text-center text-xs font-bold text-neutral-600">
                    {tableHover.rows > 0 ? `${tableHover.cols} × ${tableHover.rows}` : "Glissez pour choisir"}
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={handleAddNewPage} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Saut de page"><span className="material-symbols-outlined text-lg">post_add</span></button>
        </div>
      </div>

      {/* ================= 3. RULER BAR ================= */}
      {showRuler && (
        <div className="h-6 bg-neutral-100 border-b border-neutral-200 hidden sm:flex items-center justify-center shrink-0 select-none overflow-hidden">
          <div className="max-w-[794px] w-full flex items-center justify-between text-[9px] font-mono text-neutral-400 px-4">
            <span>| 1</span><span>| 2</span><span>| 3</span><span>| 4</span><span>| 5</span><span>| 6</span><span>| 7</span><span>| 8</span><span>| 9</span><span>| 10</span><span>| 11</span><span>| 12</span><span>| 13</span><span>| 14</span><span>| 15</span><span>| 16</span>
          </div>
        </div>
      )}

      {/* ================= 4. EDITOR CANVAS WITH TIPTAP PRO PAGES ================= */}
      <div className="editor-scroll-container relative flex-1 overflow-y-auto overflow-x-auto flex flex-col items-center bg-[#F3F4F6] p-2 sm:p-8">
        
        <div 
          className="relative z-10 w-full transition-transform duration-150 flex flex-col items-center"
          ref={editorContainerRef}
          style={{ 
            transform: `scale(${zoomLevel / 100})`, 
            transformOrigin: "top center",
            marginBottom: zoomLevel > 100 ? `${((zoomLevel - 100) / 100) * 1123}px` : undefined,
          }}
        >
          {/* Contextual AI BubbleMenu */}
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{
                placement: 'top',
                offset: [0, typeof window !== "undefined" && window.innerWidth < 768 ? 65 : 8]
              }}
              className="flex flex-col bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-2xl rounded-2xl px-2 py-1.5 z-50 overflow-hidden max-w-[92vw]"
            >
              <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => handleContextualAction("reformuler")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-secondary hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                Reformuler
              </button>
              <div className="w-[1px] h-4 bg-neutral-200"></div>
              <button
                onClick={() => handleContextualAction("enrichir")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-secondary hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Enrichir
              </button>
              <div className="w-[1px] h-4 bg-neutral-200"></div>
              <button
                onClick={() => handleContextualAction("etendre")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-secondary hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Étendre
              </button>
              <div className="w-[1px] h-4 bg-neutral-200"></div>
              <button
                onClick={() => handleContextualAction("corriger")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-secondary hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">spellcheck</span>
                Corriger
              </button>

              {onContextualAiAction && (
                <>
                  <div className="w-[1px] h-4 bg-neutral-200"></div>
                  <button
                    onClick={openInlineAi}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Donner une instruction libre à Iris sur ce passage"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                    Iris
                  </button>
                </>
              )}

              {onSendSelectionToChat && (
                <>
                  <div className="w-[1px] h-4 bg-neutral-200"></div>
                  <button
                    onClick={handleSendToChat}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-secondary hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
                    title="Envoyer ce passage au chat Iris pour le modifier"
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                    Envoyer au chat
                  </button>
                </>
              )}
              </div>

              {showInlineAi && (
                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-neutral-200/80">
                  <input
                    autoFocus
                    value={inlineInstruction}
                    onChange={(e) => setInlineInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCustomInlineAction(); }
                      if (e.key === "Escape") { setShowInlineAi(false); pendingSelRef.current = null; }
                    }}
                    placeholder="Que faire de ce passage ? (ex: rends-le plus percutant)"
                    className="flex-1 min-w-[220px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-secondary text-neutral-900"
                  />
                  <button
                    onClick={handleCustomInlineAction}
                    disabled={isAiLoading || !inlineInstruction.trim()}
                    className="bg-secondary text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1"
                    title="Appliquer"
                  >
                    {isAiLoading
                      ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      : <span className="material-symbols-outlined text-[16px]">send</span>}
                  </button>
                </div>
              )}
            </BubbleMenu>
          )}
          
          <EditorContent 
            editor={editor} 
            className="manuscript-page-editor w-full flex justify-center focus:outline-none"
          />

          {/* 21 Google Fonts Stylesheet and TipTap Pro Pages CSS */}
          <style dangerouslySetInnerHTML={{__html: `
            @import url('${GOOGLE_FONTS_IMPORT}');
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

            .tiptap-page {
              background-color: white;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
              margin-bottom: 2rem;
              border: 1px solid #e5e7eb;
              margin-left: auto;
              margin-right: auto;
              box-sizing: border-box;
            }

            .tiptap:focus {
              outline: none;
            }

            .tiptap a {
              color: #2563eb;
              text-decoration: underline;
              cursor: pointer;
            }

            .tiptap p, .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5 {
              line-height: 1.6;
              margin-bottom: 0.5em;
            }

            .tiptap h1 {
              font-size: 2.2em;
              font-weight: 800;
              margin-top: 0.6em;
              margin-bottom: 0.4em;
            }

            .tiptap h2 {
              font-size: 1.6em;
              font-weight: 700;
              margin-top: 0.8em;
              margin-bottom: 0.4em;
            }

            .tiptap h3 {
              font-size: 1.3em;
              font-weight: 700;
              margin-top: 0.9em;
              margin-bottom: 0.3em;
            }

            .tiptap blockquote {
              border-left: 3px solid #cbd5e1;
              padding-left: 1rem;
              margin-left: 0;
              margin-right: 0;
              font-style: italic;
              color: #475569;
            }

            /* Encadrés / Callouts */
            .tiptap .callout {
              border-left: 4px solid #94a3b8;
              border-radius: 8px;
              padding: 12px 16px;
              margin: 1.25rem 0;
              background: #f1f5f9;
            }
            .tiptap .callout > *:first-child { margin-top: 0; }
            .tiptap .callout > *:last-child { margin-bottom: 0; }
            .tiptap .callout::before {
              display: block;
              font-size: 0.7rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 6px;
            }
            .tiptap .callout-info { background: #eff6ff; border-left-color: #3b82f6; }
            .tiptap .callout-info::before { content: "ℹ️ Info"; color: #1d4ed8; }
            .tiptap .callout-warning { background: #fff7ed; border-left-color: #f97316; }
            .tiptap .callout-warning::before { content: "⚠️ Attention"; color: #c2410c; }
            .tiptap .callout-tip { background: #f0fdf4; border-left-color: #22c55e; }
            .tiptap .callout-tip::before { content: "💡 Conseil"; color: #15803d; }
            .tiptap .callout-example { background: #faf5ff; border-left-color: #a855f7; }
            .tiptap .callout-example::before { content: "📌 Exemple"; color: #7e22ce; }

            /* Chiffre clé / Key Figure */
            .tiptap .key-figure {
              text-align: center;
              padding: 24px 20px;
              margin: 1.5rem auto;
              max-width: 320px;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border-radius: 12px;
              font-size: 1.5rem;
              font-weight: 800;
              color: #92400e;
              border: 2px solid #f59e0b;
              line-height: 1.3;
            }

            /* Citation en avant / Pull Quote */
            .tiptap .pull-quote {
              text-align: center;
              font-size: 1.25rem;
              font-style: italic;
              color: #334155;
              padding: 20px 32px;
              margin: 1.5rem 2rem;
              border-top: 2px solid #cbd5e1;
              border-bottom: 2px solid #cbd5e1;
              position: relative;
              line-height: 1.6;
            }
            .tiptap .pull-quote::before {
              content: "\\201C";
              position: absolute;
              top: -18px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 3rem;
              color: #94a3b8;
              background: white;
              padding: 0 8px;
              line-height: 1;
              font-style: normal;
            }

            /* Lettrine / Drop Cap */
            .tiptap .drop-cap::first-letter {
              float: left;
              font-size: 3.8em;
              line-height: 0.8;
              padding-right: 8px;
              padding-top: 4px;
              font-weight: 700;
              color: #1e293b;
            }
            .tiptap .drop-cap {
              margin: 1rem 0;
              line-height: 1.6;
            }

            /* Séparateur décoratif / Section Divider */
            .tiptap .section-divider {
              text-align: center;
              padding: 12px 0;
              margin: 1.5rem 0;
              user-select: none;
              font-size: 1.2rem;
              color: #94a3b8;
              letter-spacing: 0.5em;
              cursor: default;
            }
            .tiptap .section-divider-stars::before { content: "* * *"; }
            .tiptap .section-divider-ornament::before { content: "❖ ❖ ❖"; }
            .tiptap .section-divider-line::before { content: "─────────────"; letter-spacing: 0; }
            .tiptap .section-divider-dots::before { content: "• • • • •"; }

            .tiptap ul {
              list-style-type: disc;
              padding-left: 1.5rem;
              margin-bottom: 0.5rem;
            }

            .tiptap ol {
              list-style-type: decimal;
              padding-left: 1.5rem;
              margin-bottom: 0.5rem;
            }

            .tiptap table {
              width: 100%;
              border-collapse: collapse;
              margin: 1.5rem 0;
            }

            .tiptap th, .tiptap td {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
            }

            .tiptap th {
              background-color: #f8fafc;
              font-weight: bold;
            }
          ` }} />
        </div>
      </div>

      {/* ================= FLOATING AI BUTTON (contextuel) ================= */}
      {/* Un SEUL bouton flottant, dont le rôle dépend de la vue :
          - vue livre complet / sommaire  → « Générer tout le livre »
          - vue d'un chapitre découpé      → « Générer le chapitre » (popup d'instructions) */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 flex flex-col gap-3 z-30">
        {bookViewMode === "chapter" && onGenerateChapter ? (
          <button
            onClick={onGenerateChapter}
            disabled={isGenerating}
            className={`bg-secondary hover:bg-orange-600 text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-3 sm:py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 group cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Rédiger ou modifier uniquement ce chapitre avec l'IA"
          >
            <span className={`material-symbols-outlined text-lg sm:text-xl ${isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
              {isGenerating ? 'sync' : 'auto_fix_high'}
            </span>
            <span>{isGenerating ? "Génération..." : "Générer le chapitre"}</span>
          </button>
        ) : onGenerateWholeBook ? (
          <button
            onClick={onGenerateWholeBook}
            disabled={isGenerating}
            className={`bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-3 sm:py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 group cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Rédiger automatiquement tout le livre à partir du sommaire"
          >
            <span className={`material-symbols-outlined text-lg sm:text-xl ${isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
              {isGenerating ? 'sync' : 'auto_stories'}
            </span>
            <span>{isGenerating ? "Génération..." : "Générer tout le livre"}</span>
          </button>
        ) : null}
      </div>

      {/* Hidden Manuscript Input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".docx,.epub,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {/* ================= MODALS ================= */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 max-h-[85dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="font-heading font-extrabold text-lg text-neutral-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">image</span>
                <span>Insérer une Image</span>
              </h3>
              <button onClick={() => setIsImageModalOpen(false)} className="text-neutral-400 hover:text-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              <label className="w-full border-2 border-dashed border-neutral-300 hover:border-secondary bg-neutral-50 hover:bg-orange-50/50 p-5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
                <span className="material-symbols-outlined text-3xl text-secondary mb-1">upload_file</span>
                <span className="text-xs font-bold text-neutral-800">Cliquer pour choisir un fichier image</span>
                <input type="file" accept="image/*" onChange={handleLocalFileUpload} className="hidden" />
              </label>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">Lien Web URL</label>
              <input type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="https://exemple.com/image.jpg" className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100">Annuler</button>
              <button onClick={() => insertImageIntoDOM(imageUrlInput)} className="bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs">Insérer l&apos;image</button>
            </div>
          </div>
        </div>
      )}

      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-extrabold text-lg text-neutral-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">link</span>
                <span>Insérer un Lien</span>
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-neutral-400 hover:text-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" value={linkTextInput} onChange={(e) => setLinkTextInput(e.target.value)} placeholder="Texte du lien" className="w-full px-4 py-2 rounded-xl border border-neutral-200 text-xs font-medium outline-none" />
              <input type="text" value={linkUrlInput} onChange={(e) => setLinkUrlInput(e.target.value)} placeholder="URL (https://...)" className="w-full px-4 py-2 rounded-xl border border-neutral-200 text-xs font-medium outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600">Annuler</button>
              <button onClick={handleInsertLinkSubmit} className="bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RichManuscriptEditor.displayName = "RichManuscriptEditor";

export default RichManuscriptEditor;
