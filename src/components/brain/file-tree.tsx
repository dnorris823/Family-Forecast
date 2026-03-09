"use client"

import * as React from "react"
import {
    ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, Share2,
    Archive, MoreHorizontal, FolderPlus, Bot, Eye, EyeOff,
} from "lucide-react"
import {
    DndContext,
    DragEndEvent,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { type Note } from "@/types"

interface FileTreeProps {
    notes: Note[]
    selectedNoteId: string | null
    onSelectNote: (noteId: string) => void
    onCreateNote: (folderPath: string) => void
    onCreateFolder: (parentPath: string, name: string) => void
    onRenameNote: (noteId: string, newTitle: string) => Promise<void>
    onRenameFolder: (oldPath: string, newPath: string) => Promise<void>
    onDeleteNote: (noteId: string) => Promise<void>
    onDeleteFolder: (folderPath: string) => Promise<void>
    onMoveNote: (noteId: string, newFolderPath: string) => Promise<void>
    onExportNote: (noteId: string) => Promise<void>
    onExportAll: () => Promise<void>
}

interface TreeNode {
    type: 'folder' | 'note'
    name: string
    path: string
    note?: Note
    children?: TreeNode[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAIMemoryPath(path: string): boolean {
    return path.startsWith('/AI Memory')
}

function isProtectedNote(note: Note): boolean {
    return note.title === '_index'
}

function getDeleteMessage(note: Note): { title: string; description: string } {
    if (note.folder_path === '/User' && note.title === '_index') {
        return {
            title: 'Delete index?',
            description: 'This file is the auto-maintained index for My Notes. Deleting it will disable auto-indexing. Are you sure?',
        }
    }
    if (note.folder_path === '/AI Memory' && note.title === '_index') {
        return {
            title: 'Delete AI memory index?',
            description: 'This file is injected into every AI chat session. Deleting it will disable AI memory indexing. Are you sure?',
        }
    }
    if (isAIMemoryPath(note.folder_path ?? '')) {
        return {
            title: 'Delete AI memory file?',
            description: `This is an AI Memory file. Deleting "${note.title}" may affect how the AI behaves. Are you sure?`,
        }
    }
    return {
        title: 'Delete note?',
        description: `Are you sure you want to delete "${note.title ?? 'Untitled'}"? This cannot be undone.`,
    }
}

// ─── DraggableNote ────────────────────────────────────────────────────────────

function DraggableNote({
    node,
    depth,
    isSelected,
    isAIMemory,
    onSelectNote,
    onRenameNote,
    onDeleteNote,
    onExportNote,
}: {
    node: TreeNode
    depth: number
    isSelected: boolean
    isAIMemory: boolean
    onSelectNote: (id: string) => void
    onRenameNote: (noteId: string, newTitle: string) => Promise<void>
    onDeleteNote: (noteId: string) => Promise<void>
    onExportNote: (noteId: string) => Promise<void>
}) {
    const [isRenaming, setIsRenaming] = React.useState(false)
    const [renameValue, setRenameValue] = React.useState(node.name)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [menuOpen, setMenuOpen] = React.useState(false)

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: node.path,
        data: { type: 'note', noteId: node.path, name: node.name, isAIMemory }
    })

    const commitRename = async () => {
        if (renameValue.trim() && renameValue.trim() !== node.name) {
            await onRenameNote(node.path, renameValue.trim())
        }
        setIsRenaming(false)
    }

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') commitRename()
        if (e.key === 'Escape') { setRenameValue(node.name); setIsRenaming(false) }
    }

    const deleteMsg = node.note ? getDeleteMessage(node.note) : { title: 'Delete note?', description: 'This cannot be undone.' }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <div
                    ref={setNodeRef}
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05] text-sm rounded group",
                        isSelected && "bg-gray-100 dark:bg-white/[0.08]",
                        isDragging && "opacity-50"
                    )}
                    onClick={() => { if (!isRenaming) onSelectNote(node.path) }}
                    onDoubleClick={(e) => {
                        e.preventDefault()
                        setIsRenaming(true)
                        setRenameValue(node.name)
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true) }}
                >
                    <div style={{ width: `${depth * 12}px` }} />
                    <div className="w-3" />
                    <FileText className="h-3 w-3 shrink-0 text-gray-400 dark:text-white/40" />
                    {isRenaming ? (
                        <input
                            className="flex-1 text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-white/[0.08] rounded-md px-1 h-5 outline-none text-[#111] dark:text-white/90"
                            value={renameValue}
                            autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={commitRename}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate flex-1">{node.name}</span>
                    )}
                    {isAIMemory && !isRenaming && (
                        <Bot className="h-3 w-3 shrink-0 text-gray-400/60 dark:text-white/30" />
                    )}
                    {node.note?.is_shared && !isRenaming && !isAIMemory && (
                        <Share2 className="h-3 w-3 shrink-0 text-gray-400 dark:text-white/40" />
                    )}
                    <DropdownMenuTrigger asChild>
                        <button
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                            onClick={(e) => e.stopPropagation()}
                            title="More options"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </button>
                    </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => { setIsRenaming(true); setRenameValue(node.name) }}>
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onExportNote(node.path)}>
                        Export as .md
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setShowDeleteDialog(true)}
                    >
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{deleteMsg.title}</AlertDialogTitle>
                        <AlertDialogDescription>{deleteMsg.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDeleteNote(node.path)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── DroppableFolder ──────────────────────────────────────────────────────────

function DroppableFolder({
    node,
    depth,
    isExpanded,
    isAIMemory,
    onToggle,
    onCreateNote,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    folderNoteNames,
}: {
    node: TreeNode
    depth: number
    isExpanded: boolean
    isAIMemory: boolean
    onToggle: () => void
    onCreateNote: (folderPath: string) => void
    onCreateFolder: (parentPath: string, name: string) => void
    onRenameFolder: (oldPath: string, newPath: string) => Promise<void>
    onDeleteFolder: (folderPath: string) => Promise<void>
    folderNoteNames: string[]
}) {
    const [isRenaming, setIsRenaming] = React.useState(false)
    const [renameValue, setRenameValue] = React.useState(node.name)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [menuOpen, setMenuOpen] = React.useState(false)

    const { setNodeRef, isOver } = useDroppable({
        id: node.path,
        data: { type: 'folder', folderPath: node.path }
    })

    const commitRename = async () => {
        const newName = renameValue.trim()
        if (newName && newName !== node.name) {
            const parentPath = node.path.substring(0, node.path.lastIndexOf('/')) || '/'
            const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
            await onRenameFolder(node.path, newPath)
        }
        setIsRenaming(false)
    }

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') commitRename()
        if (e.key === 'Escape') { setRenameValue(node.name); setIsRenaming(false) }
    }

    const deleteTitleText = isAIMemory ? 'Delete AI memory folder?' : 'Delete folder?'

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05] text-sm rounded group",
                        isOver && !isAIMemory && "bg-gray-100 dark:bg-white/[0.06] ring-1 ring-[#111]/20 dark:ring-white/20"
                    )}
                    onClick={() => { if (!isRenaming) onToggle() }}
                    onDoubleClick={(e) => {
                        e.preventDefault()
                        setIsRenaming(true)
                        setRenameValue(node.name)
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true) }}
                >
                    <div style={{ width: `${depth * 12}px` }} />
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                    {isExpanded ? (
                        <FolderOpen className="h-3 w-3 shrink-0 text-gray-400 dark:text-white/40" />
                    ) : (
                        <Folder className="h-3 w-3 shrink-0 text-gray-400 dark:text-white/40" />
                    )}
                    {isRenaming ? (
                        <input
                            className="flex-1 text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-white/[0.08] rounded-md px-1 h-5 outline-none text-[#111] dark:text-white/90"
                            value={renameValue}
                            autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={commitRename}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate flex-1">{node.name}</span>
                    )}
                    {!isAIMemory && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => { e.stopPropagation(); onCreateNote(node.path) }}
                            title="New note in folder"
                        >
                            <Plus className="h-2.5 w-2.5" />
                        </Button>
                    )}
                    <DropdownMenuTrigger asChild>
                        <button
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                            onClick={(e) => e.stopPropagation()}
                            title="More options"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </button>
                    </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent>
                    {!isAIMemory && (
                        <>
                            <DropdownMenuItem onSelect={() => onCreateNote(node.path)}>
                                New Note
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onCreateFolder(node.path, 'New Folder')}>
                                New Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                    )}
                    <DropdownMenuItem onSelect={() => { setIsRenaming(true); setRenameValue(node.name) }}>
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setShowDeleteDialog(true)}
                    >
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{deleteTitleText}</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the folder and all {folderNoteNames.length} note{folderNoteNames.length !== 1 ? 's' : ''} inside it:
                            {folderNoteNames.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs">
                                    {folderNoteNames.slice(0, 10).map((name, idx) => (
                                        <li key={idx} className="ml-2">• {name}</li>
                                    ))}
                                    {folderNoteNames.length > 10 && (
                                        <li className="ml-2 text-gray-500 dark:text-white/40">... and {folderNoteNames.length - 10} more</li>
                                    )}
                                </ul>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDeleteFolder(node.path)}
                        >
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(notes: Note[], rootPath: string): TreeNode {
    const root: TreeNode = { type: 'folder', name: rootPath, path: rootPath, children: [] }
    const folderMap = new Map<string, TreeNode>()
    folderMap.set(rootPath, root)

    notes.forEach(note => {
        const folderPath = note.folder_path || '/'
        const parts = folderPath.split('/').filter(Boolean)
        let currentPath = ''

        parts.forEach(part => {
            const parentPath = currentPath || '/'
            currentPath = currentPath + '/' + part

            if (!folderMap.has(currentPath)) {
                const folderNode: TreeNode = { type: 'folder', name: part, path: currentPath, children: [] }
                folderMap.set(currentPath, folderNode)
                const parent = folderMap.get(parentPath)
                if (parent?.children) parent.children.push(folderNode)
            }
        })
    })

    notes.forEach(note => {
        const folderPath = note.folder_path || '/'
        const folder = folderMap.get(folderPath)
        if (folder?.children) {
            folder.children.push({ type: 'note', name: note.title || 'Untitled', path: note.id, note })
        }
    })

    const sortChildren = (node: TreeNode) => {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name)
                return a.type === 'folder' ? -1 : 1
            })
            node.children.forEach(sortChildren)
        }
    }
    sortChildren(root)

    return root
}

