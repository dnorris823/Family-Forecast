# FamilyForecast — Product Requirements Document

## 1. Product Overview

**FamilyForecast** is a family scheduling and organization web application that brings together shared calendars, task management, a personal knowledge base ("Second Brain"), and an AI assistant — all scoped to a single household. It is built as a self-hosted Next.js application running on the family's home network with a local AI backend (Ollama), giving the family full control over their data and infrastructure.

### Vision

Provide a single, unified hub where family members can coordinate schedules, delegate tasks, capture knowledge, and get intelligent assistance — without relying on fragmented third-party SaaS tools or sending personal data to external AI providers.

### Target Users

- A single household running the app on their local home network.
- Tech-savvy family comfortable self-hosting and running a local LLM via Ollama.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Reduce scheduling conflicts within a family | < 2 overlapping events per month per family |
| Increase task completion rate | > 70% of tasks marked "done" within 7 days of creation |
| Encourage knowledge capture | Each user creates ≥ 5 notes per month |
| AI adoption | > 50% of active users interact with the AI assistant weekly |

---

## 3. Core Features

### 3.1 Authentication & Family Groups

- **Sign-up / Login** via Supabase Auth (email + password).
- Each user has a **profile** (`username`, `full_name`, `avatar_url`) linked to a `family_id`.
- **Automatic family assignment**: when a new user signs up, a database trigger automatically creates a default family group (or assigns the user to the existing one). There is no manual "create or join a family" flow — all signed-in users are considered part of the same household.
- All data (events, tasks) is **shared by default** within the family group. Notes in Second Brain are **private by default** and can be explicitly shared with the family.
- The **sharing model** is opt-in: items that are not explicitly shared are visible only to their creator (and accessible by the creator's AI assistant). There is no separate "privacy flag" — an item is either shared or private.

### 3.2 Shared Calendar

- **Monthly calendar view** displaying all family (shared) events.
- **Create / edit / delete events** with fields: title, description, start/end times, all-day flag, and location.
- **Real-time updates**: when any family member creates or modifies an event, all connected clients see the change instantly via Supabase real-time subscriptions.

#### Recurrence (Current State & Future)

The database schema includes a `recurrence_rule` column (iCal RRULE format) on the `events` table, but recurrence is **not yet implemented** in the UI or server actions. Currently:
- Events are single-occurrence only.
- The Create Event dialog does not expose a recurrence field.
- No logic exists to expand recurring events on the calendar.

**Future work needed for full recurrence support:**
- Add recurrence rule input to the Create/Edit Event dialog (e.g., daily, weekly, monthly, custom RRULE).
- Implement server-side expansion of recurring events within the queried date range.
- Handle editing/deleting individual occurrences vs. the entire series.

### 3.3 Task Management

- **List and Kanban views** for tasks (Kanban is currently display-only; see Future Considerations for drag-and-drop).
- Task fields: title, description, status (`todo` | `in_progress` | `done`), priority (`low` | `medium` | `high` | `urgent`), due date, and assignee.
- **Status changes** are made via click/button interactions in the Kanban view.
- **Assignment**: tasks can be assigned to any family member.
- **Real-time sync** across all family members.
- Tasks are **shared with the family by default**.

#### Recurrence (Current State & Future)

The database schema includes a `recurrence_rule` column on the `tasks` table, but recurrence is **not yet implemented** in the UI or server actions. Currently:
- Tasks are single-occurrence only.
- The Create Task dialog does not expose a recurrence field.

**Future work needed for full recurrence support:**
- Add recurrence rule input to the Create/Edit Task dialog.
- Implement logic to auto-generate recurring task instances.
- Define behavior when a recurring task is completed (create next occurrence, etc.).

### 3.4 Second Brain (Notes / Knowledge Base)

- A **personal note-taking system** organized in a folder hierarchy. Notes are **private by default** and can be explicitly shared with the family.
- **File-tree sidebar** for navigating folders and notes (uses `@dnd-kit/core` for drag-and-drop reordering).
- **Markdown editor** (`@uiw/react-md-editor`) with live preview for rich content authoring.
- Notes support: title, markdown content, folder path, and a shared/private toggle.
- **Folder operations**: create, rename, move, and delete folders (cascading to child notes).
- **Note operations**: create, edit, rename, move, delete, and share/unshare.
- **AI-powered side panel** within the Brain view for context-aware assistance while writing.

#### Tags (Current State & Future)

The database schema and TypeScript types include a `tags` field on notes, and the Create Note dialog has a tags input, but tags are **not yet fully wired up**. Currently:
- The tags input in the Create Note dialog does not persist to the database.
- Tags are not displayed on notes or in the file tree.
- No filtering or search by tag exists.

**Future work needed for full Obsidian-style tag support:**
- Wire up tag persistence in the `createNote` and `updateNote` server actions.
- Display inline `#tags` on notes in the file tree and editor.
- Implement tag-based filtering and search (click a tag to see all notes with that tag).
- Support tag auto-complete and a tag cloud/index view.
- Add tag parameters to AI tools (`create_note`, `update_note`).

### 3.5 AI Assistant

- **Global chat interface** accessible from any page via a floating sheet (bottom-right).
- Powered by a **local Ollama instance** — no data leaves the user's network.
- Next.js API routes proxy requests to Ollama, solving CORS and mixed-content issues.
- **Tool-calling loop** (max 5 iterations per request) enabling the AI to:
  - Query and create calendar events
  - Query, create, and update tasks
  - Query, create, update, move, rename, and delete notes/folders
  - Search the web, images, and videos (via Brave Search API)
- **Automatic context injection**: at the start of each chat request the system injects **all** events, all active (non-done) tasks, and all of the current user's notes so the AI has full situational awareness. If the combined context exceeds a size threshold, it is trimmed to the most relevant subset (e.g., next 30 days of events).
- **Model selection**: users can choose from any model available on their Ollama instance (default: `llama3.1`).

#### AI External Access Policy

The AI assistant is intentionally **not** given access to personal external accounts (e.g., Gmail, social media, personal calendars). It operates only on data within FamilyForecast and can perform general web searches. Future considerations include creating dedicated service accounts for the AI to interact with external tools on the family's behalf.

### 3.6 Dashboard

- **At-a-Glance widget** on the dashboard home showing upcoming events, active tasks, and recent notes in a single summary view.
- Quick-access navigation to Calendar, Tasks, Brain, and Settings.

### 3.7 Settings ⚠️ Incomplete

- User profile management (name, avatar).
- AI model selection.
- Theme toggle (light/dark via `next-themes`).

**Current implementation status:**
- The Settings page exists with a "General" tab containing display name and email fields, but the **"Save Changes" button is non-functional** — no server action persists profile updates.
- There is **no avatar upload/edit** capability.
- A "Family Group" tab exists with placeholder text ("Invites coming soon") but is not functional.
- AI model selection is handled in the chat UI, not in Settings.

**Future work needed:**
- Wire up the "Save Changes" button to a server action that updates the user's profile.
- Implement avatar upload (e.g., to Supabase Storage).
- Decide whether AI model selection should also live in Settings or remain in the chat UI.

---

## 4. Technical Architecture

### 4.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v3, shadcn/ui (Radix UI primitives) |
| State | Next.js Server Actions for data fetching; Supabase real-time for live updates |
| Date handling | date-fns v4, react-day-picker |
| Drag & drop | @dnd-kit/core (currently used in Second Brain file tree only) |
| Markdown | @uiw/react-md-editor, react-markdown, remark-gfm |
| Icons | lucide-react |

### 4.2 Backend & Data

| Layer | Technology |
|-------|-----------|
| Database | Supabase (Postgres) with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase `postgres_changes` subscriptions |
| Server logic | Next.js Server Actions (`'use server'`) co-located with pages |
| AI proxy | Next.js API routes (`/api/ai/chat`, `/api/ai/models`) |

### 4.3 AI Layer

| Component | Detail |
|-----------|--------|
| LLM runtime | Ollama (self-hosted, local network) |
| Default model | llama3.1 |
| Proxy | Next.js API route with tool-calling loop |
| Tools | 17 registered tools (calendar, tasks, notes/folders, web/image/video search) |
| Context | System prompt includes all events, active tasks, and user's notes (trimmed if too large) |

### 4.4 Database Schema

| Table | Key Columns | Scope |
|-------|------------|-------|
| `profiles` | id, username, full_name, avatar_url, family_id | Per user |
| `events` | id, title, start_time, end_time, is_all_day, location, is_private, recurrence_rule, family_id, created_by | Family (shared) |
| `tasks` | id, title, status, priority, due_date, assignee_id, is_private, recurrence_rule, family_id, created_by | Family (shared) |
| `second_brain` | id, title, content, folder_path, tags, is_shared, family_id, created_by | User (private by default, optionally shared) |

---

## 5. User Flows

### 5.1 Onboarding
1. User signs up with email/password.
2. A database trigger automatically assigns the user to the default family group.
3. User lands on the Dashboard with the At-a-Glance widget.

### 5.2 Scheduling an Event
1. Navigate to Calendar.
2. Click "Create Event" — fill in title, date/time, and optional location.
3. Event appears on the shared calendar for all family members in real time.

### 5.3 Managing Tasks
1. Navigate to Tasks.
2. Create a task with title, priority, optional due date and assignee.
3. Change task status via the Kanban board columns (todo → in_progress → done) using status buttons.
4. All family members see updates in real time.

### 5.4 Using Second Brain
1. Navigate to Brain.
2. Create folders to organize notes.
3. Write notes in Markdown with live preview.
4. Optionally share notes with the family or keep them private.
5. Use the AI side panel for help while writing.

### 5.5 Chatting with the AI
1. Click the floating chat button (available on any page).
2. Ask a question — e.g., "What's on my schedule this weekend?"
3. The AI queries the calendar via tool calls and responds with a natural-language summary.
4. Ask the AI to create events, tasks, or notes — e.g., "Add a task to buy groceries by Friday."

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Performance** | Dashboard loads in < 2s on a modern browser |
| **Real-time latency** | Data changes propagate to other clients within 1s |
| **Privacy** | All data stays on the family's local network; AI runs locally via Ollama — no external API calls for AI. The AI does not access personal external accounts. |
| **Accessibility** | Keyboard-navigable; Radix UI primitives provide built-in ARIA support |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge |
| **Responsiveness** | Fully functional on desktop; responsive layouts for tablet and mobile |
| **Security** | Supabase Row Level Security enforces family-scoped data isolation; auth required for all dashboard routes |

---

## 7. Future Considerations

- **Drag-and-drop Kanban board** — use `@dnd-kit/core` (already installed) to enable dragging tasks across status columns.
- **Full recurrence support** — wire up `recurrence_rule` for both events and tasks (see sections 3.2 and 3.3 for details).
- **Obsidian-style tags** — fully implement tag persistence, display, filtering, and auto-complete on Second Brain notes (see section 3.4 for details).
- **Settings page completion** — wire up profile editing (name, avatar upload) and decide on AI model selection placement.
- **Mobile app** (React Native or PWA) for on-the-go access.
- **Notifications & reminders** (push notifications for upcoming events and due tasks).
- **File attachments** on notes and tasks.
- **Semantic search** across Second Brain using vector embeddings.
- **Shared shopping lists** as a specialized task type.
- **Calendar integrations** (Google Calendar, Apple Calendar sync via CalDAV/iCal).
- **AI service accounts** — dedicated external accounts the AI can use to interact with third-party tools on the family's behalf (e.g., a shared email, utility accounts), without accessing personal accounts.
- **MCP server for Claude integration** — build an MCP (Model Context Protocol) server that exposes FamilyForecast data (events, tasks, notes) to the Claude Desktop and mobile apps. This would allow interacting with family data directly from Claude outside the FamilyForecast UI. Claude Desktop supports local MCP servers (ideal for home network use); Claude Mobile supports remote MCP servers only (would require a tunnel like Cloudflare Tunnel to reach the home network). Free Claude plan supports 1 custom MCP connector.

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| **Family Group** | The default household grouping — all signed-in users automatically belong to the same family and share calendar and task data |
| **Second Brain** | A personal knowledge management system organized as folders and markdown notes; private by default, optionally shared |
| **Ollama** | An open-source tool for running large language models locally |
| **Tool Calling** | The ability for the AI to invoke predefined functions (e.g., create an event) during a conversation |
| **RLS** | Row Level Security — Postgres policies that restrict data access at the database level |
