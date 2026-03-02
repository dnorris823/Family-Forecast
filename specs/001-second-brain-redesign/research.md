# Research: Second Brain Redesign

**Branch**: `001-second-brain-redesign` | **Date**: 2026-02-28

---

## Decision 1 — Markdown Editor Library

**Decision**: Replace `react-markdown-editor-lite` with `@uiw/react-md-editor`

**Rationale**:
- `react-markdown-editor-lite` renders HTML by passing the raw text string through `renderHTML` with no parser — preview is non-functional without wiring a separate markdown parser manually.
- `@uiw/react-md-editor` ships edit / preview / split view as a first-class feature with proper markdown rendering via its internal remark/rehype pipeline. No extra wiring needed.
- Requires `dynamic()` import to avoid SSR — identical pattern already used for `react-markdown-editor-lite`, so no new architectural change.
- Actively maintained (2024–2025). TypeScript included. ~350KB gzipped (acceptable trade for full feature coverage).
- Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.) are built in.

**Alternatives Considered**:
- `@mdxeditor/editor` — excellent but ~900KB gzipped; full MDX authoring is overkill for a personal notes app.
- `react-simplemde-editor` (EasyMDE / CodeMirror 5) — good editor experience but split view requires custom implementation; also based on older CodeMirror 5.
- `Tiptap` with markdown extension — WYSIWYG (not raw markdown), hides syntax from user; does not match Obsidian's source-mode feel.

**Migration note**: `react-markdown-editor-lite` can be removed from `package.json` once replaced.

---

## Decision 2 — Resizable Panels with Collapse Support

**Decision**: Use `react-resizable-panels`

**Rationale**:
- Purpose-built for exactly this use case: horizontal/vertical resizable panes with built-in `collapsible` and `collapsedSize` props that snap the panel to an icon-bar state when dragged past minimum.
- ~5KB gzipped (very lightweight).
- Fully TypeScript-typed. React 19 compatible.
- No SSR concerns — works safely with Next.js App Router when mounted client-side (no `dynamic` import needed; panels render only after hydration via `'use client'`).
- Author (Bryan Vaughn) actively maintains it; widely adopted (>7k stars).

**Implementation note for collapse-to-icon-bar**:
- `<Panel collapsible={true} collapsedSize={4} minSize={15}>` — when dragged below `minSize` (15%), panel snaps to `collapsedSize` (4% = ~40px icon strip).
- A click handler on the icon strip calls `panelRef.current.expand()` to restore to last width.
- Session persistence: store panel sizes in `sessionStorage` via the `onLayout` callback.

**Alternatives Considered**:
- `allotment` — based on VS Code's split-view internals; heavier (~50KB gzipped), more opinionated styling, collapse support is indirect.
- `react-split-pane` — unmaintained since 2021; known React 17+ compatibility issues.
- Native CSS Grid with resize handles — feasible but requires building drag logic and collapse state from scratch.

---

## Decision 3 — Markdown Rendering in AI Chat

**Decision**: Use `react-markdown` + `remark-gfm`

**Rationale**:
- Lightweight (~45KB gzipped). No XSS risk by default (no `dangerouslySetInnerHTML`; React elements only).
- `remark-gfm` adds GitHub Flavored Markdown: task checkboxes (`- [ ]`), tables, strikethrough — all expected from an AI assistant's responses.
- Handles incremental/streaming content gracefully: partial markdown renders as it arrives; the component re-renders with each new chunk appended to the string.
- Most widely adopted markdown renderer in the React ecosystem.

**Alternatives Considered**:
- `marked` + `DOMPurify` — fast but requires manual sanitization and `dangerouslySetInnerHTML`; more footguns.
- `@mdxeditor/editor` in read-only mode — gross overkill.

---

## Decision 4 — Streaming Ollama Responses Through Next.js App Router

**Decision**: Hybrid streaming — tool-calling loop runs with `stream: false`; the final response call switches to `stream: true` piped through a `ReadableStream`.

**Rationale**:
Ollama does not support streaming during tool call resolution (tool result messages interrupt the stream). The existing tool-calling loop architecture must stay synchronous. However, once the loop exits (no more `tool_calls` in the response), the final message to the user can be streamed.

**Implementation pattern**:

1. Run the existing tool loop unchanged with `stream: false`.
2. On the final iteration (no `tool_calls`), re-invoke Ollama with `stream: true` and pipe the NDJSON response through a `ReadableStream`:
   ```
   GET each chunk → parse JSON → extract chunk.message.content → enqueue to controller
   ```
3. Return `new Response(readableStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`.
4. Client (`brain-chat-panel.tsx`):
   - `const reader = response.body.getReader()`
   - Decode each chunk with `TextDecoder`
   - Append decoded text to a `streamingContent` state string
   - On stream end (`done === true`), commit the full message to the messages array.
