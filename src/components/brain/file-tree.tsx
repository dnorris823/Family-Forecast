"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Share2 } from "lucide-react"
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
}

interface TreeNode {
    type: 'folder' | 'note'
    name: string
    path: string
    note?: Note
    children?: TreeNode[]
}

export function FileTree({ notes, selectedNoteId, onSelectNote, onCreateNote }: FileTreeProps) {
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set(['/']))
    const [searchQuery, setSearchQuery] = React.useState('')

    // Build folder tree from notes
    const tree = React.useMemo(() => {
        const root: TreeNode = { type: 'folder', name: 'Root', path: '/', children: [] }
        const folderMap = new Map<string, TreeNode>()
        folderMap.set('/', root)

        // First pass: create all folders
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

        // Second pass: add notes to folders
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

        // Sort children: folders first, then notes
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

    // Flatten tree for rendering
    const flattenedTree = React.useMemo(() => {
        const items: Array<{ node: TreeNode; depth: number }> = []

        const flatten = (node: TreeNode, depth: number) => {
            if (depth > 0) { // Skip root
                // Apply search filter
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
            if (next.has(path)) {
                next.delete(path)
            } else {
                next.add(path)
            }
            return next
        })
    }

    return (
        <div className="flex flex-col h-full border-r">
            <div className="p-2 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notes</h3>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onCreateNote('/')}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs"
                />
            </div>
            <ScrollArea className="flex-1">
                <div className="p-1">
                    {flattenedTree.map(({ node, depth }, index) => {
                        const isExpanded = expandedFolders.has(node.path)
                        const isSelected = node.type === 'note' && node.note?.id === selectedNoteId

                        return (
                            <div
                                key={`${node.path}-${index}`}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent/50 text-sm rounded",
                                    isSelected && "bg-accent"
                                )}
                                onClick={() => {
                                    if (node.type === 'folder') {
                                        toggleFolder(node.path)
                                    } else if (node.note) {
                                        onSelectNote(node.note.id)
                                    }
                                }}
                            >
                                <div style={{ width: `${depth * 12}px` }} />
                                {node.type === 'folder' ? (
                                    <>
                                        {isExpanded ? (
                                            <ChevronDown className="h-3 w-3 shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-3 w-3 shrink-0" />
                                        )}
                                        <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    </>
                                ) : (
                                    <>
                                        <div className="w-3" />
                                        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    </>
                                )}
                                <span className="truncate flex-1">{node.name}</span>
                                {node.type === 'note' && node.note?.is_shared && (
                                    <Share2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
