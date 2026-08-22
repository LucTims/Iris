import { Editor } from "@tiptap/react";

export interface EditorSelection {
  text: string;
  from: number;
  to: number;
}

export interface RichManuscriptEditorHandle {
  getEditor: () => Editor | null;
  getContent: () => string;
  setContent: (content: string) => void;
  insertContent: (content: string) => void;
  replaceContent: (content: string) => void;
  /** Replace a specific range (from/to) with new HTML/text — used for targeted selection edits. */
  replaceRange: (from: number, to: number, content: string) => void;
  /** Current selection text and range, or null if nothing is selected. */
  getSelection: () => EditorSelection | null;
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
  onContextualAiAction?: (actionType: string, selectedText: string, customInstruction?: string) => Promise<string>;
  /** Send the current selection (text + range) up to the chat panel for a free-form edit. */
  onSendSelectionToChat?: (selection: EditorSelection) => void;
  isGenerating?: boolean;
  onFileSelected?: (file: File) => void;
}

export type PageFormatType = "A4" | "A5";
