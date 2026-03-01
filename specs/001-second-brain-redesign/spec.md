# Feature Specification: Second Brain — Obsidian-Style Redesign

**Feature Branch**: `001-second-brain-redesign`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Redesign Second Brain page as a lightweight Obsidian-like note-taking app with three panels: left file tree sidebar, center markdown editor, and right AI agent chat sidebar with full context of calendar events, tasks, and notes"

---

## Background & Current State

The Second Brain page already has a three-panel desktop layout and a tabbed mobile layout. However, all three panels are functional stubs with significant gaps:

- **File tree**: supports expand/collapse, search, and root-level note creation. Missing: folder creation, rename, delete, move, and context menus.
- **Markdown editor**: uses an existing library but markdown preview is non-functional (raw text is passed through without parsing). Missing: proper toggle between edit/preview/split views and a working rendered preview.
- **AI chat**: sends conversation history to the Ollama proxy but injects only a narrow context window (7-day events, active tasks, recent notes). Missing: full context scope, markdown rendering of responses, and streaming output.

This feature closes those gaps to produce a cohesive, Obsidian-inspired workspace.

---

## Clarifications

### Session 2026-02-28

- Q: When a note is shared with the family, what can other family members do with it? → A: Full collaboration — any family member can edit or delete any shared note (Option B).
- Q: Should the AI context include private events/tasks belonging to other family members? → A: Privacy-respecting — AI sees the current user's own items (private + shared) plus only non-private items from other family members (Option A).
- Q: Should file tree search cover note body content (full-text) or title/folder name only? → A: Title and folder name only; body content search is out of scope for this version (Option A).
- Q: Should users be able to import or export `.md` files? → A: Export only — users can download individual notes or their entire vault as `.md` files; import is out of scope (Option B).
- Q: When dragging a panel divider, can a panel be fully collapsed or does it always stay at a minimum visible width? → A: Collapsible — dragging past minimum snaps to a collapsed icon-bar state; clicking the icon re-expands to last width (Option B).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Organize Notes via a Full-Featured File Tree (Priority: P1)

A family member wants to restructure their notes into topic folders without leaving the page. They right-click a note to rename it, drag it into a new folder, and create a sub-folder for a new project — all without any page navigation.

**Why this priority**: The file tree is the primary navigation mechanism for the entire page. Without full CRUD on notes and folders, the editor and AI panels have limited value.

**Independent Test**: Can be fully tested by creating a folder hierarchy, populating it with notes, renaming items, moving them between folders, and deleting them — confirming the tree reflects every change immediately.

**Acceptance Scenarios**:

1. **Given** the file tree is visible, **When** the user clicks a "New Note" button next to a specific folder, **Then** an untitled note is created inside that folder and immediately selected for editing.
2. **Given** the file tree is visible, **When** the user clicks a "New Folder" button, **Then** a new folder appears at the chosen level with an inline name-entry field active.
3. **Given** a note or folder exists, **When** the user right-clicks it, **Then** a context menu appears with relevant options (Rename, Delete for notes; Rename, Delete, New Note, New Folder for folders).
4. **Given** a note or folder exists, **When** the user double-clicks its name, **Then** the name becomes an inline editable field; pressing Enter or clicking away saves the new name.
5. **Given** a note exists, **When** the user drags it onto a different folder, **Then** the note moves to that folder and the tree updates immediately.
6. **Given** a folder with notes exists, **When** the user selects Delete on the folder, **Then** a confirmation dialog lists the affected notes and deletion only proceeds after explicit confirmation.
7. **Given** a search term is entered, **When** matching notes exist, **Then** only matching notes and their ancestor folders are shown; folders auto-expand to reveal matches.

---

### User Story 2 — Write and Preview Markdown with a Proper Editor (Priority: P2)

A user writes a note using markdown formatting. They toggle to preview mode to see rendered headings, bold text, code blocks, and lists. They then switch to split view to write and preview simultaneously.

**Why this priority**: The editor is the core value proposition of a notes app. A broken or awkward preview experience undermines user trust and adoption.

**Independent Test**: Can be fully tested by writing a note containing headings, bold, italic, code blocks, and a checklist, then toggling through edit / preview / split modes and verifying each renders correctly.

**Acceptance Scenarios**:

1. **Given** a note is selected, **When** the editor loads, **Then** the note title is displayed in a prominent editable heading above the editor body.
2. **Given** the editor is in edit mode, **When** the user types markdown syntax, **Then** the raw markdown text is shown without transformation.
3. **Given** the editor is in preview mode, **When** the user views the note, **Then** markdown is rendered as formatted content — headings, bold, italic, lists, code blocks, blockquotes, links, and task checkboxes.
4. **Given** the editor is in split mode, **When** the user types in the edit pane, **Then** the preview pane updates in real time.
5. **Given** the user has made changes to a note, **When** approximately 1 second elapses without further edits, **Then** the note auto-saves and a brief "Saved" indicator appears.
6. **Given** a note is open, **When** the user presses a markdown keyboard shortcut (e.g., Ctrl+B for bold, Ctrl+I for italic), **Then** the appropriate markdown syntax is inserted around selected text or at the cursor.
7. **Given** no note is selected, **When** the editor pane is visible, **Then** a clear empty state with a prompt to select or create a note is shown.
8. **Given** a note is open, **When** the user toggles "Share with family", **Then** the change is persisted and the shared indicator in the file tree updates.

