"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Share2, FileText } from "lucide-react"
import { CreateNoteDialog } from "@/components/brain/create-note-dialog"
import { getNotes } from "./actions"
import { type Note } from "@/types"
import { cn } from "@/lib/utils"

export default function SecondBrainPage() {
    const [notes, setNotes] = React.useState<Note[]>([])
    const [search, setSearch] = React.useState("")

    const fetchNotes = React.useCallback(async () => {
        const data = await getNotes()
        setNotes(data as unknown as Note[])
    }, [])

    React.useEffect(() => {
        fetchNotes()
    }, [fetchNotes])

    const filteredNotes = notes.filter(note =>
        note.content.toLowerCase().includes(search.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Second Brain</h2>
                <CreateNoteDialog onSuccess={fetchNotes} />
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search your brain..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {filteredNotes.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-10">No thoughts recorded yet.</p>}

                {filteredNotes.map(note => (
                    <Card key={note.id} className="cursor-pointer hover:bg-accent/50 transition-colors h-[200px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{note.content.split('\n')[0].substring(0, 20) || "Untitled"}...</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap flex-1">
                                {note.content}
                            </p>
                            <div className="mt-4 flex gap-2 items-center">
                                {note.tags?.map(tag => (
                                    <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                                {note.is_shared && <Share2 className="h-3 w-3 text-muted-foreground ml-auto" />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
