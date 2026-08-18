import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';

interface TestPanelProps {
  editor: Editor | null;
}

export function TestPanel({ editor }: TestPanelProps) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);

  useEffect(() => {
    if (!editor) return;

    const updatePages = () => {
      // Trying to get pages from storage
      const pages = (editor.storage.pages as any)?.pages;
      setPageCount(pages ? pages.length : 0);
    };

    editor.on('transaction', updatePages);
    editor.on('update', updatePages);
    
    // Initial update
    setTimeout(updatePages, 100);

    return () => {
      editor.off('transaction', updatePages);
      editor.off('update', updatePages);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const handleStressTest = () => {
    const content: any[] = [];
    
    for (let i = 1; i <= 15; i++) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: `Chapitre ${i} : Le grand voyage` }]
      });

      for (let j = 1; j <= 3; j++) {
        content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: `Section ${i}.${j} : L'exploration` }]
        });

        for (let k = 1; k <= 5; k++) {
          content.push({
            type: 'paragraph',
            content: [{ 
              type: 'text', 
              text: `Ceci est le paragraphe ${k} de la section ${j} du chapitre ${i}. C'est un long texte conçu pour tester les performances de Tiptap Pages et voir comment il gère une grande quantité de contenu. Le moteur de pagination devrait automatiquement répartir ce texte sur plusieurs pages virtuelles, en calculant la hauteur de chaque nœud.`
            }]
          });
        }

        content.push({
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Premier point important' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deuxième point important' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Troisième point important' }] }] },
          ]
        });
      }
      
      content.push({ type: 'pageBreak' });
    }

    editor.chain().focus().setContent({ type: 'doc', content }).run();
  };

  const handleGenerateAI = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const aiContent = [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Contenu généré par Iris AI' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: "Voici un exemple de contenu structuré qui a été généré de manière asynchrone pour simuler une requête vers une intelligence artificielle. L'IA peut insérer directement des blocs de texte, des titres, ou d'autres nœuds." }]
        },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: "L'intelligence artificielle est la nouvelle électricité." }] }]
        }
      ];
      editor.commands.insertContent(aiContent);
      setIsGeneratingAI(false);
    }, 2000);
  };

  return (
    <div className="w-80 p-4 bg-gray-50 border-l border-gray-200 h-full flex flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Test Panel</h2>
        <p className="text-sm text-gray-500 mb-4">
          Outils pour le débogage et le test de performance (Tiptap Pages).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-gray-700">Génération de contenu</h3>
        <button
          onClick={handleStressTest}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Générer 150 Pages (Stress Test)
        </button>
        <button
          onClick={handleGenerateAI}
          disabled={isGeneratingAI}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm ${
            isGeneratingAI
              ? 'bg-purple-400 text-white cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isGeneratingAI ? 'Génération en cours...' : 'Générer avec Iris AI'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-gray-700">Format de page</h3>
        <div className="flex gap-2">
          <button
            onClick={() => editor.commands.setPageFormat('A4')}
            className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            A4
          </button>
          <button
            onClick={() => editor.commands.setPageFormat('A5')}
            className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            A5
          </button>
        </div>
      </div>

      <div className="mt-auto p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total Pages :</span>
          <span className="text-lg font-bold text-blue-600">{pageCount || '-'}</span>
        </div>
      </div>
    </div>
  );
}