---

### User Story 3 — AI Assistant with Full Personal and Family Context (Priority: P3)

A user asks the AI assistant to summarize their week: upcoming calendar events, overdue tasks, and relevant notes. The AI has access to the full notes collection, all calendar events, and all tasks — not just a narrow recent window. The currently open note is also highlighted as immediate context.

**Why this priority**: The AI panel differentiates Second Brain from a plain note editor. Expanding context makes the assistant genuinely useful for planning and reflection.

**Independent Test**: Can be fully tested by asking the AI about upcoming events and open tasks without mentioning any specifics, then confirming the response accurately reflects real data from the database.

**Acceptance Scenarios**:

1. **Given** the AI chat is open, **When** the user sends a message, **Then** the AI receives context including: all the user's notes, the currently open note flagged as active, all family calendar events (no date restriction), and all family tasks with status and priority.
2. **Given** the AI responds with markdown formatting, **When** the response is displayed, **Then** it is rendered as formatted text (not raw markdown syntax).
3. **Given** the AI is generating a response, **When** tokens stream back from the model, **Then** the response appears incrementally in the chat UI rather than all at once after a delay.
4. **Given** the user asks the AI to create or update a note, **When** the AI performs the action via tool call, **Then** the file tree and editor update to reflect the change without a full page reload.
5. **Given** the user asks the AI to create a calendar event or task, **When** the AI performs the action, **Then** the AI confirms the creation in chat.
6. **Given** a note is open in the editor, **When** the user clicks "Ask about this note", **Then** the chat input is pre-populated referencing the note's title and the AI treats that note as primary context.
7. **Given** the user selects a different AI model from the model picker, **When** they send a message, **Then** the response comes from the selected model.
8. **Given** the AI service is unavailable, **When** the user sends a message, **Then** a clear error message appears with a retry option.

---

### User Story 4 — Resizable, Responsive Workspace (Priority: P4)

A user on a large monitor drags the divider between the file tree and editor to give more space to the editor. Later, on a tablet, they use tabs to switch between all three panels.

**Why this priority**: Layout flexibility respects different screen sizes and working styles without requiring separate designs.

**Independent Test**: Can be fully tested by dragging panel dividers on desktop and using tab navigation on mobile, verifying that each panel fills available space appropriately and state is preserved between tab switches.

**Acceptance Scenarios**:

1. **Given** the user is on a desktop viewport, **When** they drag the divider between any two adjacent panels, **Then** both panels resize proportionally and content reflows without overflow or clipping.
2. **Given** the user is on a mobile or tablet viewport (below 768px), **When** they view the Second Brain page, **Then** a tab bar appears with three tabs (Files, Editor, AI) and each tab shows one full-screen panel.
3. **Given** the user is on mobile and switches from the Editor tab to the Files tab, **When** they select a note, **Then** the selected note is shown when they switch back to the Editor tab.

---

### Edge Cases

- What happens when a user tries to create a note in a folder that was deleted by a real-time sync event? The note should fall back to the root folder or re-create the folder path.
- What happens if the Ollama service is unreachable? The AI panel shows a clear error with a retry action — no silent failure.
- What happens when a note is created but never given a title or content before navigating away? The note is preserved with the title "Untitled" and empty content.
- What happens when the AI context payload exceeds the model's token capacity? Context priority order is: currently open note > active tasks > upcoming events > full notes collection; older/lower-priority content is truncated gracefully.
- What happens when two family members rename the same note simultaneously? Last-write-wins via Supabase is acceptable; no merge conflict UI is required for MVP.
- What happens when a search matches a folder name but not any note names? Matching folders should be shown expanded to reveal their children.

---

## Requirements *(mandatory)*

### Functional Requirements

#### File Tree Panel

- **FR-001**: The file tree MUST support creating new folders at any nesting level of the hierarchy.
- **FR-002**: The file tree MUST support creating new notes directly inside any selected folder (not only the root).
- **FR-003**: Users MUST be able to rename notes and folders via both inline double-click editing and a right-click context menu. Any family member MAY rename any note (including notes created by others) when that note is marked as shared; only the note's creator may rename their own private notes.
- **FR-004**: Users MUST be able to delete notes individually; folder deletion MUST require a confirmation step that lists the notes that will be removed. Any family member MAY delete a shared note; only the creator may delete their own private notes.
- **FR-005**: Users MUST be able to move notes between folders via drag-and-drop.
- **FR-006**: The file tree MUST reflect real-time additions and changes from other family members without requiring a manual page refresh.
- **FR-007**: Folder expand/collapse state MUST persist for the duration of the user's page session.
- **FR-008**: The search field MUST filter note titles and folder names, auto-expanding ancestor folders of matching items. Searching inside note body content is explicitly out of scope for this version.

#### Markdown Editor Panel

