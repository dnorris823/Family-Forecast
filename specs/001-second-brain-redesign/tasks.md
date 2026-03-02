# Tasks: Second Brain — Obsidian-Style Redesign

**Input**: Design documents from `/specs/001-second-brain-redesign/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not requested in spec. No test tasks generated.

**Organization**: Tasks are grouped by user story. Each phase is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Install new dependencies and remove the replaced library. No functional changes.

- [x] T001 Install new npm packages: `@uiw/react-md-editor react-resizable-panels react-markdown remark-gfm @dnd-kit/core jszip` (run in repo root, updates `package.json` and `package-lock.json`)
- [x] T002 Remove old package: `npm uninstall react-markdown-editor-lite` (updates `package.json` and `package-lock.json`)
- [x] T003 Verify `npm run build` passes after dependency changes with no new errors (no file edits — build validation only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix the `Note` type field name that is inconsistent with the actual database column. This must be resolved before any feature work to prevent cascading TypeScript errors.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Fix `Note` type in `src/types/index.ts`: rename field `user_id: string` → `created_by: string` to match the actual Supabase column used throughout the codebase
- [x] T005 [P] Search all files that reference `note.user_id` or `n.user_id` and update them to `note.created_by` / `n.created_by` (likely affects `src/components/brain/file-tree.tsx` and any component that checks ownership)
- [x] T006 Verify `npm run build` passes with zero TypeScript errors after the type rename

**Checkpoint**: Build is clean — user story work can begin.

---

## Phase 3: User Story 1 — Full-Featured File Tree (Priority: P1) 🎯 MVP

**Goal**: Users can create, rename, move, and delete notes and folders entirely within the file tree sidebar, with drag-and-drop support.

**Independent Test**: With a fresh set of notes, a user can: create a folder, create a note inside it, rename both, drag the note to a different folder, and delete the original folder with confirmation — all without navigating away from the page.

### Server Actions for User Story 1

- [x] T007 [US1] Add `deleteNote(noteId: string)` to `src/app/dashboard/brain/actions.ts` — deletes from `second_brain` where `id = noteId AND (created_by = userId OR (is_shared = true AND family_id = userFamilyId))`; returns `{ success: true }` or `{ error: string }`
- [x] T008 [US1] Add `renameNote(noteId: string, newTitle: string)` to `src/app/dashboard/brain/actions.ts` — partial update of `title` only; same access control as T007
- [x] T009 [US1] Add `moveNote(noteId: string, newFolderPath: string)` to `src/app/dashboard/brain/actions.ts` — updates `folder_path`; restricted to `created_by = userId` only (creator-only per data-model.md)
- [x] T010 [US1] Add `renameFolder(oldPath: string, newPath: string)` to `src/app/dashboard/brain/actions.ts` — bulk updates `folder_path` for all notes where `folder_path LIKE oldPath%` AND `created_by = userId`; replaces the `oldPath` prefix with `newPath`
- [x] T011 [US1] Add `deleteFolder(folderPath: string)` to `src/app/dashboard/brain/actions.ts` — deletes all notes under `folderPath` where access control permits (same rule as T007); returns `{ deleted: number, errors: string[] }`
- [x] T012 [US1] Add `exportNote(noteId: string)` to `src/app/dashboard/brain/actions.ts` — read-only fetch; returns `{ title, content, folderPath }` for notes the user can see
- [x] T013 [US1] Add `exportAllNotes()` to `src/app/dashboard/brain/actions.ts` — returns all `Note[]` the current user can see (own notes + shared notes in same family)
- [x] T014 [US1] Fix `updateNote` access control in `src/app/dashboard/brain/actions.ts` — change the WHERE clause from `.eq('created_by', user.id)` to `.or('created_by.eq.' + userId + ',and(is_shared.eq.true,family_id.eq.' + familyId + ')')` so family members can edit shared notes

### File Tree Component Rebuild for User Story 1

- [x] T015 [US1] Wrap the file tree JSX in `src/components/brain/file-tree.tsx` with `<DndContext onDragEnd={handleDragEnd}>` from `@dnd-kit/core`; add `useDraggable({ id: note.id })` to each note item row (apply `attributes`, `listeners`, `setNodeRef`; set `opacity-50` when `isDragging`); add `useDroppable({ id: folder.path })` to each folder item row (apply `bg-accent` ring when `isOver`)
- [x] T016 [US1] Add `handleDragEnd(event: DragEndEvent)` in `src/components/brain/file-tree.tsx` — extracts `active.id` (note ID) and `over?.id` (folder path); calls `props.onMoveNote(activeId, overId)` if both are present and `over.id !== currentFolderPath`
- [x] T017 [US1] Add right-click context menu to `src/components/brain/file-tree.tsx` using `@radix-ui/react-dropdown-menu` (already installed) — note items show: "Rename", "Delete", "Export as .md"; folder items show: "Rename", "Delete", "New Note", "New Folder"
- [x] T018 [US1] Implement inline rename in `src/components/brain/file-tree.tsx`: on double-click of a name span, replace it with an `<input>` pre-filled with the current name; Enter/blur → call `props.onRenameNote` or `props.onRenameFolder`; Escape → revert; empty string → discard
- [x] T019 [US1] Add `onCreateFolder` handler in `src/components/brain/file-tree.tsx` — when "New Folder" is selected from context menu, calls `props.onCreateFolder(parentPath, 'New Folder')` immediately (a note is created in the parent to make the flow work; see T022)
- [x] T020 [US1] Add per-folder "New Note" button visible on hover in `src/components/brain/file-tree.tsx` — small `+` icon appearing on the right side of each folder row on hover; calls `props.onCreateNote(folder.path)` (already exists but was root-only)
- [x] T021 [US1] Add delete confirmation dialog in `src/components/brain/file-tree.tsx` using shadcn `AlertDialog` — for note delete: simple "Are you sure?" message; for folder delete: lists note titles that will be deleted; on confirm calls `props.onDeleteNote` / `props.onDeleteFolder`
- [x] T022 [US1] Update `src/app/dashboard/brain/page.tsx` to wire all new callbacks into `<FileTree>`: add handlers for `onRenameNote` (calls `renameNote` action), `onRenameFolder` (calls `renameFolder` action), `onDeleteNote` (calls `deleteNote` action), `onDeleteFolder` (calls `deleteFolder` action), `onMoveNote` (calls `moveNote` action), `onCreateFolder` (calls `createNote` with the new folder path to materialise the folder)
- [x] T023 [US1] Add "Export as .md" click handler in `src/components/brain/file-tree.tsx` context menu — calls `exportNote(noteId)` server action, creates a `Blob` with the returned `content`, prepends `# title\n\n` if not already present, triggers download via `URL.createObjectURL` + programmatic `<a>` click
- [x] T024 [US1] Add "Export vault" button to the file tree header area in `src/components/brain/file-tree.tsx` (next to the existing "New Note" `+` button) — on click: dynamically imports `jszip`, calls `exportAllNotes()`, groups notes by `folderPath` into the zip directory structure, triggers download of `second-brain-export.zip`

