"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Trash2, SquarePen, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { type ChatSession } from "@/app/dashboard/ai/actions"
import { cn } from "@/lib/utils"

interface ChatHistoryListProps {
    sessions: ChatSession[]
    currentSessionId: string | null
    onLoad: (session: ChatSession) => void
    onDelete: (id: string) => void
    onNew: () => void
    className?: string
}

export function ChatHistoryList({
    sessions,
    currentSessionId,
    onLoad,
    onDelete,
    onNew,
    className,
}: ChatHistoryListProps) {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="shrink-0 p-3 border-b border-gray-100 dark:border-white/[0.06]">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-full text-xs border-gray-200 bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-white/[0.10] dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white/90"
                    onClick={onNew}
                >
                    <SquarePen className="h-3.5 w-3.5" />
                    New Conversation
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                        <MessageSquare className="h-8 w-8 text-gray-200 dark:text-white/10" />
                        <p className="text-xs text-gray-400 dark:text-white/30">
                            No saved conversations yet.
                        </p>
                        <p className="text-xs text-gray-300 dark:text-white/20">
                            Start a chat and it will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                        {sessions.map(session => (
                            <SessionRow
                                key={session.id}
                                session={session}
                                isActive={session.id === currentSessionId}
                                onLoad={onLoad}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

interface SessionRowProps {
    session: ChatSession
    isActive: boolean
    onLoad: (session: ChatSession) => void
    onDelete: (id: string) => void
}

function SessionRow({ session, isActive, onLoad, onDelete }: SessionRowProps) {
    const relativeDate = React.useMemo(
        () => formatDistanceToNow(new Date(session.updated_at), { addSuffix: true }),
        [session.updated_at]
    )

    return (
        <div
            className={cn(
                "group flex items-start gap-2 px-3 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                isActive && "bg-gray-50 dark:bg-white/[0.04]"
            )}
            onClick={() => onLoad(session)}
        >
            <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-[#111] dark:text-white/85 leading-tight">
                    {session.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 dark:text-white/30">
                        {relativeDate}
                    </span>
                    {session.model && (
                        <>
                            <span className="text-gray-200 dark:text-white/10">·</span>
                            <span className="font-mono-ui text-[10px] text-gray-300 dark:text-white/20 truncate max-w-[100px]">
                                {session.model}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 dark:text-white/20 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Delete conversation"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{session.title}&rdquo; will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => { e.stopPropagation(); onDelete(session.id) }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
