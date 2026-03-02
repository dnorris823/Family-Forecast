# Data Model: Second Brain Redesign

**Branch**: `001-second-brain-redesign` | **Date**: 2026-02-28

---

## Existing Entities (No Schema Changes Required)

### Note (`second_brain` table)

All columns already exist. No migration required. The `Note` TypeScript type in `src/types/index.ts` has a `user_id` field that does not match the actual DB column (`created_by`). This must be corrected in the type definition.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `title` | text (nullable) | Defaults to "Untitled" on creation |
| `content` | text | Markdown body |
| `folder_path` | text | Virtual folder path, e.g. `/work/projects`. Root = `/` |
| `tags` | text[] (nullable) | Optional tags array |
| `is_shared` | boolean | When true: all family members have read/edit/delete rights |
| `created_by` | uuid → profiles.id | Owner. Only owner can edit/delete private notes |
| `family_id` | uuid → family_groups.id | Scopes note to the family |
| `embedding` | vector (nullable) | Ollama embedding, used for semantic search (future) |
| `created_at` | timestamptz | Auto-set on insert |

**Type fix required** (`src/types/index.ts`):
```typescript
// BEFORE (wrong)
user_id: string

// AFTER (correct)
created_by: string
```

**Access control rule** (enforced in server actions):
- Edit / Delete allowed if: `created_by === currentUserId` OR `(is_shared === true AND family_id === currentUserFamilyId)`

---

### Folder (Virtual — No DB Table)

Folders have no independent database record. A folder exists when at least one note has a `folder_path` that includes it as a path segment. Existence is inferred client-side when building the tree.

**Implication for "Create Folder" UX**: Creating a folder always creates an initial "Untitled" note inside it (see Research Decision 8). If the user cancels before naming the folder, no DB write occurs.

**Path format**: POSIX-style, always starting from `/`.
- Root notes: `folder_path = '/'`
- One level deep: `folder_path = '/work'`
- Two levels deep: `folder_path = '/work/projects'`

**Move note** = update the note's `folder_path` to the target folder's path.

---

### Profile (`profiles` table) — Unchanged

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | = `auth.users.id` |
| `family_id` | uuid (nullable) | Family membership |

---

## Session-Only Entities (Client State, Not Persisted)

### Conversation

A list of chat messages for the current page session. Reset when the page is unloaded.

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

type Conversation = Message[]
```

### AI Context Payload

Assembled once per chat request in `getFreshContext()` on the server. Injected as the `system` message.

```typescript
interface AIContextPayload {
  currentTime: string           // Human-readable datetime
  activeNote: {                 // Currently open note in editor (if any)
    id: string
    title: string
    content: string
    isActive: true
  } | null
  ownNotes: NoteContext[]       // All notes created by current user
  sharedNotes: NoteContext[]    // All shared notes from other family members
  events: EventContext[]        // Own events (all) + other members' non-private events
  tasks: TaskContext[]          // Own tasks (all) + other members' non-private tasks
}

interface NoteContext {
  id: string
  title: string
  content: string              // Full content included
  folderPath: string
  isShared: boolean
}

interface EventContext {
  id: string
  title: string
  startTime: string
  endTime: string
  isAllDay: boolean
  isPrivate: boolean
  createdBy: string            // 'you' or family member's display name
}

interface TaskContext {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  priority: string | null
  dueDate: string | null
  createdBy: string
}
```

**Token overflow truncation order** (if context string > 6000 characters):
1. Keep: active note (full content)
2. Keep: tasks (all)
3. Truncate: events beyond 30 days from today
4. Truncate: note content to title-only for notes beyond the 10 most recent
5. Truncate: note content to title-only for remaining notes if still over limit

---

## New AI Tool: `update_note`

Added to `src/lib/ai/tool-definitions.ts` and `src/lib/ai/tools.ts`.

### Tool Definition

```typescript
{
  type: 'function',
  function: {
    name: 'update_note',
    description: 'Update an existing note in Second Brain. Provide only the fields to change.',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'ID of the note to update' },
        title: { type: 'string', description: 'New title (optional)' },
        content: { type: 'string', description: 'New markdown content (optional)' },
        is_shared: { type: 'boolean', description: 'Change sharing status (optional)' }
      },
      required: ['note_id']
    }
  }
}
```

### Server Action Logic

```
1. Fetch note by note_id
2. Check access: created_by === user.id OR (is_shared === true AND family_id matches)
3. Apply only provided fields (partial update)
4. Return { success: true, note: updatedNote }
```

---

## Modified Server Actions (`src/app/dashboard/brain/actions.ts`)

### Existing `updateNote` — Access Control Fix

Current implementation only checks `created_by === user.id`. Must be updated to also allow shared-note edits by other family members per spec clarification B.

```
WHERE id = noteId AND (created_by = userId OR (is_shared = true AND family_id = userFamilyId))
```

### New: `deleteNote(noteId: string)`

```
DELETE FROM second_brain
WHERE id = noteId AND (created_by = userId OR (is_shared = true AND family_id = userFamilyId))
```

### New: `renameNote(noteId: string, newTitle: string)`

Partial update — title only. Same access control as `updateNote`.

### New: `moveNote(noteId: string, newFolderPath: string)`

Updates `folder_path`. Access control: creator-only (shared folder structures should not be rearranged by other members). This is stricter than content edits because moving a note changes its location for all family members.

### New: `renameFolder(oldPath: string, newPath: string)`

Performs a bulk update: all notes where `folder_path` starts with `oldPath` get their path prefix replaced with `newPath`. Creator-only: only moves notes owned by the current user.

### New: `deleteFolder(folderPath: string)`

Deletes all notes in the folder and sub-folders where `created_by === userId`. Shared notes in the folder are deleted if the access control rule permits.

### New: `exportNote(noteId: string)` → Returns `{ title, content, folderPath }`

Read-only fetch. Used client-side to trigger a Blob download. No special access control beyond family membership.

### New: `exportAllNotes()` → Returns `Note[]`

Fetches all notes the current user can see (own + shared). Used for vault export.

---

## Modified API Route: `src/app/api/ai/chat/route.ts`

### Context Query Changes

| Query | Before | After |
|-------|--------|-------|
| Events filter | `gte(today) AND lte(today+7)`, limit 10 | No date filter; privacy-filtered |
| Tasks filter | `neq('done')`, limit 10 | No status filter, no limit; privacy-filtered |
| Notes query | `id, title` only, limit 5 | `*` (full content), no limit, current user only |
| Privacy logic | None | Own items always; others' items only if `is_private = false` |

### Response Format Change

**Before**: `NextResponse.json({ response: string })`

**After**: Tool-loop iterations remain `stream: false`. Final response iteration uses `stream: true` piped to `ReadableStream`. Returns `new Response(stream)` with `Content-Type: text/plain`.

### Client (`src/lib/ai/client.ts`) Change

`chatWithAI()` signature changes from returning `Promise<string>` to accepting an `onChunk: (text: string) => void` callback and returning `Promise<void>`:

```typescript
export async function chatWithAI(
  messages: Message[],
  model: string,
  onChunk: (chunk: string) => void,
  activeNoteId?: string
): Promise<void>
```

`activeNoteId` is passed in the request body so the server can flag the active note in the context payload.