**Checkpoint**: File tree is fully interactive — create, rename, move, delete, and export all work without page reload.

---

## Phase 4: User Story 2 — Markdown Editor with Working Preview (Priority: P2)

**Goal**: The editor has three working view modes (Edit / Preview / Split). Preview correctly renders markdown. Keyboard shortcuts insert formatting.

**Independent Test**: Open any note, type `## Heading`, `**bold**`, `- [ ] task`, and a fenced code block; toggle through edit/preview/split modes and verify each renders correctly. Auto-save confirms within 2 seconds.

### Editor Component Rebuild for User Story 2

- [x] T025 [P] [US2] Replace the `react-markdown-editor-lite` dynamic import in `src/components/brain/markdown-editor.tsx` with `@uiw/react-md-editor`: change the `dynamic(() => import('react-markdown-editor-lite'))` to `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })`; also import `'@uiw/react-md-editor/markdown-editor.css'` instead of the old CSS import
- [x] T026 [US2] Add `viewMode` state (`'edit' | 'preview' | 'live'`) to `src/components/brain/markdown-editor.tsx`; add a three-button toggle group in the toolbar area (Edit / Preview / Split icons using lucide-react `PenLine`, `Eye`, `Columns2`); pass `preview={viewMode}` to `<MDEditor>`
- [x] T027 [US2] Map the existing `value`/`onChange` props to the `@uiw/react-md-editor` API in `src/components/brain/markdown-editor.tsx` — `value={content}` and `onChange={(val) => { setContent(val ?? ''); debouncedSave() }}`; remove the old `{ text }` destructure from `handleEditorChange`
- [x] T028 [US2] Add "Export note" icon button (`Download` from lucide-react) to the editor toolbar in `src/components/brain/markdown-editor.tsx` — on click: calls `exportNote(note.id)` server action, prepends `# title\n\n` if not present, downloads as `[title].md` via Blob
- [x] T029 [US2] Verify keyboard shortcuts in `src/components/brain/markdown-editor.tsx` — `@uiw/react-md-editor` ships Ctrl+B/Ctrl+I by default; confirm Ctrl+` for inline code works; add a comment block documenting the shortcuts in the component file
- [x] T030 [US2] Remove the now-unused `import "react-markdown-editor-lite/lib/index.css"` from `src/components/brain/markdown-editor.tsx` and verify no CSS bleed from the old library (check for leftover `.rc-md-editor` class styles)

**Checkpoint**: Editor renders markdown correctly in all three view modes. Auto-save works. Export button downloads a `.md` file.

---

## Phase 5: User Story 3 — AI Assistant with Full Context (Priority: P3)

**Goal**: The AI receives all notes (full content), all events (privacy-filtered, no date cap), and all tasks. Responses stream incrementally and are rendered as formatted markdown. AI can create and update notes.

**Independent Test**: Ask the AI "What tasks are overdue and what events do I have this month?" without providing any data manually. Confirm the response references real data. Ask it to update a note by name. Confirm the file tree reflects the change.

### AI Backend Changes for User Story 3

- [x] T031 [P] [US3] Add `update_note` tool schema to `src/lib/ai/tool-definitions.ts` — object with `name: 'update_note'`, `description: 'Update an existing note in Second Brain. Provide only the fields to change.'`, parameters: `{ note_id: string (required), title?: string, content?: string, is_shared?: boolean }`
- [x] T032 [US3] Add `update_note` implementation to `src/lib/ai/tools.ts` in the `executeAITool` switch block — fetches the note, checks access (`created_by === userId OR (is_shared AND family_id matches)`), applies partial update for provided fields only; returns `{ success: true, note }` or `{ error: string }`
- [x] T033 [US3] Rewrite `getFreshContext()` in `src/app/api/ai/chat/route.ts` to accept `activeNoteId?: string` from the request body and expand all queries: (a) events — remove the `gte`/`lte` date filter and `limit(10)`; add privacy filter `(created_by.eq.${userId},and(is_private.eq.false,family_id.eq.${familyId}))`; (b) tasks — remove `neq('done')` and `limit(10)`; apply same privacy filter; (c) notes — select full `content`, remove `limit(5)`, filter to `created_by = userId` only; (d) if `activeNoteId` provided, fetch that note separately and prepend as "Currently open note:" at the top of the context string
- [x] T034 [US3] Add token overflow truncation to `getFreshContext()` in `src/app/api/ai/chat/route.ts` — after assembling the context string, if `contextStr.length > 6000`: (1) keep active note in full, (2) keep all tasks, (3) drop events with `start_time` more than 30 days from today, (4) if still over limit, reduce note entries to title-only (strip `content` from the formatted string for notes beyond the 10 most recent)
- [x] T035 [US3] Add streaming to final AI response in `src/app/api/ai/chat/route.ts` — in the tool-loop's final iteration (the `return NextResponse.json({ response: assistantMessage.content })` block), replace with: re-call Ollama with the same messages array but `stream: true`; create a `ReadableStream` that reads each NDJSON chunk, parses `JSON.parse(chunk)`, extracts `.message.content`, and enqueues it to the stream controller; return `new Response(readableStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`
- [x] T036 [US3] Add `streamChatWithAI(messages, model, activeNoteId, onChunk)` function to `src/lib/ai/client.ts` — POSTs to `/api/ai/chat` with `{ messages, model, activeNoteId }`; reads the response body as a stream using `response.body.getReader()`; decodes each chunk with `new TextDecoder()`; calls `onChunk(decodedText)` for each chunk; returns a `Promise<void>` that resolves when the stream closes. Keep the existing `chatWithAI()` function intact for any other callers.

### AI Chat Panel Rebuild for User Story 3

- [x] T037 [US3] Update `src/components/brain/brain-chat-panel.tsx` props to add `activeNoteId: string | null` and `onNoteUpdated?: () => void`; pass `activeNoteId` to `streamChatWithAI`; call `onNoteUpdated()` when the completed response includes action phrases for note modification (check for "I've updated", "I've modified", "updated the note")
- [x] T038 [US3] Replace the `chatWithAI()` call in `src/components/brain/brain-chat-panel.tsx` with `streamChatWithAI()` — add `streamingContent: string` state; in `handleSend`, add a streaming assistant bubble showing `streamingContent` with a blinking cursor while loading; on stream end, push the completed message to `messages` and clear `streamingContent`
- [x] T039 [US3] Replace plain `{m.content}` message rendering in `src/components/brain/brain-chat-panel.tsx` with `<ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>` for assistant messages; add `prose prose-sm dark:prose-invert max-w-none` Tailwind classes to the assistant bubble `div` for readable typography
- [x] T040 [US3] Add error/retry UI to `src/components/brain/brain-chat-panel.tsx` — wrap the `streamChatWithAI` call in try/catch; on error, push an error message bubble with a "Retry" button that re-sends `messages[messages.length - 1]` (the last user message)
- [x] T041 [US3] Wire `activeNoteId` and `onNoteUpdated` in `src/app/dashboard/brain/page.tsx` — pass `selectedNoteId` as `activeNoteId` to `<BrainChatPanel>`; implement `onNoteUpdated` handler to call `fetchNotes()` (same pattern as existing `onNoteCreated`)

**Checkpoint**: AI receives full, privacy-filtered context. Responses stream token-by-token and render as formatted markdown. AI can update notes and the tree refreshes automatically.

---

## Phase 6: User Story 4 — Resizable Responsive Workspace (Priority: P4)

**Goal**: Desktop users can drag panel dividers to resize panels and collapse either sidebar to an icon strip. Session layout is remembered. Mobile tab layout is unaffected.

**Independent Test**: On desktop, drag the file tree panel to ~10% width and confirm it snaps to collapsed state with a folder icon strip. Click the strip to re-expand. Drag the AI panel off-screen and confirm it collapses. Reload the page; panel sizes restore from session. On mobile (resize browser < 768px), confirm the three-tab layout appears with state preserved between tabs.

### Layout Changes for User Story 4

- [x] T042 [P] [US4] Replace the `grid grid-cols-[250px_1fr_300px]` desktop layout div in `src/app/dashboard/brain/page.tsx` with `<PanelGroup direction="horizontal" id="brain-panels" onLayout={(sizes) => sessionStorage.setItem('brain-panel-sizes', JSON.stringify(sizes))}>`; add `<PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors">` between each pair of panels
- [x] T043 [US4] Configure the three `<Panel>` components inside the `PanelGroup` in `src/app/dashboard/brain/page.tsx`: file tree panel — `ref={fileTreePanelRef} defaultSize={20} minSize={10} collapsible={true} collapsedSize={3} onCollapse={() => setFileTreeCollapsed(true)} onExpand={() => setFileTreeCollapsed(false)}`; editor panel — `defaultSize={55} minSize={30}` (not collapsible); AI chat panel — `ref={aiPanelRef} defaultSize={25} minSize={10} collapsible={true} collapsedSize={3} onCollapse={() => setAiCollapsed(true)} onExpand={() => setAiCollapsed(false)}`
- [x] T044 [US4] Add `fileTreeCollapsed` and `aiCollapsed` boolean states plus `fileTreePanelRef` and `aiPanelRef` (`useRef<ImperativePanelHandle>()`) in `src/app/dashboard/brain/page.tsx`; when `fileTreeCollapsed` is true, render an icon strip (`<div>` with `FolderOpen` icon centered, `onClick={() => fileTreePanelRef.current?.expand()}`) instead of the `<FileTree>` component; same pattern for AI panel with `Bot` icon
- [x] T045 [US4] Add session persistence on mount in `src/app/dashboard/brain/page.tsx` — in a `useEffect`, read `sessionStorage.getItem('brain-panel-sizes')`; if found, parse the array and pass as `defaultLayout={savedLayout}` prop to `<PanelGroup>`; handle parse errors gracefully with a `try/catch`
- [x] T046 [US4] Verify the mobile tab layout in `src/app/dashboard/brain/page.tsx` is unaffected — the existing `isMobile` branch renders the `<Tabs>` component; confirm the `<BrainChatPanel>` in the AI tab now receives the new `activeNoteId` and `onNoteUpdated` props (added in T041); also confirm `onNoteUpdated` is wired in the mobile tabs branch

**Checkpoint**: Desktop panels resize and collapse correctly. Layout survives page reload. Mobile tabs work unchanged with the new props.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge-case checks, and cleanup.

- [x] T047 [P] Remove the now-unused `react-markdown-editor-lite` CSS import from `src/components/brain/markdown-editor.tsx` if not already removed in T030, and search the codebase for any remaining references to `react-markdown-editor-lite` using grep; remove any lingering imports
- [x] T048 [P] Verify the AI context privacy rule end-to-end using quickstart.md step "Verifying the AI Context Expansion" — ask the AI about a private event from another family member and confirm it does not appear in the response; ask about your own private note and confirm it does appear
- [x] T049 Run `npm run lint` and `npm run build` and fix any remaining ESLint errors or TypeScript compilation errors across all modified files
- [x] T050 [P] Verify the vault export: trigger "Export vault as .zip" from the file tree header; confirm the downloaded zip contains `.md` files with folder paths preserved as nested directories matching the `folder_path` hierarchy in the database
- [x] T051 Perform a full manual walkthrough of all four user stories per the acceptance scenarios in `specs/001-second-brain-redesign/spec.md` sections P1–P4 and confirm each scenario passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — independent of US2, US3, US4
- **Phase 4 (US2)**: Depends on Phase 2 — independent of US1, US3, US4
- **Phase 5 (US3)**: Depends on Phase 2 — independent of US1, US2, US4
- **Phase 6 (US4)**: Depends on Phase 2 AND Phase 3 (US1), AND Phase 5 (US3) — the layout wires components that must exist first
- **Phase 7 (Polish)**: Depends on all story phases completing

### User Story Dependencies

- **US1 (P1 - File Tree)**: After Phase 2 — no dependency on US2, US3
- **US2 (P2 - Editor)**: After Phase 2 — no dependency on US1, US3
- **US3 (P3 - AI Chat)**: After Phase 2 — no dependency on US1, US2
- **US4 (P4 - Layout)**: After US1 and US3 complete (layout wires both components with their new props)

### Within Each User Story

- Server actions (T007–T014) before component that calls them (T015–T024) for US1
- Backend changes (T031–T036) before chat panel rebuild (T037–T041) for US3
- Panel components (US1, US3) must be complete before layout integration (US4)

### Parallel Opportunities

- T025 (editor library swap) is independent of all US1 server action tasks (T007–T014)
- T031 (update_note schema) is independent of T033–T035 (context/streaming changes)
- Once Phase 2 is done: US1 server actions (T007–T014) and US2 editor swap (T025) and US3 backend (T031–T036) can all proceed in parallel
- T047 and T048 in Polish phase can run in parallel

---

## Parallel Example: User Story 1 + User Story 2

```
# After Phase 2 completes, these can run simultaneously:

Thread A (US1 — File Tree):
  T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014
  then T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024

Thread B (US2 — Editor):
  T025 → T026 → T027 → T028 → T029 → T030

Thread C (US3 — AI Backend):
  T031 (parallel with T033-T035)
  T032 → T033 → T034 → T035 → T036
  then T037 → T038 → T039 → T040 → T041
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (type fix)
3. Complete Phase 3: US1 (file tree CRUD + DnD + export)
4. **STOP AND VALIDATE**: Full file tree workflow works independently
5. Ship/demo: users can organize their notes even before editor or AI improvements land

### Incremental Delivery

1. **Phase 1 + 2** → Foundation clean
2. **+ Phase 3 (US1)** → Fully interactive file tree (MVP)
3. **+ Phase 4 (US2)** → Working markdown preview
4. **+ Phase 5 (US3)** → Full-context AI with streaming
5. **+ Phase 6 (US4)** → Resizable workspace
6. **+ Phase 7** → Polish complete

### Single Developer Recommended Order

Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7

---

## Notes

- [P] tasks touch different files and have no unresolved dependencies on the same phase
- [Story] label maps each task to its user story for traceability
- `react-resizable-panels` `ImperativePanelHandle` requires `import type { ImperativePanelHandle } from 'react-resizable-panels'`
- The `@uiw/react-md-editor` `preview` prop accepts `'edit' | 'preview' | 'live'` (not 'split') — map the UI label "Split" → `'live'`
- Streaming NDJSON from Ollama: each line is a complete JSON object; use `chunk.split('\n').filter(Boolean)` before `JSON.parse`
- The `jszip` import in T024 must be dynamic: `const JSZip = (await import('jszip')).default`
- Supabase `.or()` filter for access control: `.or(\`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})\`)`
