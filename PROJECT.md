# Project: Livre Genie - Manuscript Import (.docx & .epub)

## Architecture & Overview
Application Next.js featuring a TipTap editor on page `/redaction`.
Feature addition: Uploading `.docx` and `.epub` files, parsing them cleanly to preserve formatting (headings H1-H6, bold, italic, underline, strike, lists, blockquotes, images), presenting a structuring choice modal (split by H1/H2 vs single block), and inserting the structured content into the editor and chapter state.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture | Discover codebase layout, editor setup, dependencies | None | DONE |
| 2 | Manuscript Parsing Engine | Install mammoth & jszip; create docxParser, epubParser, chapterSplitter | M1 | DONE |
| 3 | UI & Structuring Workflow | Add "Importer" button, ImportManuscriptModal, integrate with /redaction chapter state & TipTap | M2 | DONE |
| 4 | Verification & E2E Hardening | Automated testing, unit/integration verification, challenger stress tests, forensic audit | M3 | DONE |

## Interface Contracts
### Import API / Parser Engine (`src/lib/parser/index.ts`)
- `parseManuscriptFile(file: File | Blob | ArrayBuffer, options: { splitByChapter: boolean }): Promise<ParsedChapter[]>`
- `ParsedChapter`: `{ title: string, content: string }` (content is TipTap-compatible HTML)

## Code Layout
- `src/lib/parser/docxParser.ts` - DOCX parser using `mammoth` with French & English style mapping and Base64 images.
- `src/lib/parser/epubParser.ts` - EPUB parser using `JSZip`, XML DOM parsing for container/OPF manifest/spine, and Base64 images.
- `src/lib/parser/chapterSplitter.ts` - H1/H2 DOM AST splitter preserving semantic tags with cross-environment DOM fallback.
- `src/lib/parser/index.ts` - Unified entry point for manuscript extraction.
- `src/components/ImportManuscriptModal.tsx` - Structuring choice modal ("Diviser par chapitre" vs "Tout garder").
- `src/components/RichManuscriptEditor.tsx` - Extended editor toolbar & insertion menu with "Importer" button.
- `src/app/redaction/page.tsx` - Main page integrating import flow with chapter state management.
