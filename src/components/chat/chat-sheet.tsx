"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bot, Send, ArrowUpRight, X, Settings } from "lucide-react"
import { chatWithAI, type Message } from "@/lib/ai/client"
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
import Link from "next/link"

const MIN_WIDTH = 340
const MAX_WIDTH = 960
const DEFAULT_WIDTH = 580

export function ChatSheet() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [input, setInput] = React.useState("")
    const [aiName, setAiName] = React.useState<string | null>(null)
    const [messages, setMessages] = React.useState<Message[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState("chat")
    const [sessions, setSessions] = React.useState<ChatSession[]>([])
    const [sessionsLoaded, setSessionsLoaded] = React.useState(false)
    const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null)
    const [sheetWidth, setSheetWidth] = React.useState(DEFAULT_WIDTH)
    const bottomRef = React.useRef<HTMLDivElement>(null)
    const isDragging = React.useRef(false)
    const dragStartX = React.useRef(0)
    const dragStartWidth = React.useRef(0)

    const { selectedModel } = useAIModel()

    // Fetch AI name on mount
    React.useEffect(() => {
        getAIName().then(name => {
            setAiName(name)
            const displayName = name ?? 'Family AI'
            setMessages([{ role: 'assistant', content: `Hi! I'm ${displayName}. Ask me about your calendar or tasks.` }])
        }).catch(() => {
            setMessages([{ role: 'assistant', content: "Hi! I'm your family AI. Ask me about your calendar or tasks." }])
        })
    }, [])

    // Load sessions when sheet opens (once)
    React.useEffect(() => {
        if (isOpen && !sessionsLoaded) {
            getChatSessions().then(data => {
                setSessions(data)
                setSessionsLoaded(true)
            }).catch(err => console.error('Failed to load chat sessions:', err))
        }
    }, [isOpen, sessionsLoaded])

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    // Horizontal resize drag logic
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true
        dragStartX.current = e.clientX
        dragStartWidth.current = sheetWidth
        e.preventDefault()
    }

    React.useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return
            // Sheet is on the right; dragging the left edge leftward = wider
            const delta = dragStartX.current - e.clientX
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta))
            setSheetWidth(newWidth)
        }
        const onMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
            }
        }
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput("")
        setIsLoading(true)

        try {
            const responseContent = await chatWithAI(updatedMessages, selectedModel)
            const finalMessages = [...updatedMessages, { role: 'assistant' as const, content: responseContent }]
            setMessages(finalMessages)

            // Auto-save: create session on first exchange, update on subsequent ones
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
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble connecting." }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleNewConversation = () => {
        const displayName = aiName ?? 'Family AI'
        setMessages([{ role: 'assistant', content: `Hi! I'm ${displayName}. Ask me about your calendar or tasks.` }])
        setInput("")
        setCurrentSessionId(null)
        setActiveTab("chat")
    }

    const handleLoadSession = (session: ChatSession) => {
        setMessages(session.messages as Message[])
        setCurrentSessionId(session.id)
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
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {/* Trigger */}
            <SheetTrigger asChild>
                <button className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-[#111] px-5 py-3 text-sm font-medium text-white shadow-xl transition-opacity hover:opacity-80 dark:bg-white dark:text-[#111]">
                    <Bot className="h-4 w-4" />
                    {aiName ?? 'Family AI'}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                </button>
            </SheetTrigger>

            {/* Sheet panel */}
            <SheetContent
                side="right"
                style={{ width: sheetWidth, maxWidth: sheetWidth }}
                className="flex flex-col gap-0 border-l border-gray-100 bg-white p-0 dark:border-white/[0.06] dark:bg-[#111]"
            >
                {/* Left-edge resize handle */}
                <div
                    className="absolute left-0 top-0 z-20 h-full w-2 cursor-col-resize group"
                    onMouseDown={(e) => {
                        document.body.style.cursor = 'col-resize'
                        document.body.style.userSelect = 'none'
                        handleResizeMouseDown(e)
                    }}
                >
                    <div className="h-full w-px bg-gray-100 transition-colors group-hover:bg-gray-400 dark:bg-white/[0.06] dark:group-hover:bg-white/20" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111] dark:bg-white">
                            <Bot className="h-3.5 w-3.5 text-white dark:text-[#111]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-tight text-[#111] dark:text-white/90">
                                {aiName ?? 'Family AI'}
                            </span>
                            {selectedModel && (
                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-1 font-mono-ui text-[10px] text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                                    title="Change model in Settings"
                                >
                                    {selectedModel}
                                    <Settings className="h-2.5 w-2.5" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-white/30 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-1 flex-col min-h-0"
                >
                    <TabsList className="h-auto shrink-0 rounded-none border-b border-gray-100 bg-transparent p-0 dark:border-white/[0.06]">
                        <TabsTrigger
                            value="chat"
                            className="flex-1 rounded-none border-b-2 border-transparent py-2.5 text-xs font-medium text-gray-500 data-[state=active]:border-[#111] data-[state=active]:text-[#111] data-[state=active]:shadow-none dark:text-white/40 dark:data-[state=active]:border-white dark:data-[state=active]:text-white"
                        >
                            Chat
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="flex-1 rounded-none border-b-2 border-transparent py-2.5 text-xs font-medium text-gray-500 data-[state=active]:border-[#111] data-[state=active]:text-[#111] data-[state=active]:shadow-none dark:text-white/40 dark:data-[state=active]:border-white dark:data-[state=active]:text-white"
                        >
                            History
                        </TabsTrigger>
                    </TabsList>

                    {/* Chat tab */}
                    <TabsContent value="chat" className="flex flex-1 flex-col min-h-0 mt-0">
                        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
                            <div className="w-full space-y-5">
                                {messages.map((m, i) => (
                                    m.role === 'user' ? (
                                        /* User message — pill bubble, right-aligned */
                                        <div key={i} className="flex justify-end">
                                            <div className="max-w-[80%] min-w-0 break-words overflow-hidden rounded-2xl rounded-br-sm bg-[#111] px-4 py-2.5 text-sm leading-relaxed text-white dark:bg-white dark:text-[#111]">
                                                {m.content}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Assistant message — preview-style, full width */
                                        <div key={i} className="flex gap-3">
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111] dark:bg-white">
                                                <Bot className="h-3 w-3 text-white dark:text-[#111]" />
                                            </div>
                                            <div className={cn(
                                                "flex-1 min-w-0 text-sm text-[#111] dark:text-white/85",
                                                "bg-[#f0f0f0] dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3",
                                                "prose prose-sm dark:prose-invert max-w-none break-words",
                                                "prose-p:my-1.5 prose-p:leading-relaxed",
                                                "prose-headings:font-semibold prose-headings:text-[#111] dark:prose-headings:text-white/90",
                                                "prose-h1:text-lg prose-h1:mt-4 prose-h1:mb-2",
                                                "prose-h2:text-base prose-h2:mt-3 prose-h2:mb-1.5",
                                                "prose-h3:text-sm prose-h3:mt-2.5 prose-h3:mb-1",
                                                "prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[#111] prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-white/[0.08] dark:prose-code:text-white/85",
                                                "prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-gray-100 prose-pre:p-4 dark:prose-pre:bg-white/[0.06]",
                                                "prose-blockquote:border-l-gray-200 prose-blockquote:text-gray-500 dark:prose-blockquote:border-l-white/20 dark:prose-blockquote:text-white/50",
                                                "prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
                                                "[&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm [&_th]:font-medium",
                                                "prose-hr:border-gray-100 dark:prose-hr:border-white/[0.06]",
                                                "prose-a:text-[#111] prose-a:underline prose-a:underline-offset-2 dark:prose-a:text-white/80"
                                            )}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                    {m.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )
                                ))}

                                {isLoading && (
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111] dark:bg-white">
                                            <Bot className="h-3 w-3 text-white dark:text-[#111]" />
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-1">
                                            {[0, 1, 2].map(i => (
                                                <span
                                                    key={i}
                                                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 dark:bg-white/30"
                                                    style={{ animationDelay: `${i * 150}ms` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-100 p-4 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-[#f8f8f8] pl-4 pr-1.5 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    placeholder="Ask about your schedule..."
                                    className="flex-1 bg-transparent text-sm text-[#111] placeholder:text-gray-300 focus:outline-none disabled:opacity-50 dark:text-white/90 dark:placeholder:text-white/20"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-white transition-opacity disabled:opacity-30 hover:opacity-80 dark:bg-white dark:text-[#111]"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </button>
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
            </SheetContent>
        </Sheet>
    )
}
