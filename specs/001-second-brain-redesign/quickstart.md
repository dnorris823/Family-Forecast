# Quickstart: Second Brain Redesign

**Branch**: `001-second-brain-redesign`

---

## Prerequisites

- Node.js 20+ / npm
- Supabase project running (existing)
- Ollama running locally at `OLLAMA_BASE_URL` with `llama3.1` pulled

## New Dependencies to Install

```bash
# Install new packages
npm install @uiw/react-md-editor react-resizable-panels react-markdown remark-gfm @dnd-kit/core jszip

# Remove old package
npm uninstall react-markdown-editor-lite
```

## Development

```bash
npm run dev
```

Navigate to `/dashboard/brain` to see the redesigned Second Brain page.

## Key File Locations

| What | Where |
|------|-------|
| Page (layout + panels) | `src/app/dashboard/brain/page.tsx` |
| Server actions | `src/app/dashboard/brain/actions.ts` |
| File tree component | `src/components/brain/file-tree.tsx` |
| Markdown editor component | `src/components/brain/markdown-editor.tsx` |
| AI chat panel component | `src/components/brain/brain-chat-panel.tsx` |
| AI chat API route | `src/app/api/ai/chat/route.ts` |
| AI client (streaming) | `src/lib/ai/client.ts` |
| AI tool definitions | `src/lib/ai/tool-definitions.ts` |
| AI tool implementations | `src/lib/ai/tools.ts` |
| Core types | `src/types/index.ts` |

## No Database Migrations Required

All required columns already exist. The only change is fixing the `Note` TypeScript type (`user_id` → `created_by`).

## Testing

```bash
npm run test
```

Test files should be co-located or in `src/__tests__/brain/`:
- `file-tree.test.tsx` — tree building, search, drag-drop handler
- `markdown-editor.test.tsx` — view mode switching, auto-save debounce
- `brain-chat-panel.test.tsx` — streaming state, tool callback
- `actions.test.ts` — access control rules for rename/delete/move

## Verifying the AI Context Expansion

1. Open Second Brain, open any note
2. In the AI chat, ask: *"What tasks do I have and what events are coming up?"*
3. Confirm the response includes tasks/events beyond a 7-day window
4. Ask about a private note you own — confirm it appears
5. Ask about another family member's private event — confirm it does **not** appear
