import { NextResponse } from 'next/server'
import { AI_TOOLS } from '@/lib/ai/tool-definitions'
import { executeAITool } from '@/lib/ai/tools'
import { createClient } from '@/lib/supabase/server'
import { formatISO, addDays, startOfDay } from 'date-fns'

export async function POST(req: Request) {
    try {
        const { messages, model } = await req.json()

        // 1. Get fresh context from database
        const context = await getFreshContext()
        if (!context) {
            return NextResponse.json({
                response: 'Error: Unable to authenticate. Please log in.'
            })
        }

        // 2. Construct system prompt with tools
        const systemPrompt = `You are a helpful Family AI Assistant with access to the family calendar, tasks, and notes.

Current Context:
${context}

You have access to tools to read and modify data. Always fetch fresh data before answering questions about current state.
When creating items, confirm the action was successful.
Respect user privacy - only access data the user is allowed to see.`

        // 3. Call Ollama with tools
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        const selectedModel = model || 'llama3.1' // Use provided model or default

        let conversationMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ]

        // Tool calling loop (max 5 iterations to prevent infinite loops)
        let iterations = 0
        const MAX_ITERATIONS = 5

        while (iterations < MAX_ITERATIONS) {
            iterations++

            const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: conversationMessages,
                    tools: AI_TOOLS,
                    stream: false
                })
            })

            if (!ollamaResponse.ok) {
                const errorText = await ollamaResponse.text()
                console.error("Ollama Error:", errorText)
                return NextResponse.json({
                    response: `Error: Unable to connect to Ollama. Details: ${errorText}`
                })
            }

            const data = await ollamaResponse.json()
            const assistantMessage = data.message

            // Add assistant's response to conversation
            conversationMessages.push(assistantMessage)

            // Check if assistant wants to call tools
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Execute each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                    const toolName = toolCall.function.name
                    const toolArgs = toolCall.function.arguments

                    console.log(`[AI] Calling tool: ${toolName}`, toolArgs)

                    const toolResult = await executeAITool(toolName, toolArgs)

                    // Add tool result to conversation
                    conversationMessages.push({
                        role: 'tool',
                        content: JSON.stringify(toolResult)
                    })
                }

                // Continue loop to let AI process tool results
                continue
            }

            // No more tool calls, return final response
            return NextResponse.json({ response: assistantMessage.content })
        }

        // Max iterations reached
        return NextResponse.json({
            response: "I apologize, but I'm having trouble completing that request. Please try rephrasing or breaking it into smaller steps."
        })

    } catch (error) {
        console.error('AI Chat Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Fetch fresh context from database
async function getFreshContext(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Get upcoming events (next 7 days)
    const startDate = startOfDay(new Date())
    const endDate = addDays(startDate, 7)

    const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', formatISO(startDate))
        .lte('start_time', formatISO(endDate))
        .order('start_time', { ascending: true })
        .limit(10)

    // Get active tasks
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(10)

    // Get recent notes
    const { data: notes } = await supabase
        .from('second_brain')
        .select('id, title, is_shared, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    // Format context
    const now = new Date()
    let contextStr = `Current Time: ${now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })}\n\n`

    contextStr += `User: ${profile?.email || 'Unknown'}\n\n`

    if (events && events.length > 0) {
        contextStr += `Upcoming Events:\n`
        events.forEach(e => {
            const start = new Date(e.start_time)
            contextStr += `- ${e.title} (${start.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })})\n`
        })
        contextStr += '\n'
    }

    if (tasks && tasks.length > 0) {
        contextStr += `Active Tasks:\n`
        tasks.forEach(t => {
            const priority = t.priority !== 'medium' ? `[${t.priority.toUpperCase()}] ` : ''
            const due = t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleDateString()})` : ''
            contextStr += `- ${priority}${t.title}${due}\n`
        })
        contextStr += '\n'
    }

    if (notes && notes.length > 0) {
        contextStr += `Recent Notes:\n`
        notes.forEach(n => {
            const shared = n.is_shared ? ' (shared)' : ' (private)'
            contextStr += `- "${n.title}"${shared}\n`
        })
    }

    return contextStr
}

