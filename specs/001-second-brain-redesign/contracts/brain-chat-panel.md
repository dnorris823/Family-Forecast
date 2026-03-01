# UI Contract: BrainChatPanel Component

**File**: `src/components/brain/brain-chat-panel.tsx`
**Type**: Client Component (`'use client'`)

---

## Props Interface

```typescript
interface BrainChatPanelProps {
  currentNote: Note | null
  activeNoteId: string | null   // NEW — passed separately for context injection
  onNoteCreated?: () => void
  onNoteUpdated?: () => void    // NEW — called when AI updates an existing note
}
```

---

## Behaviour Contract

### Message Display
- Messages rendered with `react-markdown` + `remark-gfm`
- User messages: right-aligned, primary background
- Assistant messages: left-aligned, muted background, markdown rendered
- Code blocks in responses use monospace font with copy button

### Streaming
- While AI generates: a `streamingMessage` state string is appended to on each chunk
- The in-progress message is shown as an `assistant` bubble with a blinking cursor
- On stream end: `streamingMessage` is committed to the `messages` array and cleared
- If streaming fails mid-response: partial content is preserved with an error suffix

### "Ask about this note" Button
- Visible only when `currentNote !== null`
- Sets input to: `Tell me about the note titled "[title]".`
- Does not auto-submit — user can edit before sending

### Context Passed to AI
On every send: `activeNoteId` is included in the request body so the server-side `getFreshContext()` can flag that note as active. The client does not construct the context payload.

### Tool Call Feedback
- When the AI response includes an action phrase ("I've created", "I've updated", "I've added"):
  - Call `onNoteCreated()` if a note was created
  - Call `onNoteUpdated()` if a note was modified
  - This triggers a re-fetch in the parent without a full page reload

### Error State
- If streaming fails or response is an error: display an error bubble with a "Retry" button
- Retry re-sends the last user message

### Model Selector
- Dropdown populated from `/api/ai/models` on mount
- Default: `llama3.1` if present, otherwise first available model
- Disabled during streaming
- Selection persists in component state (session-scoped)

### Message History
- Session-scoped only (reset on page unload)
- Initial greeting message shown on mount

---

## Client API Change

`chatWithAI()` is replaced with a new streaming-aware call:
```typescript
await streamChatWithAI(messages, model, activeNoteId, (chunk) => {
  setStreamingContent(prev => prev + chunk)
})
```
The streaming function resides in `src/lib/ai/client.ts`.