function flattenTree(root: TreeNode, expandedFolders: Set<string>, searchQuery: string): Array<{ node: TreeNode; depth: number }> {
    const items: Array<{ node: TreeNode; depth: number }> = []

    const flatten = (node: TreeNode, depth: number) => {
        if (depth > 0) {
            if (searchQuery && node.type === 'note') {
                if (!node.name.toLowerCase().includes(searchQuery.toLowerCase())) return
            }
            items.push({ node, depth })
        }
        if (node.type === 'folder' && node.children && (expandedFolders.has(node.path) || depth === 0)) {
            node.children.forEach(child => flatten(child, depth + 1))
        }
    }

    flatten(root, 0)
    return items
}

// ─── LocationPicker ───────────────────────────────────────────────────────────

function LocationPicker({
    section,
    folders,
    onCreateNote,
    children,
}: {
    section: 'user' | 'ai'
    folders: string[]
    onCreateNote: (folderPath: string) => void
    children: React.ReactNode
}) {
    const [open, setOpen] = React.useState(false)
    const [selectedFolder, setSelectedFolder] = React.useState(folders[0] ?? (section === 'user' ? '/User' : '/AI Memory'))

    React.useEffect(() => {
        if (folders.length > 0) setSelectedFolder(folders[0])
    }, [folders])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                    New note in {section === 'user' ? 'My Notes' : 'AI Memory'}
                </p>
                <select
                    value={selectedFolder}
                    onChange={e => setSelectedFolder(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1 bg-background mb-2"
                >
                    {folders.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
                <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                        onCreateNote(selectedFolder)
                        setOpen(false)
                    }}
                >
                    Create Note
                </Button>
            </PopoverContent>
        </Popover>
    )
}

