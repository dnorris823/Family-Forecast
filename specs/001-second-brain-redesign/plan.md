# Implementation Plan: Second Brain — Obsidian-Style Redesign

**Branch**: `001-second-brain-redesign` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-second-brain-redesign/spec.md`

---

## Summary

Redesign the Second Brain page from a three-panel stub into a full Obsidian-inspired workspace. The three panels — file tree, markdown editor, and AI chat — already exist structurally but all require significant upgrades. The file tree gains full CRUD (create, rename, move, delete notes and folders) with drag-and-drop. The editor gains a working markdown preview and split view by replacing the broken `react-markdown-editor-lite` with `@uiw/react-md-editor`. The AI chat gains streaming responses, proper markdown rendering, and a context payload that covers all notes, all events (with privacy filtering), and all tasks. The page layout gains resizable, collapsible panels via `react-resizable-panels`. No database schema changes are required.

---

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.1 App Router, React 19.2
**Primary Dependencies (new)**:
- `@uiw/react-md-editor` — replaces `react-markdown-editor-lite`
- `react-resizable-panels` — resizable/collapsible three-column layout
- `react-markdown` + `remark-gfm` — markdown rendering in AI chat
- `@dnd-kit/core` — drag-and-drop for file tree
- `jszip` — vault export as `.zip`

**Storage**: Supabase Postgres (no schema changes)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web browser (desktop primary, mobile via tabs)
**Performance Goals**: Mode switch < 200ms; first AI token < 3s; auto-save confirm < 2s; real-time updates < 3s
**Constraints**: All panel components must be `'use client'`; dynamic import for editor and zip to avoid SSR issues; streaming requires readable stream in Next.js App Router route handler
**Scale/Scope**: Single family (~2–10 users), hundreds of notes per user

---

## Constitution Check

No project constitution has been established (constitution.md is unpopulated template). No gates to enforce.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-second-brain-redesign/
├── plan.md              ← this file
├── research.md          ← Phase 0: library decisions, streaming pattern, ownership rules
├── data-model.md        ← Phase 1: entity shapes, new actions, API changes
├── quickstart.md        ← Phase 1: setup guide
├── contracts/
│   ├── file-tree.md     ← FileTree component interface
│   ├── markdown-editor.md ← MarkdownEditor component interface
│   ├── brain-chat-panel.md ← BrainChatPanel component interface
│   └── api-ai-chat.md   ← /api/ai/chat request/response contract
└── tasks.md             ← Phase 2 output (/speckit.tasks command)
```

### Source Code

```text
src/
├── app/
│   ├── api/ai/
│   │   └── chat/route.ts          MODIFY — expand context, add streaming, add activeNoteId param
│   └── dashboard/brain/
│       ├── page.tsx               MODIFY — integrate react-resizable-panels, wire new callbacks
│       └── actions.ts             MODIFY — add deleteNote, renameNote, moveNote, renameFolder,
│                                           deleteFolder, exportNote, exportAllNotes; fix updateNote
│                                           access control
├── components/brain/
│   ├── file-tree.tsx              REBUILD — add DnD (@dnd-kit), context menu, inline rename,
│   │                                        folder create/delete, drag-to-move
│   ├── markdown-editor.tsx        REBUILD — replace library with @uiw/react-md-editor;
│   │                                        add view mode toggle (edit/preview/split)
│   └── brain-chat-panel.tsx       REBUILD — streaming consume, react-markdown render,
│                                            onNoteUpdated callback, activeNoteId prop
├── lib/ai/
│   ├── client.ts                  MODIFY — replace chatWithAI() with streaming-aware
│   │                                       streamChatWithAI(messages, model, activeNoteId, onChunk)
│   ├── tool-definitions.ts        MODIFY — add update_note tool schema
│   └── tools.ts                   MODIFY — add updateNote() implementation, fix privacy filter
│                                           in executeAITool context
└── types/index.ts                 MODIFY — fix Note type: user_id → created_by
```

---

## Implementation Phases

### Phase A — Foundation (no visual changes yet)

**Goal**: All new dependencies installed; type fix in place; no regressions.

1. `npm install @uiw/react-md-editor react-resizable-panels react-markdown remark-gfm @dnd-kit/core jszip`
2. `npm uninstall react-markdown-editor-lite`
3. Fix `Note` type: `user_id` → `created_by` in `src/types/index.ts`
4. Fix all TypeScript errors that result from the type change
5. Verify `npm run build` passes

---

### Phase B — Server Actions & Data Layer

**Goal**: All CRUD operations available; access control correct; AI context expanded.

**B1 — Brain Actions**
- Add `deleteNote(noteId)` — with access control check
- Add `renameNote(noteId, newTitle)` — with access control check
- Add `moveNote(noteId, newFolderPath)` — creator-only
- Add `renameFolder(oldPath, newPath, userId)` — bulk-update folder_path prefix, creator-owned notes only
- Add `deleteFolder(folderPath, userId)` — bulk-delete, respects access control per note
- Add `exportNote(noteId)` — read-only, returns `{ title, content, folderPath }`
- Add `exportAllNotes()` — returns all visible notes
- Fix existing `updateNote` access control: allow shared-note edits by family members

**B2 — AI Context Expansion**
- Rewrite `getFreshContext()` in `api/ai/chat/route.ts`:
  - Accept `activeNoteId?: string` from request body
  - Events query: remove date restriction; apply privacy filter
  - Tasks query: remove status filter, no limit; apply privacy filter
  - Notes query: full content, no limit, current user only
  - Fetch and prepend active note if `activeNoteId` provided
  - Apply token overflow truncation (>6000 chars): drop far-future events first, then note content

