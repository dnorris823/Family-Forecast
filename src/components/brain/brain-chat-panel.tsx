"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User } from "lucide-react"
import { chatWithAI, type Message } from "@/lib/ai/client"
import { cn } from "@/lib/utils"
import { type Note } from "@/types"

interface BrainChatPanelProps {
    currentNote: Note | null
    onNoteCreated?: () => void
}

export function BrainChatPanel({ currentNote, onNoteCreated }: BrainChatPanelProps) {
    const [input, setInput] = React.useState("")
    const [messages, setMessages] = React.useState<Message[]>([
        { role: 'assistant', content: "Hi! I can help you with your notes. Ask me anything!" }
    ])
    const [isLoading, setIsLoading] = React.useState(false)
    const [models, setModels] = React.useState<string[]>([])
    const [selectedModel, setSelectedModel] = React.useState<string>('llama3.1')

    // Fetch available models on mount
    React.useEffect(() => {
        fetch('/api/ai/models')
            .then(res => res.json())
            .then(data => {
                const modelNames = data.models?.map((m: any) => m.name) || []
                setModels(modelNames)
                if (modelNames.includes('llama3.1')) {
                    setSelectedModel('llama3.1')
                } else if (modelNames.length > 0) {
                    setSelectedModel(modelNames[0])
                }
            })
            .catch(err => console.error('Failed to fetch models:', err))
    }, [])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const responseContent = await chatWithAI([...messages, userMessage], selectedModel)
            const aiMessage: Message = { role: 'assistant', content: responseContent }
            setMessages(prev => [...prev, aiMessage])

            // Trigger refresh if AI created a note
            if (onNoteCreated && responseContent.toLowerCase().includes('created')) {
                setTimeout(() => onNoteCreated(), 500)
            }
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I had trouble connecting to my brain."
            }])
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

    const askAboutNote = () => {
        if (!currentNote) return
        const question = `Tell me about this note: "${currentNote.title || 'Untitled'}"`
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

            <ScrollArea className="flex-1 p-3">
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
                                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 text-xs mr-auto max-w-[90%]">
                            <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted">
                                <Bot className="h-3 w-3 animate-pulse" />
                            </div>
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground italic text-xs">
                                Thinking...
                            </div>
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
                        onClick={handleSend}
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
