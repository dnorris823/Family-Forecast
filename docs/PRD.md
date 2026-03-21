# FamilyForecast — Product Requirements Document

## 1. Product Overview

**FamilyForecast** is a family scheduling and organization web application that brings together shared calendars, task management, a personal knowledge base ("Second Brain"), and an AI assistant — all scoped to a family group. It is built as a self-hosted Next.js application with a local AI backend (Ollama), giving families full control over their data and infrastructure.

### Vision

Provide a single, unified hub where family members can coordinate schedules, delegate tasks, capture knowledge, and get intelligent assistance — without relying on fragmented third-party SaaS tools or sending personal data to external AI providers.

### Target Users

- **Primary**: Families (2–8 members) who want a shared digital command center for day-to-day coordination.
- **Secondary**: Tech-savvy households comfortable self-hosting and running a local LLM via Ollama.

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
- All data (events, tasks, notes) is scoped to the user's family group — members of the same family see shared data; other families are fully isolated.
- Support for a **privacy flag** on events and tasks, allowing individual items to be hidden from other family members.

### 3.2 Shared Calendar

- **Monthly calendar view** displaying all family events.
- **Create / edit / delete events** with fields: title, description, start/end times, all-day flag, location, privacy, and recurrence rule.
- **Recurrence support** via `recurrence_rule` (iCal RRULE format).
- **Real-time updates**: when any family member creates or modifies an event, all connected clients see the change instantly via Supabase real-time subscriptions.

### 3.3 Task Management

- **List and Kanban views** for tasks.
- Task fields: title, description, status (`todo` | `in_progress` | `done`), priority (`low` | `medium` | `high` | `urgent`), due date, assignee, privacy flag, and recurrence rule.
- **Drag-and-drop** status changes (Kanban board powered by `@dnd-kit/core`).
- **Assignment**: tasks can be assigned to any family member.
- **Real-time sync** across all family members.

### 3.4 Second Brain (Notes / Knowledge Base)

- A personal and optionally shared **note-taking system** organized in a folder hierarchy.
- **File-tree sidebar** for navigating folders and notes.
- **Markdown editor** (`@uiw/react-md-editor`) with live preview for rich content authoring.
- Notes support: title, markdown content, folder path, tags, and a shared/private toggle.
- **Folder operations**: create, rename, move, and delete folders (cascading to child notes).
- **Note operations**: create, edit, rename, move, delete, and share/unshare.
- **AI-powered side panel** within the Brain view for context-aware assistance while writing.

### 3.5 AI Assistant

- **Global chat interface** accessible from any page via a floating sheet (bottom-right).
- Powered by a **local Ollama instance** — no data leaves the user's network.
- Next.js API routes proxy requests to Ollama, solving CORS and mixed-content issues.
- **Tool-calling loop** (max 5 iterations per request) enabling the AI to:
  - Query and create calendar events
  - Query, create, and update tasks
  - Query, create, update, move, rename, and delete notes/folders
  - Search the web, images, and videos
- **Automatic context injection**: at the start of each chat request the system injects the next 7 days of events, active tasks, and recent notes so the AI has situational awareness.
- **Model selection**: users can choose from any model available on their Ollama instance (default: `llama3.1`).

### 3.6 Dashboard

- **At-a-Glance widget** on the dashboard home showing upcoming events, active tasks, and recent notes in a single summary view.
- Quick-access navigation to Calendar, Tasks, Brain, and Settings.

### 3.7 Settings

- User profile management (name, avatar).
- AI model selection.
- Theme toggle (light/dark via `next-themes`).

---

## 4. Technical Architecture

### 4.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v3, shadcn/ui (Radix UI primitives) |
| State | TanStack Query v5 for server state; Supabase real-time for live updates |
| Date handling | date-fns v4, react-day-picker |
| Drag & drop | @dnd-kit/core |
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
| Tools | 14 registered tools (calendar, tasks, notes, web/image/video search) |
| Context window | System prompt includes upcoming events, active tasks, recent notes |

### 4.4 Database Schema

| Table | Key Columns | Scope |
|-------|------------|-------|
| `profiles` | id, username, full_name, avatar_url, family_id | Per user |
| `events` | id, title, start_time, end_time, is_all_day, location, is_private, recurrence_rule, family_id, created_by | Family |
| `tasks` | id, title, status, priority, due_date, assignee_id, is_private, recurrence_rule, family_id, created_by | Family |
| `second_brain` | id, title, content, folder_path, tags, is_shared, family_id, created_by | User (optionally shared) |

---

## 5. User Flows

### 5.1 Onboarding
1. User signs up with email/password.
2. User creates or joins a family group.
3. User lands on the Dashboard with the At-a-Glance widget.

### 5.2 Scheduling an Event
1. Navigate to Calendar.
2. Click "Create Event" — fill in title, date/time, optional location and recurrence.
3. Event appears on the shared calendar for all family members in real time.

### 5.3 Managing Tasks
1. Navigate to Tasks.
2. Create a task with title, priority, optional due date and assignee.
3. Drag tasks across Kanban columns (todo → in_progress → done).
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
| **Privacy** | All data stays within the family's Supabase instance; AI runs locally via Ollama — no external API calls for AI |
| **Accessibility** | Keyboard-navigable; Radix UI primitives provide built-in ARIA support |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge |
| **Responsiveness** | Fully functional on desktop; responsive layouts for tablet and mobile |
| **Security** | Supabase Row Level Security enforces family-scoped data isolation; auth required for all dashboard routes |

---

## 7. Future Considerations

- **Mobile app** (React Native or PWA) for on-the-go access.
- **Notifications & reminders** (push notifications for upcoming events and due tasks).
- **Multi-family support** (users belonging to more than one family group).
- **File attachments** on notes and tasks.
- **Semantic search** across Second Brain using vector embeddings.
- **Shared shopping lists** as a specialized task type.
- **Calendar integrations** (Google Calendar, Apple Calendar sync via CalDAV/iCal).
- **Recurring task automation** with more granular rules.

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| **Family Group** | A logical grouping of users who share calendar, tasks, and optionally notes |
| **Second Brain** | A personal knowledge management system organized as folders and markdown notes |
| **Ollama** | An open-source tool for running large language models locally |
| **Tool Calling** | The ability for the AI to invoke predefined functions (e.g., create an event) during a conversation |
| **RLS** | Row Level Security — Postgres policies that restrict data access at the database level |