**B3 — AI Streaming**
- In `api/ai/chat/route.ts`: after tool loop resolves to final message, re-invoke Ollama with `stream: true`; pipe NDJSON through `ReadableStream`; return `new Response(stream, { headers: { 'Content-Type': 'text/plain' } })`
- Update `src/lib/ai/client.ts`: add `streamChatWithAI(messages, model, activeNoteId, onChunk)` that reads the stream and calls `onChunk` per decoded chunk

**B4 — New AI Tool: `update_note`**
- Add tool schema to `src/lib/ai/tool-definitions.ts`
- Add implementation to `src/lib/ai/tools.ts` with access control check

---

### Phase C — File Tree Rebuild

**Goal**: Full CRUD file tree with drag-and-drop, context menu, and inline rename.

**C1 — DnD Setup**
- Wrap file tree in `<DndContext>`; add `useDraggable` to note items; add `useDroppable` to folder items
- `handleDragEnd`: extract noteId + targetFolderPath → call `onMoveNote`

**C2 — Context Menu**
- On right-click: position a floating menu (using Radix UI `DropdownMenu` or a custom div)
- Note menu: Rename, Delete
- Folder menu: Rename, Delete, New Note, New Folder

**C3 — Inline Rename**
- Double-click handler on name span → replace with `<input>` pre-filled with current name
- Enter/blur → call `onRenameNote` or `onRenameFolder`
- Escape → revert

**C4 — New Folder Flow**
- "New Folder" in context menu or toolbar: immediately call `onCreateFolder(parentPath, 'New Folder')` which creates a note in that path; select the new note

**C5 — Delete with Confirmation**
- Note delete: simple confirm dialog (shadcn `AlertDialog`)
- Folder delete: `AlertDialog` listing note titles that will be deleted

**C6 — Export Actions in Context Menu**
- Note context menu: add "Export as .md" → `exportNote` server action → Blob download
- Toolbar (or root context menu): "Export vault as .zip" → `exportAllNotes` → `jszip` → Blob download

**C7 — Updated Props**
- Wire all new `onXxx` callbacks in `brain/page.tsx`

---

### Phase D — Markdown Editor Rebuild

**Goal**: Working preview, split view, keyboard shortcuts.

**D1 — Replace Library**
- Swap `react-markdown-editor-lite` `MdEditor` import for `@uiw/react-md-editor`
- Preserve dynamic import pattern
- Map existing `value`/`onChange` props to new component API

**D2 — View Mode Toggle**
- Add `viewMode` state: `'edit' | 'preview' | 'split'`
- Render toolbar button group with three icons
- Pass `preview` prop to `MDEditor`: `'edit'` | `'preview'` | `'live'` (maps to the three modes)

**D3 — Keyboard Shortcuts**
- `@uiw/react-md-editor` ships Ctrl+B / Ctrl+I / Ctrl+` by default — verify and document

**D4 — Export Button**
- Add "Export note" icon button to editor toolbar; calls `exportNote` and triggers download

---

### Phase E — AI Chat Panel Rebuild

**Goal**: Streaming output, markdown-rendered responses, full context passed.

**E1 — Streaming Consumer**
- Replace `chatWithAI()` call with `streamChatWithAI()`
- Track `streamingContent: string` state
- Show in-progress bubble while streaming; commit to messages on stream end

**E2 — Markdown Rendering**
- Replace plain `{m.content}` render with `<ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>`
- Apply prose styling to assistant bubbles

**E3 — Active Note Context**
- Pass `currentNote?.id` as `activeNoteId` in every chat request
- Add `onNoteUpdated` prop; call when AI tool feedback suggests an update occurred

**E4 — Error Handling**
- On stream error: show error bubble with "Retry" button
- Retry re-sends the last user message

---

### Phase F — Resizable Layout

**Goal**: Draggable, collapsible panels with session persistence.

**F1 — Install Layout**
- Replace `grid grid-cols-[250px_1fr_300px]` in `page.tsx` with `<PanelGroup direction="horizontal">`
- Three `<Panel>` components: file tree (defaultSize 20, minSize 10, collapsible collapsedSize 3), editor (defaultSize 55, minSize 30), AI chat (defaultSize 25, minSize 10, collapsible collapsedSize 3)
- `<PanelResizeHandle>` between each pair

**F2 — Collapse-to-Icon-Bar**
- When file tree collapsed: show a vertical icon strip with FolderOpen icon; click to `panelRef.expand()`
- When AI chat collapsed: show a vertical strip with Bot icon; click to expand
- Use `onCollapse` / `onExpand` callbacks from `react-resizable-panels`

**F3 — Session Persistence**
- `onLayout` callback: save panel sizes array to `sessionStorage`
- On mount: read from `sessionStorage`, pass as `defaultLayout` prop to `PanelGroup`

**F4 — Mobile (Unchanged)**
- Existing `useMediaQuery` + Tabs pattern is preserved for viewports < 768px
- On mobile, add `onNoteUpdated` callback to the AI tab

---

## Complexity Tracking

No constitution violations. No complexity justification required.

---

## Dependency Decision Summary

| Need | Package | Replace |
|------|---------|---------|
| Markdown editor with preview | `@uiw/react-md-editor` | `react-markdown-editor-lite` |
| Resizable collapsible panels | `react-resizable-panels` | CSS grid (fixed widths) |
| Markdown render in chat | `react-markdown` + `remark-gfm` | plain text |
| Drag-and-drop | `@dnd-kit/core` | none (new) |
| Vault zip export | `jszip` | none (new) |