// ─── SectionTree ──────────────────────────────────────────────────────────────

function SectionTree({
    tree,
    isAIMemory,
    expandedFolders,
    searchQuery,
    selectedNoteId,
    onSelectNote,
    onCreateNote,
    onCreateFolder,
    onRenameNote,
    onRenameFolder,
    onDeleteNote,
    onDeleteFolder,
    getNoteNamesUnderFolder,
    setExpandedFolders,
    onExportNote,
}: {
    tree: TreeNode
    isAIMemory: boolean
    expandedFolders: Set<string>
    searchQuery: string
    selectedNoteId: string | null
    onSelectNote: (id: string) => void
    onCreateNote: (fp: string) => void
    onCreateFolder: (parent: string, name: string) => void
    onRenameNote: (id: string, title: string) => Promise<void>
    onRenameFolder: (old: string, next: string) => Promise<void>
    onDeleteNote: (id: string) => Promise<void>
    onDeleteFolder: (fp: string) => Promise<void>
    getNoteNamesUnderFolder: (fp: string) => string[]
    setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
    onExportNote: (id: string) => Promise<void>
}) {
    const flat = flattenTree(tree, expandedFolders, searchQuery)

    return (
        <>
            {flat.map(({ node, depth }, index) => {
                const isExpanded = expandedFolders.has(node.path)
                const isSelected = node.type === 'note' && node.note?.id === selectedNoteId
                const nodeIsAIMemory = isAIMemory || isAIMemoryPath(node.note?.folder_path ?? node.path)

                if (node.type === 'folder') {
                    return (
                        <DroppableFolder
                            key={`${node.path}-${index}`}
                            node={node}
                            depth={depth}
                            isExpanded={isExpanded}
                            isAIMemory={nodeIsAIMemory}
                            onToggle={() => {
                                setExpandedFolders(prev => {
                                    const next = new Set(prev)
                                    if (next.has(node.path)) next.delete(node.path)
                                    else next.add(node.path)
                                    return next
                                })
                            }}
                            onCreateNote={(fp) => {
                                setExpandedFolders(prev => { const n = new Set(prev); n.add(fp); return n })
                                onCreateNote(fp)
                            }}
                            onCreateFolder={(parentPath, name) => {
                                setExpandedFolders(prev => { const n = new Set(prev); n.add(parentPath); return n })
                                onCreateFolder(parentPath, name)
                            }}
                            onRenameFolder={onRenameFolder}
                            onDeleteFolder={onDeleteFolder}
                            folderNoteNames={getNoteNamesUnderFolder(node.path)}
                        />
                    )
                }

                return (
                    <DraggableNote
                        key={`${node.path}-${index}`}
                        node={node}
                        depth={depth}
                        isSelected={isSelected}
                        isAIMemory={nodeIsAIMemory}
                        onSelectNote={onSelectNote}
                        onRenameNote={onRenameNote}
                        onDeleteNote={onDeleteNote}
                        onExportNote={onExportNote}
                    />
                )
            })}
        </>
    )
}

