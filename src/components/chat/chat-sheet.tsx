"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Send, Bot, User } from "lucide-react"
import { chatWithAI, type Message } from "@/lib/ai/client"
import { cn } from "@/lib/utils"

export function ChatSheet() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [input, setInput] = React.useState("")
    const [messages, setMessages] = React.useState<Message[]>([
        { role: 'assistant', content: "Hi! I'm your family AI. Ask me about your calendar or tasks." }
    ])
    const [isLoading, setIsLoading] = React.useState(false)
    const [models, setModels] = React.useState<string[]>([])
    const [selectedModel, setSelectedModel] = React.useState<string>('llama3.1')

    // Fetch available models when sheet opens
    React.useEffect(() => {
        if (isOpen && models.length === 0) {
            fetch('/api/ai/models')
                .then(res => res.json())
                .then(data => {
                    const modelNames = data.models?.map((m: any) => m.name) || []
                    setModels(modelNames)
                    // Set default if available
                    if (modelNames.includes('llama3.1')) {
                        setSelectedModel('llama3.1')
                    } else if (modelNames.length > 0) {
                        setSelectedModel(modelNames[0])
                    }
                })
                .catch(err => console.error('Failed to fetch models:', err))
        }
    }, [isOpen, models.length])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            // Create a temporary history for the API (excluding the initial greeting if needed, strictly it's fine)
            const responseContent = await chatWithAI([...messages, userMessage], selectedModel)

            const aiMessage: Message = { role: 'assistant', content: responseContent }
            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble connecting to my brain." }])
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
            <SheetTrigger asChild>
                <Button
                    className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg p-0 z-50"
                    size="icon"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            Family AI
                        </SheetTitle>
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
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex gap-3 text-sm max-w-[80%]",
                                    m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                    m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-lg",
                                    m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 text-sm mr-auto max-w-[80%]">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted">
                                    <Bot className="h-4 w-4 animate-pulse" />
                                </div>
                                <div className="p-3 rounded-lg bg-muted text-muted-foreground italic">
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ask about your schedule..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
