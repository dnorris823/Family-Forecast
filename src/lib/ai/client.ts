
export interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

// Legacy non-streaming function kept for any other callers
export async function chatWithAI(messages: Message[], model?: string) {
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model }),
    })

    if (!response.ok) {
        throw new Error('Failed to chat with AI')
    }

    const contentType = response.headers.get('Content-Type') || ''
    if (contentType.includes('text/plain')) {
        return await response.text()
    }

    const data = await response.json()
    return data.response as string
}

// Streaming-aware chat function for BrainChatPanel (T036)
export async function streamChatWithAI(
    messages: Message[],
    model: string,
    activeNoteId: string | null,
    onChunk: (chunk: string) => void
): Promise<void> {
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, activeNoteId }),
    })

    if (!response.ok) {
        throw new Error('Failed to chat with AI')
    }

    const contentType = response.headers.get('Content-Type') || ''

    // Streaming response (text/plain)
    if (contentType.includes('text/plain') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            if (chunk) onChunk(chunk)
        }
        return
    }

    // Fallback: JSON response (when Ollama streaming is unavailable)
    const data = await response.json()
    const content = data.response as string
    if (content) onChunk(content)
}
