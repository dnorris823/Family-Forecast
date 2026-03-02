# FamilyForecast — Claude Code Guide

## Project Overview
FamilyForecast is a family scheduling and organization app built with Next.js 16 (App Router). It provides a shared calendar, task management, a personal "Second Brain" notes system, and an AI assistant powered by a local Ollama instance.

## Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19, TypeScript
- **Database / Auth**: Supabase (`@supabase/ssr`) — auth, real-time, Postgres
- **UI**: Tailwind CSS v3, shadcn/ui components (Radix UI primitives)
- **State**: TanStack Query v5, Supabase real-time subscriptions
- **Date helpers**: date-fns v4
- **Icons**: lucide-react
- **AI**: Local Ollama (proxied through Next.js API routes)
- **Testing**: Vitest + @testing-library/react

## Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OLLAMA_BASE_URL=http://localhost:11434   # or LAN IP of home server
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
│   │   ├── chat/route.ts       # AI chat proxy to Ollama (tool-calling loop)
│   │   └── models/route.ts     # Lists available Ollama models
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard shell (MainNav + UserNav + ChatSheet)
│   │   ├── page.tsx            # Dashboard home (AtAGlance widget)
│   │   ├── calendar/           # Monthly calendar page + server actions
│   │   ├── tasks/              # List + kanban tasks page + server actions
│   │   ├── brain/              # Second Brain (file tree + markdown editor + AI panel)
│   │   └── settings/           # User settings page
│   ├── login/                  # Supabase auth login page + actions
│   └── layout.tsx              # Root layout (Providers, ThemeProvider)
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── chat/chat-sheet.tsx     # Global floating AI chat (fixed bottom-right)
│   ├── brain/                  # FileTree, MarkdownEditor, BrainChatPanel
│   ├── calendar/               # CreateEventDialog
│   ├── tasks/                  # CreateTaskDialog
│   ├── dashboard/at-a-glance.tsx
│   ├── main-nav.tsx
│   └── user-nav.tsx
├── hooks/
│   ├── use-realtime-subscription.ts  # Supabase real-time postgres_changes hook
│   └── use-media-query.ts
├── lib/
│   ├── supabase/               # client.ts (browser), server.ts, middleware.ts
│   ├── ai/
│   │   ├── client.ts           # chatWithAI() fetch wrapper
│   │   ├── tools.ts            # executeAITool() — server actions for AI tool calls
│   │   ├── tool-definitions.ts # Ollama tool schemas (AI_TOOLS array)
│   │   └── interface_design.md # AI design doc
│   ├── date-utils.ts           # getCalendarViewRange() etc.
│   └── utils.ts                # cn() tailwind helper
└── types/index.ts              # FamilyGroup, Profile, Event, Task, Note
```

## Database Tables (Supabase)
| Table | Purpose |
|-------|--------|
| `profiles` | User profiles with `family_id` |
| `events` | Calendar events (family-scoped, privacy flag) |
| `tasks` | Tasks with status/priority (todo/in_progress/done) |
| `second_brain` | Notes/brain entries (user-scoped, shareable) |

All data is family-scoped. Users must belong to a `family_id` to see data.

## AI Architecture
- Ollama runs locally; Next.js API routes act as a proxy (CORS workaround)
- `/api/ai/chat` runs a tool-calling loop (max 5 iterations) against Ollama
- Tools available: `get_events`, `create_event`, `get_tasks`, `create_task`, `update_task_status`, `get_notes`, `create_note`
- Context is injected from Supabase at the start of each chat request (next 7 days events + active tasks + recent notes)
- Default model: `llama3.1`, selectable per session in the chat UI

## Real-time Pattern
Pages subscribe to Supabase `postgres_changes` via `useRealtimeSubscription(table, callback)`. On any DB change the callback re-fetches data and calls `router.refresh()`.

## Conventions
- Server actions use `'use server'` directive and live in `actions.ts` co-located with pages
- Client components use `'use client'`; data is fetched in `useEffect` via server actions
- shadcn/ui components are in `src/components/ui/`; do not modify them directly unless adding a new component
- Path alias `@/` maps to `src/`
- No Anthropic/Claude API — AI runs through local Ollama only

## MCP
- Always use MCP servers when relevant to what you are working on and available.

## Git Conventions
- When possible, Always use GitHub MCP server for anything Git.
- Never push commits directly to GitHub. Always use add, then commit, then push.

## Git Branches
- `main` — stable / PR target
- `dnorris823-working` — active development branch
