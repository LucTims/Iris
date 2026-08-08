# Project: Iris IA - Direct Manuscript Editing from Chat

## Architecture & Overview
Enriching Iris AI assistant in the chat interface (`/api/chat` and client chat component in `/redaction`) to allow direct manuscript editing by AI commands.
When a user requests editing/enrichment/correction of a chapter (e.g. "Modifie le chapitre 3 pour..."), the system:
1. Detects intention in `/api/chat` and generates structured output: summary text + chapter modification payload.
2. Client receives payload, identifies target chapter, updates chapter state and DB, auto-switches active chapter view (`activeChapterIndex`), and updates TipTap editor content cleanly while preserving undo/redo history.
3. Chat UI renders response with textual summary and a quick action button "Aller au chapitre" to navigate to the modified chapter.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture | Discover chat API (`/api/chat`), `/redaction` state management, TipTap undo history integration, DB persistence | None | DONE |
| 2 | Intent Detection & API Payload Structuring | Implement AI tool calling / structured response in `/api/chat` returning summary + modification payload | M1 | DONE |
| 3 | Client Chat & TipTap Editor Integration | Handle payload in `/redaction`, auto-switch chapter, update state/DB, update TipTap with undo history, render summary & "Aller au chapitre" button | M2 | DONE |
| 4 | Verification & E2E Hardening | Automated testing, unit/integration verification, challenger stress tests, forensic audit | M3 | DONE |

## Interface Contracts
### API Route (`/api/chat/route.ts`)
- Request payload: `{ messages: Message[], context: { title, synopsis, tone }, chapters?: Chapter[], activeChapterIndex?: number, model?: string }`
- Structured AI response payload:
  `{ message: string, chatSummary: string, intent: "CHAT_ONLY" | "MODIFY_CHAPTER", chapterModification?: { chapterIndex: number, chapterId?: string | number, chapterTitle?: string, newContent: string, summary: string } }`

### Client Handler (`src/app/redaction/page.tsx` & Chat Components)
- `handleApplyAIChapterEdit(modification: { chapterIndex: number, newContent: string, summary: string }): void`
- Auto-switch active tab: `setActiveChapterIndex(chapterIndex)`
- TipTap editor update preserving history: `editorRef.current?.replaceContent(newContent)` via ProseMirror transaction

## Code Layout
- `src/app/api/chat/route.ts` - AI Chat endpoint with tool calling / structured output for chapter editing.
- `src/lib/ai/intent-detector.ts` - Intent classification (`CHAT_ONLY` vs `MODIFY_CHAPTER`) and target chapter mapping (ordinals, numbers, titles).
- `src/app/redaction/page.tsx` - Main editing page managing active chapter state, database persistence, and AI payload execution.
- `src/components/Chat/ChatDrawer.tsx` / `src/components/Chat/ChatMessage.tsx` - Chat UI rendering summaries and "Aller au chapitre" navigation buttons.
- `src/components/RichManuscriptEditor.tsx` - TipTap editor wrapper with transaction-based content update for undo preservation (`replaceContent`).
