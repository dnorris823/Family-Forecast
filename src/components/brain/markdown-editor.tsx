"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Save, Share2, PenLine, Eye, Columns2, Download } from "lucide-react"
import { type Note } from "@/types"
import { exportNote } from "@/app/dashboard/brain/actions"

// Dynamic import to avoid SSR issues
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>
})

interface MarkdownEditorProps {
    note: Note | null
    onSave: (noteId: string, title: string, content: string, isShared: boolean) => Promise<void>
}

// viewMode maps UI label to @uiw/react-md-editor preview prop values:
// 'edit' → edit only, 'preview' → preview only, 'live' → split (shown as "Split" in UI)
type ViewMode = 'edit' | 'preview' | 'live'

export function MarkdownEditor({ note, onSave }: MarkdownEditorProps) {
    const [title, setTitle] = React.useState('')
    const [content, setContent] = React.useState('')
    const [isShared, setIsShared] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [viewMode, setViewMode] = React.useState<ViewMode>('live')
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

    // Update local state when note changes
    React.useEffect(() => {
        if (note) {
            setTitle(note.title || '')
            setContent(note.content || '')
            setIsShared(note.is_shared)
        } else {
            setTitle('')
            setContent('')
            setIsShared(false)
        }
    }, [note])

    // Auto-save with debounce
    const handleSave = React.useCallback(async () => {
        if (!note) return

        setIsSaving(true)
        try {
            await onSave(note.id, title, content, isShared)
        } catch (error) {
            console.error('Failed to save note:', error)
        } finally {
            setIsSaving(false)
        }
    }, [note, title, content, isShared, onSave])

    const debouncedSave = React.useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(handleSave, 1000)
    }, [handleSave])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
        debouncedSave()
    }

    const handleSharedToggle = (checked: boolean) => {
        setIsShared(checked)
        debouncedSave()
    }

    const handleExport = async () => {
        if (!note) return
        const result = await exportNote(note.id)
        if (!result || 'error' in result) return
        const text = result.content.startsWith('#') ? result.content : `# ${result.title}\n\n${result.content}`
        const blob = new Blob([text], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${result.title || 'untitled'}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (!note) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a note to edit or create a new one</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b space-y-3">
                <Input
                    placeholder="Note title..."
                    value={title}
                    onChange={handleTitleChange}
                    className="text-lg font-semibold"
                />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="share-toggle"
                            checked={isShared}
                            onCheckedChange={handleSharedToggle}
                        />
                        <Label htmlFor="share-toggle" className="text-sm flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            Share with family
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View mode toggle: Edit / Preview / Split */}
                        <div className="flex border rounded-md overflow-hidden">
                            <Button
                                size="icon"
                                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                                className="h-7 w-7 rounded-none"
                                title="Edit mode"
                                onClick={() => setViewMode('edit')}
                            >
                                <PenLine className="h-3 w-3" />
                            </Button>
                            <Button
                                size="icon"
                                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                                className="h-7 w-7 rounded-none border-x"
                                title="Preview mode"
                                onClick={() => setViewMode('preview')}
                            >
                                <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                                size="icon"
                                variant={viewMode === 'live' ? 'secondary' : 'ghost'}
                                className="h-7 w-7 rounded-none"
                                title="Split view"
                                onClick={() => setViewMode('live')}
                            >
                                <Columns2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Export note as .md"
                            onClick={handleExport}
                        >
                            <Download className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {isSaving && (
                                <>
                                    <Save className="h-3 w-3 animate-pulse" />
                                    <span>Saving...</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* @uiw/react-md-editor keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+` (inline code) */}
            <div className="flex-1 overflow-hidden" data-color-mode="light">
                <MDEditor
                    value={content}
                    onChange={(val) => {
                        setContent(val ?? '')
                        debouncedSave()
                    }}
                    preview={viewMode}
                    height="100%"
                    style={{ height: '100%' }}
                />
            </div>
        </div>
    )
}
