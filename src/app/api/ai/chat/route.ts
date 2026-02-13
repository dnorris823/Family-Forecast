import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()
        const lastMessage = messages[messages.length - 1]

        // 1. Get Context (Mocked for now)
        const context = `
      Current Time: ${new Date().toLocaleString()}
      User's Name: Dad
      Events: Soccer Practice at 4pm today.
      Tasks: Buy Milk.
    `

        // 2. Construct Prompt
        const systemPrompt = `You are a helpful Family AI Assistant. You have access to the family calendar and tasks.
    
    Context:
    ${context}
    `

        // 3. Call Ollama
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        const model = 'llama3' // Hardcoded for MVP, make dynamic later

        const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                stream: false // For simple MVP
            })
        })

        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text()
            console.error("Ollama Connect Error:", errorText, "URL:", `${OLLAMA_URL}/api/chat`)
            return NextResponse.json({
                response: `Error: Unable to connect to Ollama at ${OLLAMA_URL}. Is it running? (ollama serve). Details: ${errorText}`
            })
        }

        const data = await ollamaResponse.json()
        return NextResponse.json({ response: data.message.content })

    } catch (error) {
        console.error('AI Chat Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