5. The `chatWithAI()` wrapper in `lib/ai/client.ts` must be replaced with a streaming-aware function that accepts an `onChunk` callback.

**Note on `stream: false` fallback**: If `stream: true` fails (e.g., older Ollama version), fall back to returning `NextResponse.json({ response: content })` as today — the client should detect the response type.

---

## Decision 5 — Drag-and-Drop in File Tree

**Decision**: Use `@dnd-kit/core` (without `@dnd-kit/sortable`)

**Rationale**:
- The use case is "drag note onto folder" — not reordering within a sortable list. `@dnd-kit/core` alone covers this: `useDraggable` on note items, `useDroppable` on folder items.
- Actively maintained; replaced `react-beautiful-dnd` (deprecated by Atlassian in 2022).
- React 19 compatible. TypeScript support. Accessible by default (keyboard support built in).
- ~13KB gzipped for `@dnd-kit/core`.

**Implementation pattern**:
- Wrap the file tree in `<DndContext onDragEnd={handleDragEnd}>`.
- Each note item: `const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: note.id })`.
- Each folder item: `const { isOver, setNodeRef } = useDroppable({ id: folder.path })`.
- `handleDragEnd(event)`: extract `active.id` (note ID) and `over.id` (folder path) → call `moveNote(noteId, folderPath)` server action.
- Visual indicator: apply `bg-accent` class when `isOver === true` on the folder.

**Alternatives Considered**:
- `react-beautiful-dnd` — deprecated; not React 19 compatible.
- `react-dnd` — older API, larger setup; React 19 compatibility uncertain.
- Native HTML5 drag-and-drop — works but: no touch support, no accessible keyboard fallback, custom styling of drag ghost is limited.

---

## Decision 6 — Vault Export

**Decision**: Use `jszip` for multi-note `.zip` export; single-note export uses a plain Blob download.

**Rationale**:
- `jszip` is the standard browser-compatible zip library. ~95KB gzipped; loaded only when user triggers export (dynamic import appropriate).
- Single note: `new Blob([content], { type: 'text/markdown' })` → `URL.createObjectURL` → `<a download>` click — no library needed.
- Multi-note: `jszip` reconstructs the `folder_path` hierarchy as nested directories in the archive.

**Implementation note**: Export runs entirely client-side — no new API route needed. The notes data is already loaded in component state.

---

## Decision 7 — Shared Note Ownership Enforcement (Spec Clarification B)

**Decision**: Access control enforced at the server action layer, not via Supabase RLS changes.

**Rationale**:
- Spec clarification B: any family member can edit or delete a shared note.
- Spec clarification: only the creator can edit/delete private notes.
- Rule: `UPDATE/DELETE allowed if (note.created_by === user.id) OR (note.is_shared === true AND note.family_id === user.family_id)`.
- Enforced in `actions.ts` by composing the correct `.eq()` / `.or()` filter on every mutating query — avoids requiring a Supabase RLS policy change that could affect other features.

---

## Decision 8 — "Create Folder" Without a DB Folder Table

**Decision**: Folders remain virtual. "New Folder" creates an optimistic local node; a new "Untitled" note is immediately inserted into that folder path to give it persistence.

**Rationale**:
- The spec and data model define `Folder` as virtual (no DB record). Adding a `folders` table is scope creep.
- Creating an "Untitled" note inside the new folder is consistent with the existing `handleCreateNote` pattern.
- The folder node's inline name field renames the note and updates its `folder_path` prefix before the note is fully created — the folder name and note creation are one atomic UX action.
- If the user cancels naming, the optimistic node is discarded (no DB write).

---

## Decision 9 — Context Payload for AI (Spec Clarification A)

**Decision**: Rewrite `getFreshContext()` in `api/ai/chat/route.ts` to apply privacy-filtered, unlimited queries.

**Changes from current implementation**:

| Field | Current | New |
|-------|---------|-----|
| Events | 7-day window, limit 10, no privacy filter | No date restriction, no limit, privacy-filtered |
| Tasks | Active only, limit 10, no privacy filter | All statuses, no limit, privacy-filtered |
| Notes | Title only, limit 5 | Full content, all notes, current user only |
| Privacy rule | None | Own items always included; other members' items only if `is_private = false` |

**Token overflow mitigation**: If the assembled context string exceeds 6000 characters (a conservative heuristic for most local models), truncate in priority order: active note > tasks > near-term events > far-future events > note content (most recent first).

---

## New Tool Required: `update_note`

The spec requires the AI to be able to modify existing notes (FR-018). Currently only `create_note` exists. A new `update_note` tool must be added to both `tool-definitions.ts` and `tools.ts`.

**Schema**:
```
update_note(note_id: string, title?: string, content?: string, is_shared?: boolean)
```

**Access control**: Follows Decision 7 — allowed if creator, or if note is shared and user is in same family.
