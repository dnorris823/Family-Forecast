"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from "react-resizable-panels"
import { FolderOpen, Bot } from "lucide-react"
import { FileTree } from "@/components/brain/file-tree"
import { MarkdownEditor } from "@/components/brain/markdown-editor"
import { BrainChatPanel } from "@/components/brain/brain-chat-panel"
import {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    renameNote,
    moveNote,
    renameFolder,
    deleteFolder,
    exportNote,
    exportAllNotes,
} from "./actions"
import { type Note } from "@/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function SecondBrainPage() {
    const [mounted, setMounted] = React.useState(false)
    const [notes, setNotes] = React.useState<Note[]>([])
    const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null)
    const isMobile = useMediaQuery("(max-width: 768px)")

    React.useEffect(() => { setMounted(true) }, [])

    // Panel collapse states (desktop only)
    const [fileTreeCollapsed, setFileTreeCollapsed] = React.useState(false)
    const [aiCollapsed, setAiCollapsed] = React.useState(false)
    const fileTreePanelRef = usePanelRef()
    const aiPanelRef = usePanelRef()

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

    const handleRenameNote = async (noteId: string, newTitle: string) => {
        await renameNote(noteId, newTitle)
        await fetchNotes()
    }

    const handleRenameFolder = async (oldPath: string, newPath: string) => {
        await renameFolder(oldPath, newPath)
        await fetchNotes()
    }

    const handleDeleteNote = async (noteId: string) => {
        await deleteNote(noteId)
        if (selectedNoteId === noteId) setSelectedNoteId(null)
        await fetchNotes()
    }

    const handleDeleteFolder = async (folderPath: string) => {
        await deleteFolder(folderPath)
        // Deselect if selected note was in deleted folder
        const selectedNote = notes.find(n => n.id === selectedNoteId)
        if (selectedNote && (selectedNote.folder_path || '/').startsWith(folderPath)) {
            setSelectedNoteId(null)
        }
        await fetchNotes()
    }

    const handleMoveNote = async (noteId: string, newFolderPath: string) => {
        await moveNote(noteId, newFolderPath)
        await fetchNotes()
    }

    const handleCreateFolder = async (parentPath: string, name: string) => {
        // Folders are virtual — create a placeholder note to materialise the folder
        const folderPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`
        const result = await createNote('Untitled', '', folderPath, false)
        if (result && 'id' in result) {
            await fetchNotes()
            setSelectedNoteId(result.id)
        }
    }

    const handleExportNote = async (noteId: string) => {
        const result = await exportNote(noteId)
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

    const handleExportAll = async () => {
        const allNotes = await exportAllNotes()
        if (!allNotes || allNotes.length === 0) return

        // Dynamic import of jszip to avoid SSR issues
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        allNotes.forEach(note => {
            const folderPath = (note.folder_path || '/').replace(/^\//, '')
            const fileName = `${note.title || 'Untitled'}.md`
            const filePath = folderPath ? `${folderPath}/${fileName}` : fileName
            const text = note.content.startsWith('#') ? note.content : `# ${note.title || 'Untitled'}\n\n${note.content}`
            zip.file(filePath, text)
        })

        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'second-brain-export.zip'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Session persistence for panel sizes (v4 Layout: { [panelId]: percentage })
    const getSavedLayout = (): { [id: string]: number } | undefined => {
        try {
            const saved = sessionStorage.getItem('brain-panel-sizes')
            if (saved) return JSON.parse(saved)
        } catch {
            // ignore
        }
        return undefined
    }

    const savedLayout = React.useMemo(() => getSavedLayout(), [])

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
                            onCreateFolder={handleCreateFolder}
                            onRenameNote={handleRenameNote}
                            onRenameFolder={handleRenameFolder}
                            onDeleteNote={handleDeleteNote}
                            onDeleteFolder={handleDeleteFolder}
                            onMoveNote={handleMoveNote}
                            onExportNote={handleExportNote}
                            onExportAll={handleExportAll}
                        />
                    </TabsContent>
                    <TabsContent value="editor" className="flex-1 overflow-hidden">
                        <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
                    </TabsContent>
                    <TabsContent value="ai" className="flex-1 overflow-hidden">
                        <BrainChatPanel
                            currentNote={selectedNote}
                            activeNoteId={selectedNoteId}
                            onNoteCreated={fetchNotes}
                            onNoteUpdated={fetchNotes}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        )
    }

    // Desktop: react-resizable-panels three-column layout (v4 API)
    // Panels are suppressed until mounted to avoid SSR/client style hydration mismatch
    if (!mounted) {
        return <div className="flex-1 h-[calc(100vh-4rem)] animate-pulse bg-muted/30 rounded-md" />
    }

    return (
        <div className="flex-1 h-[calc(100vh-4rem)]">
            <PanelGroup
                orientation="horizontal"
                id="brain-panels"
                defaultLayout={savedLayout}
                onLayoutChanged={(layout) => {
                    try {
                        sessionStorage.setItem('brain-panel-sizes', JSON.stringify(layout))
                    } catch {
                        // ignore
                    }
                }}
            >
                {/* File tree panel */}
                <Panel
                    id="file-tree"
                    panelRef={fileTreePanelRef}
                    defaultSize="20%"
                    minSize="10%"
                    collapsible={true}
                    collapsedSize="3%"
                    onResize={(size) => {
                        const isNowCollapsed = size.asPercentage <= 4
                        setFileTreeCollapsed(prev => {
                            if (prev !== isNowCollapsed) return isNowCollapsed
                            return prev
                        })
                    }}
                >
                    {fileTreeCollapsed ? (
                        <div
                            className="flex flex-col items-center justify-start h-full border-r pt-4 cursor-pointer hover:bg-accent/50"
                            onClick={() => fileTreePanelRef.current?.expand()}
                            title="Expand file tree"
                        >
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                    ) : (
                        <FileTree
                            notes={notes}
                            selectedNoteId={selectedNoteId}
                            onSelectNote={setSelectedNoteId}
                            onCreateNote={handleCreateNote}
                            onCreateFolder={handleCreateFolder}
                            onRenameNote={handleRenameNote}
                            onRenameFolder={handleRenameFolder}
                            onDeleteNote={handleDeleteNote}
                            onDeleteFolder={handleDeleteFolder}
                            onMoveNote={handleMoveNote}
                            onExportNote={handleExportNote}
                            onExportAll={handleExportAll}
                        />
                    )}
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                {/* Markdown editor panel */}
                <Panel id="editor" defaultSize="55%" minSize="30%">
                    <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                {/* AI chat panel */}
                <Panel
                    id="ai-chat"
                    panelRef={aiPanelRef}
                    defaultSize="25%"
                    minSize="10%"
                    collapsible={true}
                    collapsedSize="3%"
                    onResize={(size) => {
                        const isNowCollapsed = size.asPercentage <= 4
                        setAiCollapsed(prev => {
                            if (prev !== isNowCollapsed) return isNowCollapsed
                            return prev
                        })
                    }}
                >
                    {aiCollapsed ? (
                        <div
                            className="flex flex-col items-center justify-start h-full border-l pt-4 cursor-pointer hover:bg-accent/50"
                            onClick={() => aiPanelRef.current?.expand()}
                            title="Expand AI chat"
                        >
                            <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                    ) : (
                        <BrainChatPanel
                            currentNote={selectedNote}
                            activeNoteId={selectedNoteId}
                            onNoteCreated={fetchNotes}
                            onNoteUpdated={fetchNotes}
                        />
                    )}
                </Panel>
            </PanelGroup>
        </div>
    )
}
