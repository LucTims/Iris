"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { ResizableImage } from './ResizableImageExtension';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from './FontSizeExtension';
import { LineHeight } from './LineHeightExtension';
import { ConvertKit } from '@tiptap-pro/extension-convert-kit';
import { TableKit } from '@tiptap-pro/extension-pages-tablekit';
import { Pages } from '@tiptap-pro/extension-pages';
import { BetaToolbar } from './BetaToolbar';
import { TestPanel } from './TestPanel';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 font-mono text-sm border border-red-500 rounded">
          <h2 className="text-xl font-bold mb-4">Erreur Tiptap (Crash)</h2>
          <p className="whitespace-pre-wrap">{this.state.error?.toString()}</p>
          <pre className="mt-4 p-4 bg-red-100 overflow-auto">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function EditorWorkspace() {
  const [zoom, setZoom] = useState(1);
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
      Link,
      ResizableImage,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
      FontSize,
      LineHeight,
      ConvertKit.configure({
        table: false,
      }),
      TableKit,
      Pages.configure({
        pageFormat: 'A4',
      }),
    ],
    content: '<p>Bienvenue dans le POC Tiptap Pages pour Iris !</p><p>Appuyez sur Entrée pour créer un nouveau paragraphe, ou essayez le bouton Stress Test sur le côté.</p>',
  });

  return (
    <div className="flex flex-1 overflow-hidden w-full h-full">
      {/* Custom styles required for Tiptap Pages */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,700;1,400&family=Open+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Nunito:wght@300;400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400;700&family=Pacifico&family=Caveat:wght@400;700&family=Fira+Code:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');
        .tiptap-page {
          background-color: white;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
          border: 1px solid #e5e7eb;
          margin-left: auto;
          margin-right: auto;
        }
        .tiptap:focus {
          outline: none;
        }
        .tiptap a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap a:hover {
          color: #1d4ed8;
        }
        .tiptap p, .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5 {
          line-height: 1.6;
          margin-bottom: 0.4em;
        }
        .tiptap h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 0.67em;
        }
        .tiptap h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin-top: 0.83em;
        }
        .tiptap h3 {
          font-size: 1.25em;
          font-weight: 700;
          margin-top: 1em;
        }
        .tiptap h4 {
          font-size: 1.1em;
          font-weight: 700;
          margin-top: 1.33em;
        }
        .tiptap h5 {
          font-size: 1em;
          font-weight: 700;
          margin-top: 1.67em;
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
        .tiptap li p {
          margin-bottom: 0.1em;
        }
        .tiptap blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: #475569;
        }
      `}} />

      {/* Sidebar TestPanel */}
      <div className="w-80 bg-white border-r border-gray-200 z-10 flex-shrink-0">
        <TestPanel editor={editor} />
      </div>

      {/* Main Editor View */}
      <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden relative">
        <div className="px-8 pt-4 pb-2">
          <BetaToolbar editor={editor} zoom={zoom} setZoom={setZoom} />
        </div>
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div 
            className="origin-top transition-transform duration-200"
            style={{ 
              width: '794px',
              transform: `scale(${zoom})`,
              marginBottom: `${(zoom - 1) * 1123}px`
            }}
          > 
             <EditorContent editor={editor} className="min-h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TiptapBetaEditor() {
  return (
    <ErrorBoundary>
      <EditorWorkspace />
    </ErrorBoundary>
  );
}
