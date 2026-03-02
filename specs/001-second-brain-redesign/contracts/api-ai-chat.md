# API Contract: /api/ai/chat

**File**: `src/app/api/ai/chat/route.ts`
**Method**: POST

---

## Request

```typescript
// Body (JSON)
{
  messages: Message[]      // Conversation history (user + assistant turns only)
  model?: string           // Ollama model name, default 'llama3.1'
  activeNoteId?: string    // Currently open note ID — used to flag active context
}
```

---

## Response

**Changed from**: `application/json` `{ response: string }`
**Changed to**: `text/plain; charset=utf-8` streaming response

```
HTTP 200
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

[text tokens streamed as plain text chunks]
```

Each chunk is a partial string of the assistant's response. Clients accumulate chunks until the stream closes.

**Fallback** (if Ollama stream is unavailable): `application/json` `{ response: string }` — client must detect `Content-Type` and handle both paths.

**Error responses** (unchanged):
```json
HTTP 500: { "error": "Internal Server Error" }
HTTP 200: { "response": "Error: Unable to connect to Ollama. Details: ..." }
```

---

## Context Injection (Server-Side, No Client Change Required)

`getFreshContext()` is updated with these query changes:

| Data | Before | After |
|------|--------|-------|
| Events | 7-day window, limit 10 | All dates, no limit, privacy-filtered |
| Tasks | Non-done only, limit 10 | All statuses, no limit, privacy-filtered |
| Notes | id+title only, limit 5 | Full content, all user notes, no limit |
| Active note | Not supported | Fetched separately by `activeNoteId`, prepended as "Currently open note:" |

**Privacy filter** (applied to events and tasks):
```sql
(created_by = currentUserId) OR (is_private = false AND family_id = currentFamilyId)
```

---

## Tool Loop (Unchanged)

The tool-calling loop continues to run with `stream: false` for all iterations except the final one. All existing tools (`get_events`, `create_event`, `get_tasks`, `create_task`, `update_task_status`, `get_notes`, `create_note`) remain unchanged in signature.

**New tool added**: `update_note` — see `data-model.md` for schema.
