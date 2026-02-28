
export interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export async function chatWithAI(messages: Message[], model?: string) {
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, model }),
    })

    if (!response.ok) {
        throw new Error('Failed to chat with AI')
    }

    // Handle streaming response if we implement streaming later
    // For now, assume simple JSON response for MVP
    // But wait, my design said streaming. 
    // Let's implement a simple fetch for now that returns text.

    const data = await response.json()
    return data.response as string
}
