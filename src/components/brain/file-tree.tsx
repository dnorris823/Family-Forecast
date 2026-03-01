"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, Share2, Archive, MoreHorizontal } from "lucide-react"
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

// Draggable note row
function DraggableNote({
    node,
    depth,
    isSelected,
    onSelectNote,
    onRenameNote,
    onDeleteNote,
    onExportNote,
}: {
    node: TreeNode
    depth: number
    isSelected: boolean
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
        data: { type: 'note', noteId: node.path, name: node.name }
    })

    const commitRename = async () => {
        if (renameValue.trim() && renameValue.trim() !== node.name) {
            await onRenameNote(node.path, renameValue.trim())
        }
        setIsRenaming(false)
    }

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') commitRename()
        if (e.key === 'Escape') {
            setRenameValue(node.name)
            setIsRenaming(false)
        }
    }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <div
                    ref={setNodeRef}
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent/50 text-sm rounded group",
                        isSelected && "bg-accent",
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
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {isRenaming ? (
                        <input
                            className="flex-1 text-xs bg-background border rounded px-1 h-5 outline-none"
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
                    {node.note?.is_shared && !isRenaming && (
                        <Share2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <DropdownMenuTrigger asChild>
                        <button
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-accent"
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
                        <AlertDialogTitle>Delete note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{node.name}&quot;? This cannot be undone.
                        </AlertDialogDescription>
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

// Droppable folder row
function DroppableFolder({
    node,
    depth,
    isExpanded,
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
        if (e.key === 'Escape') {
            setRenameValue(node.name)
            setIsRenaming(false)
        }
    }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent/50 text-sm rounded group",
                        isOver && "bg-accent/70 ring-1 ring-primary/50"
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
                            <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                            <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {isRenaming ? (
                            <input
                                className="flex-1 text-xs bg-background border rounded px-1 h-5 outline-none"
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
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onCreateNote(node.path)
                            }}
                            title="New note in folder"
                        >
                            <Plus className="h-2.5 w-2.5" />
                        </Button>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-accent"
                                onClick={(e) => e.stopPropagation()}
                                title="More options"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </button>
                        </DropdownMenuTrigger>
                    </div>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => onCreateNote(node.path)}>
                        New Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onCreateFolder(node.path, 'New Folder')}>
                        New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                        <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the folder and all {folderNoteNames.length} note{folderNoteNames.length !== 1 ? 's' : ''} inside it:
                            {folderNoteNames.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs">
                                    {folderNoteNames.slice(0, 10).map(name => (
                                        <li key={name} className="ml-2">• {name}</li>
                                    ))}
                                    {folderNoteNames.length > 10 && (
                                        <li className="ml-2 text-muted-foreground">... and {folderNoteNames.length - 10} more</li>
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
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set(['/']))
    const [searchQuery, setSearchQuery] = React.useState('')

    // Build folder tree from notes
    const tree = React.useMemo(() => {
        const root: TreeNode = { type: 'folder', name: 'Root', path: '/', children: [] }
        const folderMap = new Map<string, TreeNode>()
        folderMap.set('/', root)

        notes.forEach(note => {
            const folderPath = note.folder_path || '/'
            const parts = folderPath.split('/').filter(Boolean)
            let currentPath = ''

            parts.forEach(part => {
                const parentPath = currentPath || '/'
                currentPath = currentPath + '/' + part

                if (!folderMap.has(currentPath)) {
                    const folderNode: TreeNode = {
                        type: 'folder',
                        name: part,
                        path: currentPath,
                        children: []
                    }
                    folderMap.set(currentPath, folderNode)

                    const parent = folderMap.get(parentPath)
                    if (parent && parent.children) {
                        parent.children.push(folderNode)
                    }
                }
            })
        })

        notes.forEach(note => {
            const folderPath = note.folder_path || '/'
            const folder = folderMap.get(folderPath)
            if (folder && folder.children) {
                folder.children.push({
                    type: 'note',
                    name: note.title || 'Untitled',
                    path: note.id,
                    note
                })
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
    }, [notes])

    // Get all note titles under a folder path (for delete confirmation)
    const getNoteNamesUnderFolder = React.useCallback((folderPath: string): string[] => {
        return notes
            .filter(n => (n.folder_path || '/').startsWith(folderPath))
            .map(n => n.title || 'Untitled')
    }, [notes])

    const flattenedTree = React.useMemo(() => {
        const items: Array<{ node: TreeNode; depth: number }> = []

        const flatten = (node: TreeNode, depth: number) => {
            if (depth > 0) {
                if (searchQuery) {
                    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
                    if (!matchesSearch && node.type === 'note') return
                }
                items.push({ node, depth })
            }

            if (node.type === 'folder' && node.children && (expandedFolders.has(node.path) || depth === 0)) {
                node.children.forEach(child => flatten(child, depth + 1))
            }
        }

        flatten(tree, 0)
        return items
    }, [tree, expandedFolders, searchQuery])

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const noteId = active.id as string
        const targetFolderPath = over.id as string

        // Find the current folder of the dragged note
        const note = notes.find(n => n.id === noteId)
        if (!note) return

        const currentFolderPath = note.folder_path || '/'
        if (targetFolderPath === currentFolderPath) return

        // Verify target is a folder (not a note)
        const isFolder = flattenedTree.some(
            item => item.node.type === 'folder' && item.node.path === targetFolderPath
        ) || targetFolderPath === '/'

        if (isFolder) {
            onMoveNote(noteId, targetFolderPath)
        }
    }

    const handleExportNote = async (noteId: string) => {
        await onExportNote(noteId)
    }

    return (
        <div className="flex flex-col h-full border-r">
            <div className="p-2 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notes</h3>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={onExportAll}
                            title="Export vault as .zip"
                        >
                            <Archive className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => onCreateNote('/')}
                            title="New note"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
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
                        {/* Root droppable zone */}
                        <RootDroppable />
                        {flattenedTree.map(({ node, depth }, index) => {
                            const isExpanded = expandedFolders.has(node.path)
                            const isSelected = node.type === 'note' && node.note?.id === selectedNoteId

                            if (node.type === 'folder') {
                                return (
                                    <DroppableFolder
                                        key={`${node.path}-${index}`}
                                        node={node}
                                        depth={depth}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleFolder(node.path)}
                                        onCreateNote={onCreateNote}
                                        onCreateFolder={onCreateFolder}
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
                                    onSelectNote={onSelectNote}
                                    onRenameNote={onRenameNote}
                                    onDeleteNote={onDeleteNote}
                                    onExportNote={handleExportNote}
                                />
                            )
                        })}
                    </div>
                </DndContext>
            </ScrollArea>
        </div>
    )
}

// Invisible root droppable to allow dropping at the top level
function RootDroppable() {
    const { setNodeRef, isOver } = useDroppable({ id: '/' })
    return (
        <div
            ref={setNodeRef}
            className={cn("h-1 rounded transition-colors", isOver && "bg-primary/20")}
        />
    )
}