// ─── FileTree (main) ──────────────────────────────────────────────────────────

export function FileTree({
    notes,
    selectedNoteId,
    onSelectNote,
    onCreateNote,
    onCreateFolder,
    onRenameNote,
    onRenameFolder,
    onDeleteNote,
    onDeleteFolder,
    onMoveNote,
    onExportNote,
    onExportAll,
}: FileTreeProps) {
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
        new Set(['/User', '/AI Memory'])
    )
    const [searchQuery, setSearchQuery] = React.useState('')
    const [aiMemoryVisible, setAiMemoryVisible] = React.useState(true)

    // Restore AI memory visibility from localStorage
    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('brain-ai-memory-visible')
            if (stored !== null) setAiMemoryVisible(stored !== 'false')
        } catch { /* ignore */ }
    }, [])

    const toggleAIMemoryVisible = () => {
        setAiMemoryVisible(prev => {
            const next = !prev
            try { localStorage.setItem('brain-ai-memory-visible', String(next)) } catch { /* ignore */ }
            return next
        })
    }

    // Split notes into sections
    const { userNotes, aiNotes } = React.useMemo(() => {
        const aiNotes = notes.filter(n => isAIMemoryPath(n.folder_path ?? ''))
        const userNotes = notes.filter(n => !isAIMemoryPath(n.folder_path ?? ''))
        return { userNotes, aiNotes }
    }, [notes])

    const userTree = React.useMemo(() => buildTree(userNotes, '/User'), [userNotes])
    const aiTree = React.useMemo(() => buildTree(aiNotes, '/AI Memory'), [aiNotes])

    // Folders available for location picker
    const userFolders = React.useMemo(() => {
        const folders = new Set<string>()
        userNotes.forEach(n => { if (n.folder_path) folders.add(n.folder_path) })
        if (folders.size === 0) folders.add('/User')
        return Array.from(folders).sort()
    }, [userNotes])

    const aiFolders = React.useMemo(() => {
        return ['/AI Memory']
    }, [])

    const getNoteNamesUnderFolder = React.useCallback((folderPath: string): string[] => {
        return notes
            .filter(n => (n.folder_path || '/').startsWith(folderPath))
            .map(n => n.title || 'Untitled')
    }, [notes])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const noteId = active.id as string
        const targetFolderPath = over.id as string

        // Block moving AI Memory notes
        const note = notes.find(n => n.id === noteId)
        if (!note) return
        if (isAIMemoryPath(note.folder_path ?? '')) return

        // Block dropping into AI Memory folders
        if (isAIMemoryPath(targetFolderPath)) return

        const currentFolderPath = note.folder_path || '/'
        if (targetFolderPath === currentFolderPath) return

        const isTargetFolder = flattenTree(userTree, expandedFolders, '').some(
            item => item.node.type === 'folder' && item.node.path === targetFolderPath
        ) || targetFolderPath === '/' || targetFolderPath === '/User'

        if (isTargetFolder) {
            onMoveNote(noteId, targetFolderPath)
        }
    }

    return (
        <div className="flex flex-col h-full border-r bg-white dark:bg-[#111]">
            {/* Search bar */}
            <div className="p-2 border-b border-gray-100 dark:border-white/[0.05]">
                <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs"
                />
            </div>

            <ScrollArea className="flex-1">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="p-1">
                        {/* ── My Notes section ─────────────────────────── */}
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">
                                My Notes
                            </span>
                            <div className="flex items-center gap-0.5">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={onExportAll}
                                    title="Export vault as .zip"
                                >
                                    <Archive className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={() => onCreateFolder('/User', 'New Folder')}
                                    title="New folder in My Notes"
                                >
                                    <FolderPlus className="h-3 w-3" />
                                </Button>
                                <LocationPicker
                                    section="user"
                                    folders={userFolders}
                                    onCreateNote={onCreateNote}
                                >
                                    <Button size="icon" variant="ghost" className="h-5 w-5" title="New note">
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </LocationPicker>
                            </div>
                        </div>

                        {/* Root droppable for user section */}
                        <UserRootDroppable />

                        <SectionTree
                            tree={userTree}
                            isAIMemory={false}
                            expandedFolders={expandedFolders}
                            searchQuery={searchQuery}
                            selectedNoteId={selectedNoteId}
                            onSelectNote={onSelectNote}
                            onCreateNote={onCreateNote}
                            onCreateFolder={onCreateFolder}
                            onRenameNote={onRenameNote}
                            onRenameFolder={onRenameFolder}
                            onDeleteNote={onDeleteNote}
                            onDeleteFolder={onDeleteFolder}
                            getNoteNamesUnderFolder={getNoteNamesUnderFolder}
                            setExpandedFolders={setExpandedFolders}
                            onExportNote={onExportNote}
                        />

                        {/* ── Divider ──────────────────────────────────── */}
                        <div className="mx-2 my-2 border-t border-dashed border-gray-200 dark:border-white/[0.08]" />

                        {/* ── AI Memory section ─────────────────────────── */}
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                                <Bot className="h-3 w-3 text-gray-400/60 dark:text-white/30" />
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">
                                    AI Memory
                                </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <LocationPicker
                                    section="ai"
                                    folders={aiFolders}
                                    onCreateNote={onCreateNote}
                                >
                                    <Button size="icon" variant="ghost" className="h-5 w-5" title="New AI memory file">
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </LocationPicker>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={toggleAIMemoryVisible}
                                    title={aiMemoryVisible ? 'Hide AI Memory' : 'Show AI Memory'}
                                >
                                    {aiMemoryVisible
                                        ? <Eye className="h-3 w-3" />
                                        : <EyeOff className="h-3 w-3" />
                                    }
                                </Button>
                            </div>
                        </div>

                        {aiMemoryVisible && (
                            <SectionTree
                                tree={aiTree}
                                isAIMemory={true}
                                expandedFolders={expandedFolders}
                                searchQuery={searchQuery}
                                selectedNoteId={selectedNoteId}
                                onSelectNote={onSelectNote}
                                onCreateNote={onCreateNote}
                                onCreateFolder={onCreateFolder}
                                onRenameNote={onRenameNote}
                                onRenameFolder={onRenameFolder}
                                onDeleteNote={onDeleteNote}
                                onDeleteFolder={onDeleteFolder}
                                getNoteNamesUnderFolder={getNoteNamesUnderFolder}
                                setExpandedFolders={setExpandedFolders}
                                onExportNote={onExportNote}
                            />
                        )}
                    </div>
                </DndContext>
            </ScrollArea>
        </div>
    )
}

// Invisible root droppable for the user section (root-level drops)
function UserRootDroppable() {
    const { setNodeRef, isOver } = useDroppable({ id: '/User' })
    return (
        <div
            ref={setNodeRef}
            className={cn("h-1 rounded transition-colors", isOver && "bg-primary/20")}
        />
    )
}
