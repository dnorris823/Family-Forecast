"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, ArrowUpRight, X } from "lucide-react"
import { chatWithAI, type Message } from "@/lib/ai/client"
import { getAIName } from "@/app/dashboard/brain/actions"
import { cn } from "@/lib/utils"

export function ChatSheet() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [input, setInput] = React.useState("")
    const [aiName, setAiName] = React.useState<string | null>(null)
    const [messages, setMessages] = React.useState<Message[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [models, setModels] = React.useState<string[]>([])
    const [selectedModel, setSelectedModel] = React.useState<string>('kimi-k2.5:cloud')
    const bottomRef = React.useRef<HTMLDivElement>(null)

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

    React.useEffect(() => {
        if (isOpen && models.length === 0) {
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
        }
    }, [isOpen, models.length])

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const responseContent = await chatWithAI([...messages, userMessage], selectedModel)
            setMessages(prev => [...prev, { role: 'assistant', content: responseContent }])
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

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {/* Trigger — Awakee black pill CTA */}
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
                className="flex w-[400px] flex-col gap-0 border-l border-gray-100 bg-white p-0 sm:w-[460px] dark:border-white/[0.06] dark:bg-[#111]"
            >
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
                            {models.length > 0 && (
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    disabled={isLoading}
                                    className="font-mono-ui border-0 bg-transparent p-0 text-[10px] text-gray-400 focus:outline-none disabled:opacity-50 dark:text-white/30"
                                >
                                    {models.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
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

                {/* Messages */}
                <ScrollArea className="flex-1 px-5 py-4">
                    <div className="space-y-3">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex max-w-[82%] text-sm",
                                    m.role === 'user' ? "ml-auto justify-end" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl px-4 py-2.5 leading-relaxed",
                                    m.role === 'user'
                                        ? "rounded-br-sm bg-[#111] text-white dark:bg-white dark:text-[#111]"
                                        : "rounded-bl-sm bg-[#f5f5f5] text-[#111] dark:bg-white/[0.07] dark:text-white/85"
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="mr-auto flex max-w-[82%]">
                                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#f5f5f5] px-4 py-3.5 dark:bg-white/[0.07]">
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
                </ScrollArea>

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
            </SheetContent>
        </Sheet>
    )
}
