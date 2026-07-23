"use client";

import { useState, useRef, useEffect } from "react";

interface PageData {
  id: number;
  number: number;
  content: string;
}

interface RichManuscriptEditorProps {
  initialContent?: string;
  chapterTitle?: string;
  onTitleChange?: (newTitle: string) => void;
  onContentChange?: (newContent: string) => void;
  onWordCountChange?: (count: number) => void;
  onContinueWithAi?: () => void;
}

export default function RichManuscriptEditor({
  initialContent = "",
  chapterTitle = "Chapitre 1 : L'Ombre du Baobab",
  onTitleChange,
  onContentChange,
  onWordCountChange,
  onContinueWithAi
}: RichManuscriptEditorProps) {
  // Active Menus Dropdown State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Formatting Bar State
  const [fontFamily, setFontFamily] = useState("Outfit");
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#171717");
  const [highlightColor, setHighlightColor] = useState("transparent");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showRuler, setShowRuler] = useState(true);

  // Modals & Inserters
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkTextInput, setLinkTextInput] = useState("");

  // Selected Image for Interactive Resizing
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState(480);
  const [imageAlignment, setImageAlignment] = useState<"left" | "center" | "right">("center");
  const [isResizingImage, setIsResizingImage] = useState(false);

  // Multi-Page Stack State (Real Word / Google Docs multi-sheet stack)
  // Store only IDs in state to avoid re-rendering contentEditable on every keystroke
  const [pages, setPages] = useState([{ id: 1, number: 1 }]);
  
  // Store content in a ref to prevent cursor jumping
  const pagesContentRef = useRef<{ [key: number]: string }>({
    1: initialContent 
      ? (initialContent.includes('<h1') ? initialContent : `<h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; outline: none;">${chapterTitle}</h1>` + initialContent)
      : `<h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; outline: none;">${chapterTitle}</h1>
      <p>Le soleil de midi écrasait le Mandé d'une chaleur de plomb, transformant l'horizon en un miroir frémissant où se confondaient la terre rouge et le ciel de nacre. Sous le grand baobab qui veillait sur Niani depuis des générations, le silence n'était troublé que par le bourdonnement lancinant des insectes et le souffle court d'un enfant qui refusait de s'avouer vaincu.</p>
      <p>Soundiata, les jambes inertes mais le regard embrasé d'une volonté farouche, fixait la branche basse de l'arbre séculaire. Pour beaucoup, il n'était qu'un fils infirme, un prince sans royaume intérieur. Mais dans le secret de son âme, une force commencait à gronder, plus puissante que les armées de son demi-frère Dankaran Touman.</p>
    `
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Save current selection range before opening modals
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0);
    }
  };

  // Close Top Dropdown Menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update Word Count & Notify Parent
  const updateWordCount = () => {
    let totalText = "";
    pages.forEach((p) => {
      totalText += " " + (pagesContentRef.current[p.id] ? pagesContentRef.current[p.id].replace(/<[^>]*>/g, " ") : "");
    });
    
    // Extract title dynamically from the first page's h1 or first text line
    if (pagesContentRef.current[1] && onTitleChange) {
       const div = document.createElement("div");
       div.innerHTML = pagesContentRef.current[1];
       const h1 = div.querySelector("h1");
       if (h1 && h1.innerText.trim()) {
           onTitleChange(h1.innerText.trim());
       } else {
           const firstLine = div.innerText.trim().split('\n')[0];
           if (firstLine) onTitleChange(firstLine.substring(0, 50));
       }
    }

    const words = totalText.trim() ? totalText.trim().split(/\s+/).length : 0;
    if (onWordCountChange) onWordCountChange(words);
    if (onContentChange) onContentChange(Object.values(pagesContentRef.current).join(""));
  };

  // Add New Page (Ctrl+Enter or Saut de Page button)
  const handleAddNewPage = () => {
    const newPageNum = pages.length + 1;
    const newId = Date.now();
    pagesContentRef.current[newId] = `<p><br></p>`;
    setPages((prev) => [...prev, { id: newId, number: newPageNum }]);
    
    setTimeout(() => {
      const pageElements = document.querySelectorAll(".manuscript-page-editor");
      const lastPage = pageElements[pageElements.length - 1] as HTMLDivElement;
      if (lastPage) {
        lastPage.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(lastPage);
        range.collapse(false); // Move cursor to the end
        selection?.removeAllRanges();
        selection?.addRange(range);
        lastPage.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Keyboard shortcut Ctrl+Enter for Saut de Page
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddNewPage();
    }
  };

  // Rich Text Formatting Commands
  const executeCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    updateWordCount();
  };

  // Font Family Apply
  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    executeCommand("fontName", font);
  };

  // Font Size Apply
  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(48, fontSize + delta));
    setFontSize(newSize);
    executeCommand("fontSize", "4");
  };

  // Insert Horizontal Rule
  const handleInsertHorizontalRule = () => {
    executeCommand("insertHorizontalRule");
  };

  // Insert Table 3x3
  const handleInsertTable = () => {
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête 1</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête 2</th>
            <th style="border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-weight: bold;">En-tête 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 1</td>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 2</td>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 4</td>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 5</td>
            <td style="border: 1px solid #d1d5db; padding: 10px 14px;">Donnée 6</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    executeCommand("insertHTML", tableHTML);
  };

  // Insert Link
  const handleInsertLinkSubmit = () => {
    if (!linkUrlInput) return;
    
    // Restore selection
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRangeRef.current);
    }
    
    const linkHTML = `<a href="${linkUrlInput}" target="_blank" rel="noopener noreferrer" style="color: #F95738; text-decoration: underline;">${linkTextInput || linkUrlInput}</a>`;
    executeCommand("insertHTML", linkHTML);
    setIsLinkModalOpen(false);
    setLinkUrlInput("");
    setLinkTextInput("");
  };

  // BULLETPROOF IMAGE INSERTION (Supports Local File Upload Data URLs & Web URLs)
  const insertImageIntoDOM = (src: string) => {
    // Restore selection to insert image exactly where the cursor was
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRangeRef.current);
    } else {
      // Fallback: focus the last page
      const pageElements = document.querySelectorAll(".manuscript-page-editor");
      const lastPage = pageElements[pageElements.length - 1] as HTMLDivElement;
      if (lastPage) lastPage.focus();
    }

    const imageHTML = `
      <div style="text-align: center; margin: 24px 0;" class="inserted-image-wrapper">
        <img src="${src}" alt="Illustration" style="max-width: 100%; width: 480px; border-radius: 0px; border: 1px solid #d1d5db; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); cursor: pointer;" class="editor-image" />
      </div>
      <p><br></p>
    `;
    
    document.execCommand("insertHTML", false, imageHTML);

    setIsImageModalOpen(false);
    setImageUrlInput("");
    updateWordCount();
  };

  // Handle Image Submit via URL or Preset
  const handleInsertImageSubmit = (url?: string) => {
    const src = url || imageUrlInput || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80";
    insertImageIntoDOM(src);
  };

  // Handle Local File Upload from Computer
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        insertImageIntoDOM(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Click on Editor Element (Detect Image Selection)
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && target.classList.contains("editor-image")) {
      setSelectedImage(target as HTMLImageElement);
      setImageWidth(target.clientWidth || 480);
    } else {
      setSelectedImage(null);
    }
  };

  // Helper to persist image changes (resize, align, delete) to the DOM reference
  const updateEditorContent = (imageElement: HTMLElement | null) => {
    if (!imageElement) return;
    const editor = imageElement.closest('.manuscript-page-editor') as HTMLDivElement;
    if (editor) {
      const pageId = Number(editor.getAttribute('data-page-id'));
      if (pageId) {
        pagesContentRef.current[pageId] = editor.innerHTML;
        updateWordCount();
      }
    }
  };

  // Google Docs Style Native Image Resize Overlay State
  const [imageRect, setImageRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ startX: number; startWidth: number; direction: string } | null>(null);

  const updateOverlayPosition = () => {
    if (selectedImage) {
      const editorContainer = document.querySelector(".editor-scroll-container") as HTMLElement;
      if (!editorContainer) return;
      const editorRect = editorContainer.getBoundingClientRect();
      const imgRect = selectedImage.getBoundingClientRect();

      setImageRect({
        top: imgRect.top - editorRect.top + editorContainer.scrollTop,
        left: imgRect.left - editorRect.left + editorContainer.scrollLeft,
        width: imgRect.width,
        height: imgRect.height
      });
    } else {
      setImageRect(null);
    }
  };

  useEffect(() => {
    updateOverlayPosition();
    const container = document.querySelector(".editor-scroll-container");
    if (container) {
      container.addEventListener("scroll", updateOverlayPosition);
      window.addEventListener("resize", updateOverlayPosition);
    }
    return () => {
      if (container) container.removeEventListener("scroll", updateOverlayPosition);
      window.removeEventListener("resize", updateOverlayPosition);
    };
  }, [selectedImage, imageWidth]);

  const startResize = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImage) return;
    setResizeState({
      startX: e.clientX,
      startWidth: selectedImage.clientWidth,
      direction: dir
    });
  };

  useEffect(() => {
    if (!resizeState || !selectedImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      let deltaX = e.clientX - resizeState.startX;
      // Reverse delta if dragging from the left side
      if (resizeState.direction.includes('w')) {
        deltaX = -deltaX;
      }
      
      const newWidth = Math.max(100, resizeState.startWidth + deltaX * 2);
      setImageWidth(newWidth);
      selectedImage.style.width = `${newWidth}px`;
      updateOverlayPosition();
    };

    const handleMouseUp = () => {
      setResizeState(null);
      updateEditorContent(selectedImage);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState, selectedImage]);

  // Apply Alignment to Selected Image
  const handleSetImageAlignment = (align: "left" | "center" | "right") => {
    setImageAlignment(align);
    if (selectedImage && selectedImage.parentElement) {
      selectedImage.parentElement.style.textAlign = align;
      updateEditorContent(selectedImage);
    }
  };

  // Delete Selected Image
  const handleDeleteSelectedImage = () => {
    if (selectedImage && selectedImage.parentElement) {
      const parent = selectedImage.parentElement;
      const img = selectedImage;
      setSelectedImage(null);
      parent.remove();
      updateEditorContent(img);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden min-w-0 font-body">
      {/* ================= 1. GOOGLE DOCS STYLE TOP MENU BAR ================= */}
      <div ref={menuRef} className="bg-white border-b border-neutral-200/80 px-6 py-2 flex items-center gap-2 text-sm font-semibold shrink-0 z-20 select-none">
        {[
          {
            id: "edition",
            label: "Édition",
            items: [
              { label: "Annuler (Ctrl+Z)", action: () => executeCommand("undo") },
              { label: "Rétablir (Ctrl+Y)", action: () => executeCommand("redo") },
              { label: "Tout sélectionner", action: () => executeCommand("selectAll") },
              { label: "Effacer le formatage", action: () => executeCommand("removeFormat") }
            ]
          },
          {
            id: "affichage",
            label: "Affichage",
            items: [
              { label: "Zoom 100%", action: () => setZoomLevel(100) },
              { label: "Zoom 125%", action: () => setZoomLevel(125) },
              { label: "Afficher/Masquer la règle", action: () => setShowRuler(!showRuler) }
            ]
          },
          {
            id: "insertion",
            label: "Insertion",
            items: [
              { label: "📄 Saut de page (Ctrl+Enter)", action: handleAddNewPage },
              { label: "🖼️ Image...", action: () => { saveSelection(); setIsImageModalOpen(true); } },
              { label: "📊 Tableau (3x3)", action: handleInsertTable },
              { label: "🔗 Lien hypertexte...", action: () => { saveSelection(); setIsLinkModalOpen(true); } },
              { label: "➖ Ligne horizontale", action: handleInsertHorizontalRule }
            ]
          },
          {
            id: "format",
            label: "Format",
            items: [
              { label: "Gras (Ctrl+B)", action: () => executeCommand("bold") },
              { label: "Italique (Ctrl+I)", action: () => executeCommand("italic") },
              { label: "Souligné (Ctrl+U)", action: () => executeCommand("underline") },
              { label: "Barré", action: () => executeCommand("strikeThrough") }
            ]
          },
          {
            id: "outils",
            label: "Outils",
            items: [
              { label: "Statistiques du document", action: updateWordCount },
              { label: "Correction automatique IA", action: () => alert("Vérification IA en cours...") }
            ]
          }
        ].map((menu) => (
          <div key={menu.id} className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
              className={`px-3 py-1.5 rounded-lg text-sm text-neutral-800 font-semibold hover:bg-neutral-100 transition-colors ${
                activeMenu === menu.id ? "bg-neutral-100 font-bold text-neutral-900" : ""
              }`}
            >
              {menu.label}
            </button>

            {activeMenu === menu.id && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                {menu.items.map((subItem, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      subItem.action();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-orange-50 hover:text-secondary transition-colors"
                  >
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
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("undo")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center transition-colors" title="Annuler (Ctrl+Z)">
            <span className="material-symbols-outlined text-xl">undo</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("redo")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center transition-colors" title="Rétablir (Ctrl+Y)">
            <span className="material-symbols-outlined text-xl">redo</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => window.print()} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center transition-colors" title="Imprimer">
            <span className="material-symbols-outlined text-xl">print</span>
          </button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Zoom Selector */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer shadow-2xs"
          >
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Paragraph Style Dropdown */}
          <select
            onChange={(e) => executeCommand("formatBlock", e.target.value)}
            className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[130px] shadow-2xs"
          >
            <option value="p">Texte normal</option>
            <option value="h1">Titre 1</option>
            <option value="h2">Titre 2</option>
            <option value="h3">Titre 3</option>
            <option value="blockquote">Citation</option>
          </select>

          {/* Font Family Selector */}
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="bg-white border border-neutral-300 text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[120px] shadow-2xs"
          >
            <option value="Outfit">Outfit</option>
            <option value="Garamond">Garamond</option>
            <option value="Georgia">Georgia</option>
            <option value="Inter">Inter</option>
            <option value="Playfair Display">Playfair</option>
          </select>

          {/* Font Size +/- */}
          <div className="flex items-center border border-neutral-300 rounded-xl bg-white px-2 py-1 shadow-2xs">
            <button onClick={() => handleFontSizeChange(-1)} className="w-6 h-6 flex items-center justify-center font-bold hover:bg-neutral-100 rounded-lg text-sm">-</button>
            <span className="px-2 font-mono text-xs font-bold">{fontSize}</span>
            <button onClick={() => handleFontSizeChange(1)} className="w-6 h-6 flex items-center justify-center font-bold hover:bg-neutral-100 rounded-lg text-sm">+</button>
          </div>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Text Formatting: Bold, Italic, Underline, Strike */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("bold")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-900 font-black text-base flex items-center justify-center" title="Gras (Ctrl+B)">B</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("italic")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-900 italic font-serif text-base flex items-center justify-center" title="Italique (Ctrl+I)">I</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("underline")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-900 underline text-base flex items-center justify-center" title="Souligné (Ctrl+U)">U</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("strikeThrough")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-900 line-through text-base flex items-center justify-center" title="Barré">S</button>

          {/* Color Pickers */}
          <label className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Couleur de texte">
            <span className="material-symbols-outlined text-xl text-secondary">format_color_text</span>
            <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); executeCommand("foreColor", e.target.value); }} className="opacity-0 absolute w-0 h-0" />
          </label>

          <label className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 cursor-pointer flex items-center justify-center relative" title="Surlignage">
            <span className="material-symbols-outlined text-xl text-amber-500">ink_highlighter</span>
            <input type="color" value={highlightColor} onChange={(e) => { setHighlightColor(e.target.value); executeCommand("hiliteColor", e.target.value); }} className="opacity-0 absolute w-0 h-0" />
          </label>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Quick Insert Items: Image, Table, Link, Line, Page Break */}
          <button onClick={() => { saveSelection(); setIsImageModalOpen(true); }} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center" title="Insérer une Image">
            <span className="material-symbols-outlined text-xl">image</span>
          </button>
          <button onClick={handleInsertTable} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center" title="Insérer un Tableau">
            <span className="material-symbols-outlined text-xl">table_chart</span>
          </button>
          <button onClick={() => { saveSelection(); setIsLinkModalOpen(true); }} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center" title="Insérer un Lien">
            <span className="material-symbols-outlined text-xl">link</span>
          </button>
          <button onClick={handleInsertHorizontalRule} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center" title="Ligne Horizontale">
            <span className="material-symbols-outlined text-xl">horizontal_rule</span>
          </button>
          <button onClick={handleAddNewPage} className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-neutral-800 hover:text-secondary flex items-center justify-center" title="Saut de page (Ctrl+Enter)">
            <span className="material-symbols-outlined text-xl">post_add</span>
          </button>

          <div className="w-[1px] h-6 bg-neutral-300 mx-1"></div>

          {/* Text Alignments */}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("justifyLeft")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center" title="Aligner à gauche">
            <span className="material-symbols-outlined text-xl">format_align_left</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("justifyCenter")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center" title="Centrer">
            <span className="material-symbols-outlined text-xl">format_align_center</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("justifyRight")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center" title="Aligner à droite">
            <span className="material-symbols-outlined text-xl">format_align_right</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("justifyFull")} className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 text-neutral-700 flex items-center justify-center" title="Justifier">
            <span className="material-symbols-outlined text-xl">format_align_justify</span>
          </button>
        </div>
      </div>

      {/* ================= 3. RULER BAR ================= */}
      {showRuler && (
        <div className="h-6 bg-neutral-100 border-b border-neutral-200 flex items-center justify-center shrink-0 select-none overflow-hidden">
          <div className="max-w-[815px] w-full flex items-center justify-between text-[9px] font-mono text-neutral-400 px-4">
            <span>| 1</span><span>| 2</span><span>| 3</span><span>| 4</span><span>| 5</span><span>| 6</span><span>| 7</span><span>| 8</span><span>| 9</span><span>| 10</span><span>| 11</span><span>| 12</span><span>| 13</span><span>| 14</span><span>| 15</span><span>| 16</span>
          </div>
        </div>
      )}

      {/* ================= 4. REAL MULTI-PAGE STACK CANVAS (STACKED PAPER SHEETS) ================= */}
      <div className="editor-scroll-container flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center space-y-8 relative">
        
        {/* NATIVE GOOGLE DOCS STYLE RESIZE OVERLAY */}
        {imageRect && selectedImage && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              top: imageRect.top,
              left: imageRect.left,
              width: imageRect.width,
              height: imageRect.height,
              border: "2px solid #3b82f6" // blue-500
            }}
          >
            {/* 4 Corners */}
            <div onMouseDown={(e) => startResize(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 pointer-events-auto cursor-nwse-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 pointer-events-auto cursor-nesw-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 pointer-events-auto cursor-swne-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 pointer-events-auto cursor-nwse-resize border border-white"></div>
            
            {/* 4 Edges */}
            <div onMouseDown={(e) => startResize(e, 'n')} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 pointer-events-auto cursor-ns-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 's')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 pointer-events-auto cursor-ns-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 'e')} className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 pointer-events-auto cursor-ew-resize border border-white"></div>
            <div onMouseDown={(e) => startResize(e, 'w')} className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 pointer-events-auto cursor-ew-resize border border-white"></div>
          </div>
        )}

        {pages.map((page, index) => (
          <div
            key={page.id}
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            className="manuscript-page-sheet transition-transform duration-150 max-w-[815px] w-full bg-white p-12 md:p-16 rounded-none border border-neutral-300 shadow-lg min-h-[950px] relative flex flex-col justify-between"
          >
            {/* Page Header (Chapter Title on Page 1, Page Number Badge) */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6 select-none">
              <span className="text-xs font-mono font-bold text-neutral-400 tracking-wider">IRIS MANUSCRIT</span>
              <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                Page {page.number} sur {pages.length}
              </span>
            </div>

            {/* Chapter Title is now handled directly inside the ContentEditable as an H1 */}

            {/* Interactive WYSIWYG ContentEditable Area per Page */}
            <div
              contentEditable
              data-page-id={page.id}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                pagesContentRef.current[page.id] = e.currentTarget.innerHTML;
                updateWordCount();
              }}
              onClick={handleEditorClick}
              ref={(el) => {
                if (el && !el.getAttribute('data-init')) {
                  el.innerHTML = pagesContentRef.current[page.id] || "<p><br></p>";
                  el.setAttribute('data-init', 'true');
                }
              }}
              className="manuscript-page-editor flex-grow outline-none min-h-[650px] leading-relaxed text-neutral-900 font-body manuscript-text text-lg space-y-4 focus:outline-none"
              style={{ fontFamily: fontFamily }}
            />

            {/* Floating Image Resizing & Alignment Toolbar */}
            {selectedImage && (
              <div className="absolute top-4 right-4 bg-neutral-900 text-white rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 z-40 text-xs animate-fadeIn">
                <span className="font-mono text-xs text-amber-400 font-bold px-2">{imageWidth}px</span>
                
                <div className="w-[1px] h-4 bg-neutral-700"></div>

                <button onClick={() => handleSetImageAlignment("left")} className={`p-1.5 rounded-lg ${imageAlignment === "left" ? "bg-secondary" : "hover:bg-neutral-800"}`} title="Aligner à gauche">
                  <span className="material-symbols-outlined text-base">format_align_left</span>
                </button>
                <button onClick={() => handleSetImageAlignment("center")} className={`p-1.5 rounded-lg ${imageAlignment === "center" ? "bg-secondary" : "hover:bg-neutral-800"}`} title="Centrer">
                  <span className="material-symbols-outlined text-base">format_align_center</span>
                </button>
                <button onClick={() => handleSetImageAlignment("right")} className={`p-1.5 rounded-lg ${imageAlignment === "right" ? "bg-secondary" : "hover:bg-neutral-800"}`} title="Aligner à droite">
                  <span className="material-symbols-outlined text-base">format_align_right</span>
                </button>

                <div className="w-[1px] h-4 bg-neutral-700"></div>

                <button onClick={handleDeleteSelectedImage} className="p-1.5 hover:bg-red-600 rounded-lg text-red-300 ml-1" title="Supprimer l'image">
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            )}

            {/* Footer of Page Sheet */}
            <div className="pt-6 border-t border-neutral-100 flex items-center justify-between mt-6 text-xs text-neutral-400 select-none">
              <span>{chapterTitle}</span>
              <button
                onClick={handleAddNewPage}
                className="text-secondary font-bold hover:underline flex items-center gap-1"
                title="Ajouter une nouvelle page en bas"
              >
                <span className="material-symbols-outlined text-base">post_add</span>
                <span>+ Nouvelle page (Saut)</span>
              </button>
              <span>Page {page.number}</span>
            </div>
          </div>
        ))}

        {/* Global Bottom Trigger Button */}
        <div className="py-6 flex justify-center">
          <button
            onClick={onContinueWithAi}
            className="bg-white border border-secondary/40 hover:border-secondary text-secondary hover:bg-orange-50 font-bold text-xs px-6 py-3 rounded-full transition-all shadow-md flex items-center gap-2 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">auto_awesome</span>
            <span>Continuer la rédaction avec l&apos;IA</span>
          </button>
        </div>
      </div>

      {/* ================= MODAL: INSERT IMAGE ================= */}
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

            {/* Option 1: Importer depuis son ordinateur */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                1. Importer depuis votre ordinateur 💻
              </label>
              <label className="w-full border-2 border-dashed border-neutral-300 hover:border-secondary bg-neutral-50 hover:bg-orange-50/50 p-5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
                <span className="material-symbols-outlined text-3xl text-secondary mb-1">upload_file</span>
                <span className="text-xs font-bold text-neutral-800">Cliquer pour choisir un fichier image</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG, WEBP, GIF (Max 10 MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-neutral-200"></div>
              <span className="text-[11px] font-bold text-neutral-400">OU VIA URL</span>
              <div className="flex-1 h-[1px] bg-neutral-200"></div>
            </div>

            {/* Option 2: Lien Web URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                2. Lien de l&apos;image Web
              </label>
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://exemple.com/image.jpg"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100">
                Annuler
              </button>
              <button onClick={() => handleInsertImageSubmit()} className="bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs">
                Insérer l&apos;image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSERT LINK ================= */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-extrabold text-lg text-neutral-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">link</span>
                <span>Insérer un Lien Hypertexte</span>
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-neutral-400 hover:text-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Texte du lien</label>
                <input
                  type="text"
                  value={linkTextInput}
                  onChange={(e) => setLinkTextInput(e.target.value)}
                  placeholder="Ex: En savoir plus"
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">URL (Lien Web)</label>
                <input
                  type="text"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100">
                Annuler
              </button>
              <button onClick={handleInsertLinkSubmit} className="bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs">
                Ajouter le lien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
