"use client";

import { TiptapBetaEditor } from '@/components/poc-tiptap/TiptapBetaEditor';

export default function RedactionBetaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm z-10">
        <h1 className="text-xl font-semibold text-gray-800">Iris Beta POC</h1>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <TiptapBetaEditor />
      </main>
    </div>
  );
}
