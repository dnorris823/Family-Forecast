"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileTree } from "@/components/brain/file-tree"
import { MarkdownEditor } from "@/components/brain/markdown-editor"
import { BrainChatPanel } from "@/components/brain/brain-chat-panel"
import { getNotes, createNote, updateNote } from "./actions"
import { type Note } from "@/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function SecondBrainPage() {
    const [notes, setNotes] = React.useState<Note[]>([])
    const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null)
    const isMobile = useMediaQuery("(max-width: 768px)")

    const selectedNote = React.useMemo(
        () => notes.find(n => n.id === selectedNoteId) || null,
        [notes, selectedNoteId]
    )

    const fetchNotes = React.useCallback(async () => {
        const data = await getNotes()
        setNotes(data as unknown as Note[])
    }, [])

    useRealtimeSubscription('second_brain', fetchNotes)

    React.useEffect(() => {
        fetchNotes()
    }, [fetchNotes])

    const handleCreateNote = async (folderPath: string) => {
        const result = await createNote('Untitled', '', folderPath, false)
        if (result && 'id' in result) {
            await fetchNotes()
            setSelectedNoteId(result.id)
        }
    }

    const handleSaveNote = async (
        noteId: string,
        title: string,
        content: string,
        isShared: boolean
    ) => {
        await updateNote(noteId, title, content, isShared)
        await fetchNotes()
    }

    // Mobile: Use tabs
    if (isMobile) {
        return (
            <div className="flex-1 h-full">
                <Tabs defaultValue="notes" className="h-full flex flex-col">
                    <TabsList className="w-full">
                        <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                        <TabsTrigger value="editor" className="flex-1">Editor</TabsTrigger>
                        <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes" className="flex-1 overflow-hidden">
                        <FileTree
                            notes={notes}
                            selectedNoteId={selectedNoteId}
                            onSelectNote={setSelectedNoteId}
                            onCreateNote={handleCreateNote}
                        />
                    </TabsContent>
                    <TabsContent value="editor" className="flex-1 overflow-hidden">
                        <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
                    </TabsContent>
                    <TabsContent value="ai" className="flex-1 overflow-hidden">
                        <BrainChatPanel currentNote={selectedNote} onNoteCreated={fetchNotes} />
                    </TabsContent>
                </Tabs>
            </div>
        )
    }

    // Desktop: Use CSS Grid for three-column layout
    return (
        <div className="flex-1 h-[calc(100vh-4rem)] grid grid-cols-[250px_1fr_300px] gap-0">
            <FileTree
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={setSelectedNoteId}
                onCreateNote={handleCreateNote}
            />
            <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
            <BrainChatPanel currentNote={selectedNote} onNoteCreated={fetchNotes} />
        </div>
    )
}