- **FR-009**: The editor MUST support three view modes: Edit only, Preview only, and Split (edit + live preview side-by-side), switchable via a visible toggle control.
- **FR-010**: Preview mode MUST correctly render: headings (H1–H6), bold, italic, inline code, fenced code blocks, blockquotes, ordered lists, unordered lists, task checkboxes, and hyperlinks.
- **FR-011**: The editor MUST auto-save changes after approximately 1 second of inactivity with a visible "Saved" indicator.
- **FR-012**: The editor MUST support keyboard shortcuts for at minimum: bold (Ctrl+B), italic (Ctrl+I), and inline code (Ctrl+`).
- **FR-013**: The note title MUST be an editable field distinct from the body and MUST be included in every auto-save.
- **FR-014**: The "Share with family" toggle MUST be accessible from the editor toolbar and MUST persist on every save.

#### AI Chat Panel

- **FR-015**: Every AI request MUST include a context payload containing: all of the current user's own notes (private and shared), the currently open note explicitly flagged as active, and family calendar events and tasks filtered as follows — the current user's own events and tasks are included regardless of privacy flag; other family members' events and tasks are included only when their `is_private` flag is false.
- **FR-016**: AI responses MUST be rendered as formatted markdown in the chat UI, not as raw text.
- **FR-017**: AI responses MUST stream incrementally to the chat UI so the user sees output as it is generated.
- **FR-018**: When the AI creates or modifies a note via tool call, the file tree and editor MUST reflect the change without a full page reload.
- **FR-019**: The AI MUST retain the ability to create calendar events and tasks on behalf of the user (existing tool definitions must continue to work).
- **FR-020**: The model picker MUST list all Ollama models available at the time the page loads and the selection MUST persist for the session.
- **FR-021**: If the AI service is unavailable or returns an error, the chat panel MUST display a human-readable error message with a retry option.

#### Export

- **FR-025**: Users MUST be able to export an individual note as a `.md` file downloaded to their device, accessible from the editor toolbar or the file tree context menu.
- **FR-026**: Users MUST be able to export their entire notes collection as a `.zip` archive of `.md` files, with folder structure preserved as nested directories matching the `folder_path` hierarchy.
- **FR-027**: Exported `.md` files MUST include the note title as a top-level H1 heading if not already present in the content, so the file is self-contained and readable outside the app.
- **FR-028**: File import from device is explicitly out of scope for this version.

#### Layout & Responsiveness

- **FR-022**: On desktop viewports (768px and above), the three panels MUST be resizable via draggable dividers between adjacent panels.
- **FR-022a**: Each sidebar panel (file tree and AI chat) MUST support a collapsed state. When the user drags a panel divider past the panel's minimum usable width, the panel snaps to a collapsed icon-bar. Clicking the icon-bar re-expands the panel to its last recorded width.
- **FR-022b**: The editor (center) panel MUST NOT be collapsible — it is always visible and fills all space not occupied by the sidebars.
- **FR-023**: On mobile and tablet viewports (below 768px), the layout MUST use a tabbed interface with one panel visible at a time.
- **FR-024**: Panel widths and collapsed/expanded states set by the user MUST persist for the duration of the browser session (session storage is acceptable; cross-session persistence is not required).

### Key Entities

- **Note**: A markdown document with a title, body content, folder path, sharing flag, optional tags, and user/family ownership. Persisted in the database. When `is_shared` is true, all family members have full read, edit, and delete rights. When `is_shared` is false (private), only the creator may read, edit, or delete it.
- **Folder**: A virtual organizational container represented by a path prefix on notes. Has no independent database record; existence is inferred from `folder_path` values across notes.
- **Conversation**: A session-scoped ordered list of user and AI messages. Not persisted to the database.
- **AI Context Payload**: The structured data bundle injected as system context at the start of each AI request. Includes: all of the current user's notes, the active open note, the current user's own events and tasks (all privacy levels), and other family members' non-private events and tasks only.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete each file tree action (create note, create folder, rename, move, delete) within 3 interactions each, with no page navigation required.
- **SC-002**: Switching between Edit, Preview, and Split view modes completes in under 200ms with no layout flash.
- **SC-003**: Preview mode correctly renders all supported markdown element types — headings, lists, code blocks, bold, italic, links, and task checkboxes — with zero rendering errors.
- **SC-004**: Auto-save completes and the "Saved" confirmation appears within 2 seconds of the user stopping typing.
- **SC-005**: The first AI response token appears within 3 seconds of message submission under normal local model operation.
- **SC-006**: When asked about current tasks, events, or notes without providing specifics, the AI accurately references real data from the database in 100% of test cases.
- **SC-007**: The three-panel layout remains fully usable at desktop viewport widths from 1024px to 2560px. Both sidebar panels (file tree and AI chat) can be independently collapsed to an icon-bar and re-expanded with a single click, and the editor fills the remaining space correctly in all combinations.
- **SC-008**: The tabbed mobile layout is fully functional at viewport widths from 320px to 767px with no clipping or inaccessible controls.
- **SC-009**: File tree changes from another family member's real-time session appear within 3 seconds without a page refresh.
