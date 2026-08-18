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

import { ConvertKit } from '@tiptap-pro/extension-convert-kit';
import { TableKit } from '@tiptap-pro/extension-pages-tablekit';
import { Pages } from '@tiptap-pro/extension-pages';

import { FontSize } from './editor/FontSizeExtension';
import { LineHeight } from './editor/LineHeightExtension';
import { ResizableImage } from './editor/ResizableImageExtension';
import { RichManuscriptEditorHandle, RichManuscriptEditorProps, PageFormatType } from './editor/types';

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
      onContextualAiAction,
      isGenerating = false,
      onFileSelected,
    },
    ref
  ) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
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

  const menuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleInsertTable = () => {
    if (!editor) return;
    if ((editor.commands as any).insertTable) {
      (editor.commands as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    } else {
      const tableHTML = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête 1</th>
              <th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 1</td>
              <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 2</td>
            </tr>
          </tbody>
        </table>
        <p><br></p>
      `;
      editor.chain().focus().insertContent(tableHTML).run();
    }
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
      {/* ================= 1. GOOGLE DOCS STYLE TOP MENU BAR ================= */}
      <div ref={menuRef} className="bg-white border-b border-neutral-200/80 px-6 py-2 flex items-center gap-2 text-sm font-semibold shrink-0 z-20 select-none">
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
              { label: "📊 Tableau", action: handleInsertTable },
              { label: "🔗 Lien hypertexte...", action: () => setIsLinkModalOpen(true) },
              { label: "➖ Ligne horizontale", action: () => editor.chain().focus().setHorizontalRule().run() }
            ]
          }
        ].map((menu) => (
          <div key={menu.id} className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
              className={`px-3 py-1.5 rounded-lg text-sm text-neutral-800 font-semibold hover:bg-neutral-100 transition-colors ${activeMenu === menu.id ? "bg-neutral-100 font-bold text-neutral-900" : ""}`}
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
      <div className="h-14 bg-[#EDF2F9]/80 border-b border-neutral-200/90 px-6 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-10 select-none">
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="w-8 h-8 rounded-xl hover:bg-neutral-200/70 text-neutral-700 disabled:opacity-40 flex items-center justify-center transition-colors" title="Annuler (Ctrl+Z)">
            <span className="material-symbols-outlined text-lg">undo</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="w-8 h-8 rounded-xl hover:bg-neutral-200/70 text-neutral-700 disabled:opacity-40 flex items-center justify-center transition-colors" title="Rétablir (Ctrl+Y)">
            <span className="material-symbols-outlined text-lg">redo</span>
          </button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

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
            <option value="">Police par défaut</option>
            <optgroup label="─── Sans-Serif ───">
              <option value="Inter" style={{fontFamily:'Inter'}}>Inter</option>
              <option value="Outfit" style={{fontFamily:'Outfit'}}>Outfit</option>
              <option value="Roboto" style={{fontFamily:'Roboto'}}>Roboto</option>
              <option value="Open Sans" style={{fontFamily:'Open Sans'}}>Open Sans</option>
              <option value="Lato" style={{fontFamily:'Lato'}}>Lato</option>
              <option value="Montserrat" style={{fontFamily:'Montserrat'}}>Montserrat</option>
              <option value="Poppins" style={{fontFamily:'Poppins'}}>Poppins</option>
              <option value="Raleway" style={{fontFamily:'Raleway'}}>Raleway</option>
              <option value="Nunito" style={{fontFamily:'Nunito'}}>Nunito</option>
            </optgroup>
            <optgroup label="─── Serif (Livres) ───">
              <option value="Georgia, serif" style={{fontFamily:'Georgia'}}>Georgia</option>
              <option value="Lora" style={{fontFamily:'Lora'}}>Lora</option>
              <option value="Merriweather" style={{fontFamily:'Merriweather'}}>Merriweather</option>
              <option value="Playfair Display" style={{fontFamily:'Playfair Display'}}>Playfair Display</option>
              <option value="PT Serif" style={{fontFamily:'PT Serif'}}>PT Serif</option>
              <option value="Source Serif 4" style={{fontFamily:'Source Serif 4'}}>Source Serif</option>
              <option value="Crimson Text" style={{fontFamily:'Crimson Text'}}>Crimson Text</option>
              <option value="EB Garamond" style={{fontFamily:'EB Garamond'}}>EB Garamond</option>
              <option value="Libre Baskerville" style={{fontFamily:'Libre Baskerville'}}>Libre Baskerville</option>
              <option value="Cormorant Garamond" style={{fontFamily:'Cormorant Garamond'}}>Cormorant Garamond</option>
              <option value="Times New Roman, serif">Times New Roman</option>
            </optgroup>
            <optgroup label="─── Manuscrites ───">
              <option value="Dancing Script" style={{fontFamily:'Dancing Script'}}>Dancing Script</option>
              <option value="Pacifico" style={{fontFamily:'Pacifico'}}>Pacifico</option>
              <option value="Caveat" style={{fontFamily:'Caveat'}}>Caveat</option>
            </optgroup>
            <optgroup label="─── Monospace ───">
              <option value="Fira Code" style={{fontFamily:'Fira Code'}}>Fira Code</option>
              <option value="JetBrains Mono" style={{fontFamily:'JetBrains Mono'}}>JetBrains Mono</option>
              <option value="monospace">Monospace</option>
            </optgroup>
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

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Formatting */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${editor.isActive('bold') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Gras (Ctrl+B)">B</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center italic font-serif text-sm ${editor.isActive('italic') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Italique (Ctrl+I)">I</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center underline text-sm ${editor.isActive('underline') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Souligné (Ctrl+U)">U</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center line-through text-sm ${editor.isActive('strike') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`} title="Barré">S</button>

          {/* Colors */}
          <label className="w-8 h-8 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Couleur du texte">
            <span className="material-symbols-outlined text-lg text-secondary">format_color_text</span>
            <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} className="opacity-0 absolute w-0 h-0" />
          </label>
          <label className="w-8 h-8 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Surlignage">
            <span className="material-symbols-outlined text-lg text-amber-500">ink_highlighter</span>
            <input type="color" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} className="opacity-0 absolute w-0 h-0" />
          </label>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Alignments */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Aligner à gauche"><span className="material-symbols-outlined text-lg">format_align_left</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Centrer"><span className="material-symbols-outlined text-lg">format_align_center</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Aligner à droite"><span className="material-symbols-outlined text-lg">format_align_right</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'justify' }) ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Justifier"><span className="material-symbols-outlined text-lg">format_align_justify</span></button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

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
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive('bulletList') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Liste à puces"><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`w-8 h-8 rounded-xl flex items-center justify-center ${editor.isActive('orderedList') ? 'bg-neutral-300 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`} title="Liste numérotée"><span className="material-symbols-outlined text-lg">format_list_numbered</span></button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Inserts */}
          <button onClick={handleImportButtonClick} title="Importer un manuscrit (.docx, .epub)" className="w-8 h-8 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-lg">file_upload</span></button>
          <button onClick={() => setIsImageModalOpen(true)} className="w-8 h-8 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Insérer une image"><span className="material-symbols-outlined text-lg">image</span></button>
          <button onClick={() => setIsLinkModalOpen(true)} className="w-8 h-8 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Insérer un lien"><span className="material-symbols-outlined text-lg">link</span></button>
          <button onClick={handleInsertTable} className="w-8 h-8 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Insérer un tableau"><span className="material-symbols-outlined text-lg">table_chart</span></button>
          <button onClick={handleAddNewPage} className="w-8 h-8 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center transition-colors" title="Saut de page"><span className="material-symbols-outlined text-lg">post_add</span></button>
        </div>
      </div>

      {/* ================= 3. RULER BAR ================= */}
      {showRuler && (
        <div className="h-6 bg-neutral-100 border-b border-neutral-200 flex items-center justify-center shrink-0 select-none overflow-hidden">
          <div className="max-w-[794px] w-full flex items-center justify-between text-[9px] font-mono text-neutral-400 px-4">
            <span>| 1</span><span>| 2</span><span>| 3</span><span>| 4</span><span>| 5</span><span>| 6</span><span>| 7</span><span>| 8</span><span>| 9</span><span>| 10</span><span>| 11</span><span>| 12</span><span>| 13</span><span>| 14</span><span>| 15</span><span>| 16</span>
          </div>
        </div>
      )}

      {/* ================= 4. EDITOR CANVAS WITH TIPTAP PRO PAGES ================= */}
      <div className="editor-scroll-container flex-1 overflow-y-auto flex flex-col items-center bg-[#F3F4F6] p-4 sm:p-8">
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
              className="flex bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-2xl rounded-2xl px-2 py-1.5 items-center gap-1 z-50 overflow-hidden"
            >
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
            </BubbleMenu>
          )}
          
          <EditorContent 
            editor={editor} 
            className="manuscript-page-editor w-full flex justify-center focus:outline-none"
          />

          {/* 21 Google Fonts Stylesheet and TipTap Pro Pages CSS */}
          <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,700;1,400&family=Open+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Nunito:wght@300;400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400;700&family=Pacifico&family=Caveat:wght@400;700&family=Fira+Code:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');

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

      {/* ================= FLOATING AI BUTTONS ================= */}
      <div className="absolute bottom-6 right-8 flex flex-col gap-3 z-30">
        {/* Si le chapitre est vide ou très court, on propose de tout générer */}
        {wordCount < 20 && onGenerateFullChapter && (
          <button 
            onClick={onGenerateFullChapter} 
            disabled={isGenerating}
            className={`bg-secondary hover:bg-orange-600 text-white font-bold text-sm px-6 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 group cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`material-symbols-outlined text-xl ${isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
              {isGenerating ? 'sync' : 'magic_button'}
            </span>
            <span>{isGenerating ? "Génération..." : "Rédiger avec l'IA"}</span>
          </button>
        )}

        {/* Continuer la rédaction avec l'IA (si déjà du contenu) */}
        {wordCount >= 20 && onContinueWithAi && (
          <button 
            onClick={onContinueWithAi} 
            disabled={isGenerating}
            className="bg-white border-2 border-secondary/20 hover:border-secondary text-secondary hover:bg-orange-50 font-bold text-sm px-6 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">auto_awesome</span>
            <span>Continuer avec l&apos;IA</span>
          </button>
        )}
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
