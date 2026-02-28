"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Save, Share2 } from "lucide-react"
import { type Note } from "@/types"
import "react-markdown-editor-lite/lib/index.css"

// Dynamic import to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>
})

interface MarkdownEditorProps {
    note: Note | null
    onSave: (noteId: string, title: string, content: string, isShared: boolean) => Promise<void>
}

export function MarkdownEditor({ note, onSave }: MarkdownEditorProps) {
    const [title, setTitle] = React.useState('')
    const [content, setContent] = React.useState('')
    const [isShared, setIsShared] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const saveTimeoutRef = React.useRef<NodeJS.Timeout>()

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

    const handleEditorChange = ({ text }: { text: string }) => {
        setContent(text)
        debouncedSave()
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
        debouncedSave()
    }

    const handleSharedToggle = (checked: boolean) => {
        setIsShared(checked)
        debouncedSave()
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isSaving && (
                            <>
                                <Save className="h-3 w-3 animate-pulse" />
                                <span>Saving...</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <MdEditor
                    value={content}
                    style={{ height: '100%' }}
                    renderHTML={(text) => text}
                    onChange={handleEditorChange}
                    view={{ menu: true, md: true, html: false }}
                    canView={{ menu: true, md: true, html: false, both: false, fullScreen: false, hideMenu: false }}
                />
            </div>
        </div>
    )
}
