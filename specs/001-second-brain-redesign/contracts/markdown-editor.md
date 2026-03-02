# UI Contract: MarkdownEditor Component

**File**: `src/components/brain/markdown-editor.tsx`
**Type**: Client Component (`'use client'`), dynamically imported (no SSR)

---

## Props Interface

```typescript
// Unchanged from current contract
interface MarkdownEditorProps {
  note: Note | null
  onSave: (noteId: string, title: string, content: string, isShared: boolean) => Promise<void>
}
```

No prop changes — all new behaviour is internal to the component.

---

## Behaviour Contract

### View Modes
Three modes toggleable via a toolbar button group:
- `edit` — raw markdown textarea only (default)
- `preview` — rendered HTML only, not editable
- `split` — edit pane left, live preview pane right (50/50 split)

Default mode on mount: `edit`

### Markdown Rendering (preview and split modes)
Renders using `@uiw/react-md-editor`'s built-in preview, which supports:
- Headings H1–H6
- Bold, italic, strikethrough
- Inline code and fenced code blocks (with language hint)
- Ordered and unordered lists
- Task checkboxes (`- [ ]` / `- [x]`)
- Blockquotes
- Hyperlinks
- Tables (GFM)

### Keyboard Shortcuts (edit mode only)
| Shortcut | Action |
|----------|--------|
| Ctrl+B | Wrap selection in `**bold**` |
| Ctrl+I | Wrap selection in `*italic*` |
| Ctrl+` | Wrap selection in `` `code` `` |

### Auto-save
- Debounce: 1000ms after last change to title, content, or `is_shared`
- Save indicator: "Saving..." → "Saved ✓" (disappears after 2s)
- Applies to all three fields: title, content, isShared

### Share Toggle
- Located in toolbar area, always visible when a note is open
- Toggle change triggers immediate debounced save

### Empty State
- When `note === null`: centered message "Select a note from the sidebar or create a new one"
- No toolbar rendered in empty state

### Note Switching
- When `note` prop changes, reset title/content/isShared to new note's values
- Cancel pending debounced save for the previous note before switching

---

## Library Replacement
`react-markdown-editor-lite` → `@uiw/react-md-editor`

The `MdEditor` import is replaced. The existing dynamic import pattern is preserved:
```typescript
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })
```
