# FamilyForecast — Claude Code Guide

## Project Overview
FamilyForecast is a family scheduling and organization app built with Next.js 16 (App Router). It provides a shared calendar, task management, a personal "Second Brain" notes system, and an AI assistant powered by a local Ollama instance.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router) with React 19, TypeScript (strict)
- **Database / Auth**: Supabase (`@supabase/ssr`) — auth, real-time, Postgres, RLS
- **UI**: Tailwind CSS v3 + shadcn/ui (Radix UI primitives), next-themes for dark mode
- **State**: TanStack Query v5, Supabase real-time subscriptions
- **Markdown**: react-markdown + remark-gfm, @uiw/react-md-editor (Brain editor)
- **Date helpers**: date-fns v4
- **Drag & Drop**: @dnd-kit/core (tasks kanban)
- **Panels**: react-resizable-panels (Brain layout)
- **Icons**: lucide-react
- **AI**: Local Ollama (proxied through Next.js API routes)
- **Testing**: Vitest + @testing-library/react (jsdom)

## Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OLLAMA_BASE_URL=http://localhost:11434   # or LAN IP of home server
BRAVE_SEARCH_API_KEY=                    # optional, for AI web/image/video search
```

## Development Commands
```bash
npm run dev     # start dev server
npm run build   # production build
npm run lint    # eslint
npm run test    # vitest
```

## Project Structure
```
src/
├── app/
│   ├── api/ai/
│   │   ├── chat/route.ts              # Ollama proxy + tool-calling loop (max 5 iterations)
│   │   └── models/route.ts            # Lists available Ollama models
│   ├── dashboard/
│   │   ├── layout.tsx                 # Dashboard shell (header, pill nav, chat sheet)
│   │   ├── page.tsx                   # Dashboard home (AtAGlance widget)
│   │   ├── dashboard-actions.ts       # Summary data server action
│   │   ├── ai/actions.ts             # AI model selection & chat session actions
│   │   ├── calendar/                  # Monthly calendar page + actions.ts
│   │   ├── tasks/                     # List + kanban tasks page + actions.ts
│   │   ├── brain/                     # Second Brain (file tree + markdown editor + AI panel) + actions.ts
│   │   └── settings/                  # User settings page
│   ├── login/                         # Supabase auth login/signup page + actions.ts
│   ├── page.tsx                       # Root redirect → /dashboard
│   ├── layout.tsx                     # Root layout (Providers, ThemeProvider)
│   └── globals.css                    # Tailwind + custom design tokens + animations
├── components/
│   ├── ui/                            # shadcn/ui primitives (18+ components)
│   ├── chat/
│   │   ├── chat-sheet.tsx             # Global floating AI chat (bottom-right, resizable)
│   │   ├── chat-history-list.tsx      # Chat session history sidebar
│   │   ├── markdown-components.tsx    # Custom markdown renderers for chat
│   │   ├── image-results.tsx          # Image search results display
│   │   └── video-results.tsx          # Video search results display
│   ├── brain/
│   │   ├── file-tree.tsx              # Note folder structure viewer
│   │   ├── markdown-editor.tsx        # Rich markdown note editor
│   │   ├── brain-chat-panel.tsx       # AI panel in Brain sidebar
│   │   └── create-note-dialog.tsx     # Create note modal
│   ├── calendar/
│   │   └── create-event-dialog.tsx    # Event creation modal
│   ├── tasks/
│   │   └── create-task-dialog.tsx     # Task creation modal
│   ├── dashboard/at-a-glance.tsx      # Dashboard summary widget
│   ├── debug/realtime-monitor.tsx     # Real-time debug monitor
│   ├── main-nav.tsx                   # Pill navigation (Calendar, Tasks, Brain, Settings)
│   ├── user-nav.tsx                   # User dropdown menu + logout
│   ├── theme-toggle.tsx               # Dark/light mode toggle
│   ├── palette-switcher.tsx           # Color scheme selector
│   ├── date-range-picker.tsx          # Date range selection component
│   └── providers.tsx                  # QueryClient + ThemeProvider wrapper
├── hooks/
│   ├── use-realtime-subscription.ts   # Supabase real-time postgres_changes hook
│   ├── use-ai-model.ts               # Hook to manage AI model selection
│   └── use-media-query.ts            # Hook for responsive breakpoints
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser Supabase client
│   │   ├── server.ts                  # Server Supabase client (SSR, reads cookies)
│   │   └── middleware.ts              # Auth session management + cookie handling
│   ├── ai/
│   │   ├── client.ts                  # chatWithAI() fetch wrapper
│   │   ├── tools.ts                   # executeAITool() — server-side tool dispatcher
│   │   └── tool-definitions.ts        # AI_TOOLS array (17 tool schemas)
│   ├── date-utils.ts                  # getCalendarViewRange() etc.
│   ├── date-utils.test.ts             # Tests for date utilities
│   ├── utils.ts                       # cn() tailwind helper
│   └── utils.test.ts                  # Tests for cn() utility
├── types/index.ts                     # FamilyGroup, Profile, Event, Task, Note
└── middleware.ts                       # Next.js middleware (auth + route protection)
```

## Database Tables (Supabase)
| Table | Purpose |
|-------|--------|
| `family_groups` | Family units — all data scoped by `family_id` |
| `profiles` | User profiles (extends auth.users) with `family_id` |
| `events` | Calendar events (family-scoped, privacy flag, recurrence support) |
| `tasks` | Tasks with status (todo/in_progress/done), priority (low/medium/high/urgent), assignee |
| `second_brain` | Notes/brain entries with folder_path, tags, markdown content, vector embeddings |

All data is family-scoped via RLS policies. Users must belong to a `family_id` to see data. Private items are only visible to creators/assignees.

## AI Architecture
- Ollama runs locally; Next.js API routes act as a proxy
- `/api/ai/chat` runs a tool-calling loop (max 5 iterations) against Ollama
- Default model: `kimi-k2.5:cloud`, selectable per session in chat UI
- Context injected at request time from Supabase (next 7 days events + active tasks + recent notes)
- **17 tools available**:
  - Calendar: `get_events`, `create_event`
  - Tasks: `get_tasks`, `create_task`, `update_task_status`
  - Notes: `get_notes`, `create_note`, `update_note`, `list_folders`, `move_note`, `rename_note`, `rename_folder`, `delete_note`, `delete_folder`
  - Search: `web_search`, `image_search`, `video_search` (via Brave API)

## Auth & Middleware
- Supabase SSR auth with cookie-based sessions
- `src/middleware.ts` protects `/dashboard/*` routes, redirects unauthenticated users to `/login`
- Login/signup via email+password; auto-profile creation via DB trigger
- RLS enforces family-scoped data access at the database level

## Real-time Pattern
Pages subscribe to Supabase `postgres_changes` via `useRealtimeSubscription(table, callback)`. On any DB change the callback re-fetches data and calls `router.refresh()`.

## Design System
- Dark mode via `next-themes` (class-based)
- Custom CSS tokens in `globals.css` (HSL color variables)
- Custom fonts: Inter (body), Roboto Mono (mono), Playfair Display (display)
- Utility classes: `.gradient-text-accent`, `.btn-gradient`, `.glass`, `.bg-dot-grid`, `.bg-glow-top`
- Animations: `animate-fade-up`, `animate-fade-in`

## Conventions
- Server actions use `'use server'` directive and live in `actions.ts` co-located with pages
- Client components use `'use client'`; data is fetched in `useEffect` via server actions
- shadcn/ui components are in `src/components/ui/` — do not modify them directly unless adding a new component
- Path alias `@/` maps to `src/`
- File naming: kebab-case for files, PascalCase for components
- Types centralized in `src/types/index.ts`
- No Anthropic/Claude API — AI runs through local Ollama only

## MCP
- Always use MCP servers when relevant to what you are working on and available.

## Git Conventions
- When possible, always use GitHub MCP server for anything Git.
- Never push commits directly to GitHub. Always use add, then commit, then push.

## Git Branches
- `main` — stable / PR target
- `dnorris823-working` — active development branch
