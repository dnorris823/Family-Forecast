# UI Contract: FileTree Component

**File**: `src/components/brain/file-tree.tsx`
**Type**: Client Component (`'use client'`)

---

## Props Interface

```typescript
interface FileTreeProps {
  notes: Note[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  onCreateNote: (folderPath: string) => void          // existing
  onCreateFolder: (parentPath: string, name: string) => void  // NEW
  onRenameNote: (noteId: string, newTitle: string) => void    // NEW
  onRenameFolder: (oldPath: string, newPath: string) => void  // NEW
  onDeleteNote: (noteId: string) => void                      // NEW
  onDeleteFolder: (folderPath: string) => void                // NEW
  onMoveNote: (noteId: string, targetFolderPath: string) => void  // NEW
}
```

---

## Behaviour Contract

### Tree Structure
- Root notes (folder_path = '/') displayed at top level
- Folders appear before notes at each level (alphabetical within type)
- Unlimited nesting depth supported

### Context Menu
- Right-click on **note**: Rename, Delete
- Right-click on **folder**: Rename, Delete, New Note, New Folder
- Context menu closes on Escape or outside click

### Inline Rename
- Double-click on name → input field replaces label
- Enter or blur → save (calls onRenameNote / onRenameFolder)
- Escape → cancel, restore original name
- Empty string → discard rename (revert)

### Drag-and-Drop
- Draggable: note items only
- Droppable: folder items only
- On successful drop: onMoveNote(noteId, targetFolderPath) called
- Visual: dragged item opacity 0.5; target folder highlighted on hover

### Search Filter
- Filters note titles and folder names (not content)
- Ancestor folders of matching notes auto-expand
- Clears when input is emptied

### "Create Folder" Flow
1. onCreateFolder called with parentPath and user-entered name
2. Parent immediately creates an "Untitled" note inside `parentPath/name`
3. New note is selected for editing

### Collapse / Expand State
- Persists in component state for page session duration
- Root expanded by default

---

## Removed from Previous Interface
- `onCreateNote(folderPath)` — now accepts any folderPath, not just root
