"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Bot, User, RotateCcw, SquarePen } from "lucide-react"
import { streamChatWithAI, type Message } from "@/lib/ai/client"
import { getAIName } from "@/app/dashboard/brain/actions"
import {
    getChatSessions,
    createChatSession,
    updateChatSession,
    deleteChatSession,
    type ChatSession,
} from "@/app/dashboard/ai/actions"
import { useAIModel } from "@/hooks/use-ai-model"
import { ChatHistoryList } from "@/components/chat/chat-history-list"
import { markdownComponents } from "@/components/chat/markdown-components"
import { cn } from "@/lib/utils"
import { type Note } from "@/types"

interface BrainChatPanelProps {
    currentNote: Note | null
    activeNoteId: string | null
    onNoteCreated?: () => void
    onNoteUpdated?: () => void
}

export function BrainChatPanel({ currentNote, activeNoteId, onNoteCreated, onNoteUpdated }: BrainChatPanelProps) {
    const [input, setInput] = React.useState("")
    const [aiName, setAiName] = React.useState<string | null>(null)
    const [messages, setMessages] = React.useState<Message[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [streamingContent, setStreamingContent] = React.useState("")
    const [lastError, setLastError] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState("chat")
    const [sessions, setSessions] = React.useState<ChatSession[]>([])
    const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null)
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    const { selectedModel } = useAIModel()

    // Fetch AI name and load sessions on mount
    React.useEffect(() => {
        getAIName().then(name => {
            setAiName(name)
            const displayName = name ?? 'Assistant'
            setMessages([{ role: 'assistant', content: `Hi! I'm ${displayName}. I can help you with your notes, tasks, and calendar.` }])
        }).catch(() => {
            setMessages([{ role: 'assistant', content: "Hi! I can help you with your notes, tasks, and calendar. Ask me anything!" }])
        })

        getChatSessions().then(setSessions).catch(err => console.error('Failed to load chat sessions:', err))
    }, [])

    // Auto-scroll to bottom on new messages
    React.useEffect(() => {
        if (scrollAreaRef.current) {
            const el = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (el) el.scrollTop = el.scrollHeight
        }
    }, [messages, streamingContent])

    const handleSend = async (overrideInput?: string) => {
        const text = (overrideInput ?? input).trim()
        if (!text || isLoading) return

        const userMessage: Message = { role: 'user', content: text }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput("")
        setIsLoading(true)
        setStreamingContent("")
        setLastError(false)

        let accumulated = ""

        try {
            await streamChatWithAI(
                updatedMessages,
                selectedModel,
                activeNoteId,
                (chunk) => {
                    accumulated += chunk
                    setStreamingContent(accumulated)
                }
            )

            const finalMessage: Message = { role: 'assistant', content: accumulated || "..." }
            const finalMessages = [...updatedMessages, finalMessage]
            setMessages(finalMessages)
            setStreamingContent("")

            // Auto-save after first AI response
            if (!currentSessionId) {
                const result = await createChatSession(
                    userMessage.content.slice(0, 100),
                    finalMessages,
                    selectedModel
                )
                if ('id' in result) {
                    setCurrentSessionId(result.id)
                    const updated = await getChatSessions()
                    setSessions(updated)
                }
            } else {
                await updateChatSession(currentSessionId, finalMessages, selectedModel)
                const updated = await getChatSessions()
                setSessions(updated)
            }

            // Detect if AI created or updated a note
            const lc = accumulated.toLowerCase()
            if (onNoteCreated && (lc.includes("i've created") || lc.includes("i created") || lc.includes("created a note"))) {
                setTimeout(() => onNoteCreated(), 500)
            }
            if (onNoteUpdated && (lc.includes("i've updated") || lc.includes("i've modified") || lc.includes("updated the note") || lc.includes("i updated"))) {
                setTimeout(() => onNoteUpdated(), 500)
            }
        } catch (error) {
            console.error(error)
            setStreamingContent("")
            setLastError(true)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "⚠️ Sorry, I had trouble connecting. Please try again."
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleRetry = () => {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
        if (lastUserMsg) {
            setMessages(prev => prev.filter((_, i) => i < prev.length - 1))
            setLastError(false)
            handleSend(lastUserMsg.content)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const askAboutNote = () => {
        if (!currentNote) return
        const question = `Tell me about the note titled "${currentNote.title || 'Untitled'}".`
        setInput(question)
    }

    const handleNewConversation = () => {
        if (isLoading) return
        const displayName = aiName ?? 'Assistant'
        setMessages([{ role: 'assistant', content: `Hi! I'm ${displayName}. I can help you with your notes, tasks, and calendar.` }])
        setStreamingContent("")
        setLastError(false)
        setInput("")
        setCurrentSessionId(null)
        setActiveTab("chat")
    }

    const handleLoadSession = (session: ChatSession) => {
        setMessages(session.messages as Message[])
        setCurrentSessionId(session.id)
        setStreamingContent("")
        setLastError(false)
        setActiveTab("chat")
    }

    const handleDeleteSession = async (id: string) => {
        await deleteChatSession(id)
        setSessions(prev => prev.filter(s => s.id !== id))
        if (currentSessionId === id) {
            handleNewConversation()
        }
    }

    return (
        <div className="flex flex-col h-full border-l">
            {/* Header */}
            <div className="p-3 border-b space-y-2">
                <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight truncate">
                            {aiName ?? 'Assistant'}
                        </h3>
                        {selectedModel && (
                            <span className="text-[10px] text-muted-foreground truncate">
                                {selectedModel}
                            </span>
                        )}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={handleNewConversation}
                        disabled={isLoading}
                        title="New conversation"
                    >
                        <SquarePen className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {currentNote && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7"
                        onClick={askAboutNote}
                    >
                        Ask about this note
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-1 flex-col min-h-0"
            >
                <TabsList className="h-auto shrink-0 w-full rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                        value="chat"
                        className="flex-1 rounded-none border-b-2 border-transparent py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground"
                    >
                        Chat
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="flex-1 rounded-none border-b-2 border-transparent py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground"
                    >
                        History
                    </TabsTrigger>
                </TabsList>

                {/* Chat tab */}
                <TabsContent value="chat" className="flex flex-1 flex-col min-h-0 mt-0">
                    <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
                        <div className="space-y-3">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-2 text-xs max-w-[90%]",
                                        m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <div className={cn(
                                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        {m.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-lg text-xs",
                                        m.role === 'user'
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted prose prose-sm dark:prose-invert max-w-none"
                                    )}>
                                        {m.role === 'assistant' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                {m.content}
                                            </ReactMarkdown>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Streaming in-progress bubble */}
                            {isLoading && (
                                <div className="flex gap-2 text-xs mr-auto max-w-[90%]">
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted">
                                        <Bot className="h-3 w-3 animate-pulse" />
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted prose prose-sm dark:prose-invert max-w-none">
                                        {streamingContent ? (
                                            <>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                    {streamingContent}
                                                </ReactMarkdown>
                                                <span className="inline-block w-1 h-3 bg-current animate-pulse ml-0.5 align-middle" />
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground italic">Thinking...</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Error retry button */}
                            {lastError && !isLoading && (
                                <div className="flex justify-center">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 gap-1"
                                        onClick={handleRetry}
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Retry
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask about your notes..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className="text-xs h-8"
                            />
                            <Button
                                size="icon"
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="h-8 w-8"
                            >
                                <Send className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* History tab */}
                <TabsContent value="history" className="flex-1 min-h-0 mt-0">
                    <ChatHistoryList
                        sessions={sessions}
                        currentSessionId={currentSessionId}
                        onLoad={handleLoadSession}
                        onDelete={handleDeleteSession}
                        onNew={handleNewConversation}
                        className="h-full"
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
