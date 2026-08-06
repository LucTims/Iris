"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Node, Extension, mergeAttributes } from '@tiptap/core';
import { PaginationPlus } from 'tiptap-pagination-plus';

// --- CUSTOM EXTENSIONS ---

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: 'hr[data-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-page-break': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper>
          <div contentEditable={false} className="w-[calc(100%+8rem)] -ml-16 my-16 h-16 bg-[#F9FAFB] border-y border-neutral-200 flex items-center justify-center select-none shadow-inner">
            <span className="text-xs font-mono font-bold text-neutral-400 tracking-widest">NOUVELLE PAGE</span>
          </div>
        </NodeViewWrapper>
      );
    });
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }: any) => {
        return chain().insertContent({ type: this.name }).run();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: any) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

const Highlight = Extension.create({
  name: 'highlight',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: element => element.style.backgroundColor?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.backgroundColor) return {};
              return { style: `background-color: ${attributes.backgroundColor}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setHighlight: (backgroundColor: any) => ({ chain }: any) => {
        return chain().setMark('textStyle', { backgroundColor }).run();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});


// --- A4 PAGINATION CONSTANTS ---
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_GAP_PX = 40;

interface RichManuscriptEditorProps {
  initialContent?: string;
  chapterTitle?: string;
  onTitleChange?: (newTitle: string) => void;
  onContentChange?: (newContent: string) => void;
  onWordCountChange?: (count: number) => void;
  onContinueWithAi?: () => void;
  onGenerateFullChapter?: () => void;
  onContextualAiAction?: (actionType: string, selectedText: string) => Promise<string>;
  isGenerating?: boolean;
  onFileSelected?: (file: File) => void;
}

export default function RichManuscriptEditor({
  initialContent = "",
  chapterTitle = "Chapitre 1 : L'Ombre du Baobab",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTitleChange,
  onContentChange,
  onWordCountChange,
  onContinueWithAi,
  onGenerateFullChapter,
  onContextualAiAction,
  isGenerating = false,
  onFileSelected,
}: RichManuscriptEditorProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);

  // Modals & Inserters
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkTextInput, setLinkTextInput] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Default content
  const defaultContent = initialContent || "";

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      PaginationPlus.configure({
        pageHeight: A4_HEIGHT_PX,
        pageWidth: A4_WIDTH_PX,
        pageGap: PAGE_GAP_PX,
        pageGapBorderSize: 1,
        pageGapBorderColor: "#e5e5e5",
        pageBreakBackground: "#f3f4f6",
        marginTop: 60,
        marginBottom: 60,
        marginLeft: 60,
        marginRight: 60,
        contentMarginTop: 10,
        contentMarginBottom: 10,
        headerLeft: "<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>IRIS MANUSCRIT</span>",
        headerRight: `<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>${chapterTitle || "Chapitre"}</span>`,
        footerLeft: `<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>${wordCount} mots</span>`,
        footerRight: "<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>Page {page} sur {total}</span>"
      }),
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight,
      PageBreak,
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'editor-image border rounded-sm' } }),
      Link.configure({ openOnClick: true, HTMLAttributes: { class: 'text-secondary underline cursor-pointer' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: defaultContent,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      if (onWordCountChange) onWordCountChange(words);
      if (onContentChange) onContentChange(editor.getHTML());
    },
  });

  // Update word count dynamically
  useEffect(() => {
    if (!editor) return;
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [editor?.getText()]);

  // Update PaginationPlus headers and footers dynamically
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any)
      .updateHeaderContent(
        "<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>IRIS MANUSCRIT</span>", 
        `<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>${chapterTitle || "Chapitre"}</span>`
      )
      .updateFooterContent(
        `<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>${wordCount} mots</span>`, 
        "<span style='font-size: 10px; font-weight: bold; color: #9ca3af;'>Page {page} sur {total}</span>"
      )
      .run();
  }, [editor, chapterTitle, wordCount]);

  useEffect(() => {
    if (!editor) return;
    // Ne pas utiliser `initialContent &&` ici : une chaîne vide ("") est une valeur
    // légitime (nouveau chapitre vide) et doit quand même vider l'éditeur. L'ancienne
    // garde ignorait ce cas, donc l'éditeur gardait affiché l'ancien contenu (démo ou
    // projet précédent) alors que le reste de l'interface (compteur de mots, etc.)
    // reflétait déjà le vrai contenu, vide, du nouveau chapitre.
    const nextContent = initialContent ?? "";
    if (nextContent !== editor.getHTML()) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

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
    if (editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.chain().focus() as any).setPageBreak().run();
    }
  };

  const [isAiLoading, setIsAiLoading] = useState(false);

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

  if (!editor) {
    return null; // or a loader
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
              { label: "Zoom 100%", action: () => setZoomLevel(100) },
              { label: "Zoom 125%", action: () => setZoomLevel(125) },
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
        <div className="flex items-center gap-2">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-xl">undo</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-xl">redo</span>
          </button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Zoom & Block Type */}
          <select value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer shadow-2xs">
            <option value={75}>75%</option><option value={100}>100%</option><option value={125}>125%</option>
          </select>

          <select onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            else if (val.startsWith('h')) editor.chain().focus().toggleHeading({ level: parseInt(val.charAt(1)) as any }).run();
            else if (val === 'blockquote') editor.chain().focus().toggleBlockquote().run();
          }} className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[130px] shadow-2xs">
            <option value="p">Texte normal</option>
            <option value="h1">Titre 1</option>
            <option value="h2">Titre 2</option>
            <option value="blockquote">Citation</option>
          </select>

          {/* Font Family */}
          <select onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[120px] shadow-2xs">
            <option value="Outfit">Outfit</option>
            <option value="Georgia">Georgia</option>
            <option value="Inter">Inter</option>
          </select>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Formatting */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base ${editor.isActive('bold') ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`}>B</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-9 h-9 rounded-xl flex items-center justify-center italic font-serif text-base ${editor.isActive('italic') ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`}>I</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={`w-9 h-9 rounded-xl flex items-center justify-center underline text-base ${editor.isActive('underline') ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`}>U</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={`w-9 h-9 rounded-xl flex items-center justify-center line-through text-base ${editor.isActive('strike') ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-900'}`}>S</button>

          {/* Colors */}
          <label className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative">
            <span className="material-symbols-outlined text-xl text-secondary">format_color_text</span>
            <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} className="opacity-0 absolute w-0 h-0" />
          </label>
          <label className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative">
            <span className="material-symbols-outlined text-xl text-amber-500">ink_highlighter</span>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <input type="color" onChange={(e) => (editor.chain().focus() as any).setHighlight(e.target.value).run()} className="opacity-0 absolute w-0 h-0" />
          </label>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Inserts */}
          <button onClick={handleImportButtonClick} title="Importer un manuscrit (.docx, .epub)" className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center"><span className="material-symbols-outlined text-xl">file_upload</span></button>
          <button onClick={() => setIsImageModalOpen(true)} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center"><span className="material-symbols-outlined text-xl">image</span></button>
          <button onClick={() => setIsLinkModalOpen(true)} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center"><span className="material-symbols-outlined text-xl">link</span></button>
          <button onClick={handleAddNewPage} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center"><span className="material-symbols-outlined text-xl">post_add</span></button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Alignments */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`w-9 h-9 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`}><span className="material-symbols-outlined text-xl">format_align_left</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`w-9 h-9 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`}><span className="material-symbols-outlined text-xl">format_align_center</span></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`w-9 h-9 rounded-xl flex items-center justify-center ${editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-200 text-black' : 'hover:bg-neutral-200/70 text-neutral-700'}`}><span className="material-symbols-outlined text-xl">format_align_right</span></button>
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

      {/* ================= 4. EDITOR CANVAS WITH A4 PAGINATION OVERLAY ================= */}
      <div className="editor-scroll-container flex-1 overflow-y-auto flex flex-col items-center bg-[#F3F4F6]">
        <div 
          className="relative z-10 w-full transition-transform duration-150 relative"
          ref={editorContainerRef}
          style={{ 
            transform: `scale(${zoomLevel / 100})`, 
            transformOrigin: "top center",
          }}
        >
          {editor && (
            <BubbleMenu editor={editor} className="flex bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-full px-2 py-1 items-center gap-1 z-50 overflow-hidden">
              <button
                onClick={() => handleContextualAction("reformuler")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-secondary hover:bg-white/80 rounded-full transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                Reformuler
              </button>
              <div className="w-[1px] h-4 bg-neutral-300"></div>
              <button
                onClick={() => handleContextualAction("enrichir")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-secondary hover:bg-white/80 rounded-full transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Enrichir
              </button>
              <div className="w-[1px] h-4 bg-neutral-300"></div>
              <button
                onClick={() => handleContextualAction("etendre")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-secondary hover:bg-white/80 rounded-full transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Étendre
              </button>
              <div className="w-[1px] h-4 bg-neutral-300"></div>
              <button
                onClick={() => handleContextualAction("corriger")}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-secondary hover:bg-white/80 rounded-full transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">spellcheck</span>
                Corriger
              </button>
            </BubbleMenu>
          )}
          
          <EditorContent 
            editor={editor} 
            className="manuscript-page-editor prose prose-neutral max-w-none focus:outline-none"
          />

          <style dangerouslySetInnerHTML={{__html: `
            .ProseMirror { word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; }
            .ProseMirror:focus { outline: none; }
            /* Styling des pages générées par PaginationPlus */
            .ProseMirror > div { 
              background-color: white; 
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              margin: 0 auto;
            }
            .ProseMirror p { margin-bottom: 1em; line-height: 1.6; }
            .ProseMirror h1 { font-size: 2.25em; font-weight: 800; margin-bottom: 0.5em; line-height: 1.2; }
            .ProseMirror h2 { font-size: 1.8em; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; }
            .ProseMirror img { max-width: 100%; height: auto; display: block; margin: 1.5em auto; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          `}} />
        </div>

      </div>

      {/* ================= FLOATING AI BUTTONS ================= */}
      <div className="absolute bottom-6 right-8 flex flex-col gap-3 z-30">
        {/* Si le chapitre est vide ou très court, on propose de tout générer */}
        {editor.getText().trim().split(/\s+/).length < 20 && onGenerateFullChapter && (
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
        {editor.getText().trim().split(/\s+/).length >= 20 && onContinueWithAi && (
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
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
}
