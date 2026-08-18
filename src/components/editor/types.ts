import { Editor } from "@tiptap/react";

export interface RichManuscriptEditorHandle {
  getEditor: () => Editor | null;
  getContent: () => string;
  setContent: (content: string) => void;
  insertContent: (content: string) => void;
  replaceContent: (content: string) => void;
  focus: () => void;
}

export interface RichManuscriptEditorProps {
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

export type PageFormatType = "A4" | "A5";
