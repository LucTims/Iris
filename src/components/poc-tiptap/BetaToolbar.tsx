import React, { useRef, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  FileOutput,
  Undo,
  Redo,
  Highlighter,
  Baseline,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';

interface BetaToolbarProps {
  editor: Editor | null;
  zoom?: number;
  setZoom?: (zoom: number) => void;
}

export function BetaToolbar({ editor, zoom = 1, setZoom }: BetaToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState(0);

  // Force re-render on every editor transaction so buttons update correctly
  useEffect(() => {
    if (!editor) return;
    const handler = () => forceUpdate(n => n + 1);
    editor.on('transaction', handler);
    return () => { editor.off('transaction', handler); };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-600'
          : 'hover:bg-gray-100 text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const insertTable = () => {
    const rowsStr = window.prompt("Nombre de lignes ?", "3");
    const colsStr = window.prompt("Nombre de colonnes ?", "3");
    
    if (rowsStr && colsStr) {
      const rows = parseInt(rowsStr, 10);
      const cols = parseInt(colsStr, 10);
      if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0) {
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      }
    }
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-white border-b shadow-sm border-gray-200 rounded-t-lg">
      
      {/* Undo / Redo à gauche */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler (Ctrl+Z)">
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir (Ctrl+Y)">
        <Redo size={18} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Zoom */}
      <select 
        className="border-gray-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 bg-transparent hover:bg-gray-50 cursor-pointer w-20" 
        title="Zoom"
        value={zoom.toString()}
        onChange={(e) => setZoom && setZoom(parseFloat(e.target.value))}
      >
        <option value="0.5">50%</option>
        <option value="0.75">75%</option>
        <option value="1">100%</option>
        <option value="1.25">125%</option>
        <option value="1.5">150%</option>
        <option value="2">200%</option>
      </select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Block Type */}
      <select 
        className="border-gray-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 bg-transparent hover:bg-gray-50 cursor-pointer"
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'p') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().setHeading({ level: parseInt(val) as any }).run();
        }}
        value={
          editor.isActive('heading', { level: 1 }) ? '1' : 
          editor.isActive('heading', { level: 2 }) ? '2' : 
          editor.isActive('heading', { level: 3 }) ? '3' : 
          editor.isActive('heading', { level: 4 }) ? '4' : 
          editor.isActive('heading', { level: 5 }) ? '5' : 'p'
        }
      >
        <option value="p">Texte normal</option>
        <option value="1">Titre 1</option>
        <option value="2">Sous-titre</option>
        <option value="3">Titre 2</option>
        <option value="4">Titre 3</option>
        <option value="5">Titre 4</option>
      </select>

      {/* Font Family */}
      <select 
        className="border-gray-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 bg-transparent hover:bg-gray-50 cursor-pointer max-w-[160px]"
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        value={editor.getAttributes('textStyle').fontFamily || ''}
      >
        <option value="">Police par défaut</option>
        <optgroup label="─── Sans-serif ───">
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

      {/* Font Size: - [input] + */}
      <div className="flex items-center gap-0 mx-1">
        <button
          onClick={() => {
            const current = parseInt(editor.getAttributes('textStyle').fontSize || '16');
            const next = Math.max(8, current - 1);
            (editor.commands as any).setFontSize(`${next}px`);
          }}
          className="px-1.5 py-1 hover:bg-gray-100 text-gray-600 rounded-l border border-gray-300 text-sm font-medium"
          title="Réduire la taille"
        >
          −
        </button>
        <input
          type="number"
          min={8}
          max={144}
          value={parseInt(editor.getAttributes('textStyle').fontSize || '16')}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val >= 8 && val <= 144) {
              (editor.commands as any).setFontSize(`${val}px`);
            }
          }}
          className="w-10 text-center text-sm py-1 border-y border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          title="Taille de la police"
        />
        <button
          onClick={() => {
            const current = parseInt(editor.getAttributes('textStyle').fontSize || '16');
            const next = Math.min(144, current + 1);
            (editor.commands as any).setFontSize(`${next}px`);
          }}
          className="px-1.5 py-1 hover:bg-gray-100 text-gray-600 rounded-r border border-gray-300 text-sm font-medium"
          title="Augmenter la taille"
        >
          +
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Gras">
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italique">
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Souligné">
        <Underline size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Barré">
        <Strikethrough size={18} />
      </ToolbarButton>

      {/* Colors */}
      <div className="flex items-center gap-1 mx-1">
        <label className="flex flex-col items-center justify-center cursor-pointer p-1 hover:bg-gray-100 rounded text-red-500 relative" title="Couleur du texte">
          <Baseline size={18} />
          <div className="h-1 w-4 mt-0.5 rounded-sm" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} />
          <input 
            type="color" 
            className="w-0 h-0 opacity-0 absolute"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
          />
        </label>
        
        <label className="flex flex-col items-center justify-center cursor-pointer p-1 hover:bg-gray-100 rounded text-orange-400 relative" title="Couleur de surbrillance">
          <Highlighter size={18} />
          <div className="h-1 w-4 mt-0.5 rounded-sm" style={{ backgroundColor: editor.getAttributes('highlight').color || 'transparent' }} />
          <input 
            type="color" 
            className="w-0 h-0 opacity-0 absolute"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            value={editor.getAttributes('highlight').color || '#ffffff'}
          />
        </label>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Insertions */}
      <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Insérer un lien">
        <LinkIcon size={18} />
      </ToolbarButton>
      
      <ToolbarButton onClick={triggerImageUpload} title="Insérer une image">
        <ImageIcon size={18} />
      </ToolbarButton>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      <ToolbarButton onClick={insertTable} title="Insérer un tableau">
        <TableIcon size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => (editor.commands as any).setPageBreak()} title="Saut de page">
        <FileOutput size={18} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Alignments */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centrer">
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
        <AlignRight size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justifier">
        <AlignJustify size={18} />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Line Height */}
      <select
        className="border-gray-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 bg-transparent hover:bg-gray-50 cursor-pointer w-[70px]"
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'default') {
            (editor.commands as any).unsetLineHeight();
          } else {
            (editor.commands as any).setLineHeight(val);
          }
        }}
        value={(() => {
          const { lineHeight } = editor.getAttributes('paragraph');
          return lineHeight || 'default';
        })()}
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
      
      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Liste à puces">
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Liste numérotée">
        <ListOrdered size={18} />
      </ToolbarButton>

      <div className="flex-1" />

      {/* History */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler (Ctrl+Z)">
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir (Ctrl+Y)">
        <Redo size={18} />
      </ToolbarButton>
    </div>
  );
}
