"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, RotateCcw } from "lucide-react"
import { streamChatWithAI, type Message } from "@/lib/ai/client"
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
    const [messages, setMessages] = React.useState<Message[]>([
        { role: 'assistant', content: "Hi! I can help you with your notes, tasks, and calendar. Ask me anything!" }
    ])
    const [isLoading, setIsLoading] = React.useState(false)
    const [streamingContent, setStreamingContent] = React.useState("")
    const [lastError, setLastError] = React.useState(false)
    const [models, setModels] = React.useState<string[]>([])
    const [selectedModel, setSelectedModel] = React.useState<string>('kimi-k2.5:cloud')
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    // Fetch available models on mount
    React.useEffect(() => {
        fetch('/api/ai/models')
            .then(res => res.json())
            .then(data => {
                const modelNames = data.models?.map((m: { name: string }) => m.name) || []
                setModels(modelNames)
                if (modelNames.includes('kimi-k2.5:cloud')) {
                    setSelectedModel('kimi-k2.5:cloud')
                } else if (modelNames.length > 0) {
                    setSelectedModel(modelNames[0])
                }
            })
            .catch(err => console.error('Failed to fetch models:', err))
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
            setMessages(prev => [...prev, finalMessage])
            setStreamingContent("")

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
        // Find the last user message and re-send it
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
        if (lastUserMsg) {
            // Remove the last error message and re-send
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

    return (
        <div className="flex flex-col h-full border-l">
            <div className="p-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">AI Assistant</h3>
                    </div>
                    {models.length > 0 && (
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-background"
                            disabled={isLoading}
                        >
                            {models.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    )}
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
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
        </div>
    )
}
