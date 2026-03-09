"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from "react-resizable-panels"
import { FolderOpen, Bot, X } from "lucide-react"
import { FileTree } from "@/components/brain/file-tree"
import { MarkdownEditor } from "@/components/brain/markdown-editor"
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
    seedDefaultNotes,
    updateUserIndex,
    updateAIMemoryIndex,
} from "./actions"
import { type Note } from "@/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { useMediaQuery } from "@/hooks/use-media-query"

// Helpers to determine which section a path belongs to
function isUserPath(folderPath: string | null): boolean {
    return (folderPath ?? '').startsWith('/User')
}
function isAIMemoryPath(folderPath: string | null): boolean {
    return (folderPath ?? '').startsWith('/AI Memory')
}

export default function SecondBrainPage() {
    const [mounted, setMounted] = React.useState(false)
    const [notes, setNotes] = React.useState<Note[]>([])
    const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null)
    const [isSeeding, setIsSeeding] = React.useState(false)
    const [showOnboarding, setShowOnboarding] = React.useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")

    React.useEffect(() => { setMounted(true) }, [])

    // Panel collapse states (desktop only)
    const [fileTreeCollapsed, setFileTreeCollapsed] = React.useState(false)
    const fileTreePanelRef = usePanelRef()

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
        fetchNotes().then(async () => {
            // Seed default structure if /User/_index doesn't exist yet
            const data = await getNotes()
            const hasDefaultStructure = data.some(
                n => n.folder_path === '/User' && n.title === '_index'
            )
            if (!hasDefaultStructure) {
                setIsSeeding(true)
                await seedDefaultNotes()
                await fetchNotes()
                setIsSeeding(false)
                try {
                    if (!localStorage.getItem('brain-onboarded')) {
                        setShowOnboarding(true)
                    }
                } catch { /* ignore */ }
            }
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCreateNote = async (folderPath: string) => {
        const result = await createNote('Untitled', '', folderPath, false)
        if (result && 'id' in result) {
            await fetchNotes()
            setSelectedNoteId(result.id)
            if (isUserPath(folderPath)) await updateUserIndex()
            if (isAIMemoryPath(folderPath)) await updateAIMemoryIndex()
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
        const note = notes.find(n => n.id === noteId)
        await renameNote(noteId, newTitle)
        await fetchNotes()
        if (isUserPath(note?.folder_path ?? null)) await updateUserIndex()
        if (isAIMemoryPath(note?.folder_path ?? null)) await updateAIMemoryIndex()
    }

    const handleRenameFolder = async (oldPath: string, newPath: string) => {
        await renameFolder(oldPath, newPath)
        await fetchNotes()
        if (isUserPath(oldPath)) await updateUserIndex()
        if (isAIMemoryPath(oldPath)) await updateAIMemoryIndex()
    }

    const handleDeleteNote = async (noteId: string) => {
        const note = notes.find(n => n.id === noteId)
        await deleteNote(noteId)
        if (selectedNoteId === noteId) setSelectedNoteId(null)
        await fetchNotes()
        if (isUserPath(note?.folder_path ?? null)) await updateUserIndex()
        if (isAIMemoryPath(note?.folder_path ?? null)) await updateAIMemoryIndex()
    }

    const handleDeleteFolder = async (folderPath: string) => {
        await deleteFolder(folderPath)
        const selectedNote = notes.find(n => n.id === selectedNoteId)
        if (selectedNote && (selectedNote.folder_path || '/').startsWith(folderPath)) {
            setSelectedNoteId(null)
        }
        await fetchNotes()
        if (isUserPath(folderPath)) await updateUserIndex()
        if (isAIMemoryPath(folderPath)) await updateAIMemoryIndex()
    }

    const handleMoveNote = async (noteId: string, newFolderPath: string) => {
        const note = notes.find(n => n.id === noteId)
        await moveNote(noteId, newFolderPath)
        await fetchNotes()
        if (isUserPath(note?.folder_path ?? null) || isUserPath(newFolderPath)) await updateUserIndex()
    }

    const handleCreateFolder = async (parentPath: string, name: string) => {
        const folderPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`
        const result = await createNote('Untitled', '', folderPath, false)
        if (result && 'id' in result) {
            await fetchNotes()
            setSelectedNoteId(result.id)
            if (isUserPath(folderPath)) await updateUserIndex()
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

    const dismissOnboarding = () => {
        setShowOnboarding(false)
        try { localStorage.setItem('brain-onboarded', 'true') } catch { /* ignore */ }
    }

    const openPersonalityNote = () => {
        const personalityNote = notes.find(
            n => n.folder_path === '/AI Memory' && n.title === 'personality'
        )
        if (personalityNote) {
            setSelectedNoteId(personalityNote.id)
            dismissOnboarding()
        }
    }

    // Onboarding banner (shown once after first seed)
    const OnboardingBanner = showOnboarding ? (
        <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/30">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <p className="flex-1 text-blue-800 dark:text-blue-300">
                <strong>Your Brain is set up!</strong> <strong>My Notes</strong> is for your personal notes.{' '}
                <strong>AI Memory</strong> teaches the AI about your family —{' '}
                <button
                    onClick={openPersonalityNote}
                    className="underline underline-offset-2 hover:no-underline"
                >
                    open personality
                </button>{' '}
                to name your assistant.
            </p>
            <button
                onClick={dismissOnboarding}
                className="shrink-0 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    ) : null

    // Seeding skeleton overlay
    const SeedingSkeleton = isSeeding ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Bot className="h-8 w-8 animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Setting up your Brain...</p>
        </div>
    ) : null

    // Mobile: Use tabs
    if (isMobile) {
        return (
            <div className="relative flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden">
                {SeedingSkeleton}
                {OnboardingBanner}
                <Tabs defaultValue="notes" className="animate-fade-in [animation-delay:0.1s] flex flex-1 flex-col min-h-0">
                    <TabsList className="h-auto w-full shrink-0 rounded-full bg-[#f0f0f0] p-1.5 dark:bg-white/[0.06]">
                        <TabsTrigger value="notes" className="flex-1 rounded-full py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40">Notes</TabsTrigger>
                        <TabsTrigger value="editor" className="flex-1 rounded-full py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40">Editor</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes" className="flex-1 min-h-0 overflow-hidden">
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
                    <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden">
                        <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
                    </TabsContent>
                </Tabs>
            </div>
        )
    }

    // Desktop: react-resizable-panels three-column layout (v4 API)
    // Panels are suppressed until mounted to avoid SSR/client style hydration mismatch
    if (!mounted) {
        return <div className="h-[calc(100vh-4rem)] flex-1 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
    }

    return (
        <div className="relative flex-1 h-[calc(100vh-4rem)] flex flex-col">
            {SeedingSkeleton}
            {OnboardingBanner}
            <PanelGroup
                className="animate-fade-in [animation-delay:0.1s] flex-1 min-h-0"
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
                            className="flex h-full cursor-pointer flex-col items-center justify-start border-r border-gray-100 pt-4 transition-colors hover:bg-gray-50 dark:border-white/[0.05] dark:hover:bg-white/[0.02]"
                            onClick={() => fileTreePanelRef.current?.expand()}
                            title="Expand file tree"
                        >
                            <FolderOpen className="h-4 w-4 text-gray-400 dark:text-white/30" />
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

                <PanelResizeHandle className="w-px bg-gray-100 transition-colors hover:bg-gray-300 dark:bg-white/[0.05] dark:hover:bg-white/10" />

                {/* Markdown editor panel */}
                <Panel id="editor" defaultSize="80%" minSize="30%">
                    <MarkdownEditor note={selectedNote} onSave={handleSaveNote} />
                </Panel>
            </PanelGroup>
        </div>
    )
}
