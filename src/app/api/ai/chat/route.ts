import { NextResponse } from 'next/server'
import { AI_TOOLS } from '@/lib/ai/tool-definitions'
import { executeAITool } from '@/lib/ai/tools'
import { getAIOptions } from '@/app/dashboard/ai/actions'
import { createClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

export async function POST(req: Request) {
    try {
        const { messages, model, activeNoteId } = await req.json()

        // 1. Get fresh context from database
        const context = await getFreshContext(activeNoteId)
        if (!context) {
            return NextResponse.json({
                response: 'Error: Unable to authenticate. Please log in.'
            })
        }

        // 2. Build AI Memory context (personality → rules → behavior → user-data → index)
        const aiMemoryContext = await getAIMemoryContext()

        // 3. Construct system prompt
        const systemPrompt = `You are a helpful Family AI Assistant with access to the family calendar, tasks, and notes.

Current Context:
${context}

You have access to tools to read and modify data. Always fetch fresh data before answering questions about current state.
When creating or updating items, confirm the action was successful.
Respect user privacy - only access data the user is allowed to see.

When you receive image_search results, output them as a fenced code block with language "image-results" containing ONLY the JSON results array. Example:
\`\`\`image-results
[{"title":"Example","thumbnail":"https://...","url":"https://...","source":"example.com"}]
\`\`\`
When you receive video_search results, do the same with language "video-results":
\`\`\`video-results
[{"title":"Example","thumbnail":"https://...","url":"https://...","source":"youtube.com","description":"...","age":"..."}]
\`\`\`
Always include a brief text line before the code block describing what you found.${aiMemoryContext ? `\n\n## Persistent AI Memory\n${aiMemoryContext}` : ''}`

        // 4. Call Ollama with tools
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        const selectedModel = model || 'kimi-k2.5:cloud'
        const aiOptions = await getAIOptions()
        const ollamaOptions = {
            temperature: aiOptions.temperature,
            ...(aiOptions.num_ctx ? { num_ctx: aiOptions.num_ctx } : {})
        }

        const conversationMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ]

        // Tool calling loop (max 5 iterations, stream: false for tool resolution)
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
                    options: ollamaOptions,
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

            conversationMessages.push(assistantMessage)

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                for (const toolCall of assistantMessage.tool_calls) {
                    const toolName = toolCall.function.name
                    const toolArgs = toolCall.function.arguments

                    console.log(`[AI] Calling tool: ${toolName}`, toolArgs)

                    const toolResult = await executeAITool(toolName, toolArgs)

                    conversationMessages.push({
                        role: 'tool',
                        content: JSON.stringify(toolResult)
                    })
                }
                continue
            }

            // No more tool calls — stream the final response
            const finalContent = assistantMessage.content as string

            // Attempt streaming final response via Ollama stream: true
            try {
                const streamResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: conversationMessages,
                        options: ollamaOptions,
                        stream: true
                    })
                })

                if (!streamResponse.ok || !streamResponse.body) {
                    // Fallback: return the already-received content as JSON
                    return NextResponse.json({ response: finalContent })
                }

                const reader = streamResponse.body.getReader()
                const decoder = new TextDecoder()

                const readableStream = new ReadableStream({
                    async start(controller) {
                        try {
                            while (true) {
                                const { done, value } = await reader.read()
                                if (done) break

                                const text = decoder.decode(value, { stream: true })
                                // Ollama NDJSON: each line is a JSON object
                                const lines = text.split('\n').filter(Boolean)
                                for (const line of lines) {
                                    try {
                                        const parsed = JSON.parse(line)
                                        const chunk = parsed?.message?.content
                                        if (chunk) {
                                            controller.enqueue(new TextEncoder().encode(chunk))
                                        }
                                    } catch {
                                        // skip malformed line
                                    }
                                }
                            }
                        } finally {
                            controller.close()
                        }
                    }
                })

                return new Response(readableStream, {
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                })
            } catch {
                // Streaming unavailable — return JSON fallback
                return NextResponse.json({ response: finalContent })
            }
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

/**
 * Fetch all AI Memory files for the current user and format them for the system prompt.
 * Injection order: personality → rules → behavior → user-data → _index
 */
async function getAIMemoryContext(): Promise<string> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''

    const ORDERED_TITLES = ['personality', 'rules', 'behavior', 'user-data', '_index']

    const { data: files } = await supabase
        .from('second_brain')
        .select('title, content')
        .eq('created_by', user.id)
        .eq('folder_path', '/AI Memory')

    if (!files || files.length === 0) return ''

    const fileMap = new Map(files.map(f => [f.title, f.content]))

    const sections: string[] = []
    for (const title of ORDERED_TITLES) {
        const content = fileMap.get(title)
        if (content) {
            const label = title === '_index' ? 'Memory Index' : title.charAt(0).toUpperCase() + title.slice(1)
            sections.push(`### ${label}\n${content}`)
        }
    }

    return sections.join('\n\n')
}

// Fetch fresh, privacy-filtered context from database (T033-T034)
async function getFreshContext(activeNoteId?: string): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return null

    const userId = user.id
    const familyId = profile.family_id

    // Family members with emails (for send_email tool)
    const { data: familyMembers } = await supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('family_id', familyId)
        .not('email', 'is', null)

    // Privacy filter: own items always included; other family members' items only if not private
    const privacyFilter = `created_by.eq.${userId},and(is_private.eq.false,family_id.eq.${familyId})`

    // Events: all dates, privacy-filtered
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .or(privacyFilter)
        .order('start_time', { ascending: true })

    // Tasks: all statuses, privacy-filtered
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(privacyFilter)
        .order('created_at', { ascending: false })

    // Notes: full content, current user only (FR-015: own notes only in AI context)
    const { data: notes } = await supabase
        .from('second_brain')
        .select('id, title, content, folder_path, is_shared, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

    // Active note: fetch separately and prepend
    let activeNoteContext = ''
    if (activeNoteId) {
        const { data: activeNote } = await supabase
            .from('second_brain')
            .select('id, title, content')
            .eq('id', activeNoteId)
            .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)
            .single()

        if (activeNote) {
            activeNoteContext = `Currently open note:\nTitle: ${activeNote.title || 'Untitled'}\nContent:\n${activeNote.content}\n\n`
        }
    }

    // Format context string
    const now = new Date()
    let contextStr = activeNoteContext

    contextStr += `Current Time: ${now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })}\n\n`

    contextStr += `User: ${profile?.email || 'Unknown'}\n\n`

    if (familyMembers && familyMembers.length > 0) {
        contextStr += `Family Members (use these emails with send_email tool):\n`
        familyMembers.forEach(m => {
            const name = m.full_name || m.username || 'Unknown'
            contextStr += `- ${name}: ${m.email}\n`
        })
        contextStr += '\n'
    }

    if (events && events.length > 0) {
        contextStr += `Calendar Events:\n`
        events.forEach(e => {
            const start = new Date(e.start_time)
            const privacy = e.is_private ? ' [private]' : ''
            contextStr += `- ${e.title} (${start.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })})${privacy}\n`
        })
        contextStr += '\n'
    }

    if (tasks && tasks.length > 0) {
        contextStr += `Tasks:\n`
        tasks.forEach(t => {
            const priority = t.priority && t.priority !== 'medium' ? `[${t.priority.toUpperCase()}] ` : ''
            const status = t.status !== 'todo' ? ` (${t.status.replace('_', ' ')})` : ''
            const due = t.due_date ? ` | Due: ${new Date(t.due_date).toLocaleDateString()}` : ''
            contextStr += `- ${priority}${t.title}${status}${due}\n`
        })
        contextStr += '\n'
    }

    if (notes && notes.length > 0) {
        contextStr += `Your Notes:\n`
        notes.forEach(n => {
            const folder = n.folder_path && n.folder_path !== '/' ? ` [${n.folder_path}]` : ''
            contextStr += `- "${n.title || 'Untitled'}"${folder}: ${n.content}\n\n`
        })
    }

    // Token overflow truncation: if context > 6000 chars, drop far-future events then note content
    if (contextStr.length > 6000) {
        const thirtyDaysOut = addDays(now, 30)

        // Rebuild with far-future events dropped
        let trimmedContextStr = activeNoteContext
        trimmedContextStr += `Current Time: ${now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })}\n\n`
        trimmedContextStr += `User: ${profile?.email || 'Unknown'}\n\n`

        if (familyMembers && familyMembers.length > 0) {
            trimmedContextStr += `Family Members (use these emails with send_email tool):\n`
            familyMembers.forEach(m => {
                const name = m.full_name || m.username || 'Unknown'
                trimmedContextStr += `- ${name}: ${m.email}\n`
            })
            trimmedContextStr += '\n'
        }

        if (events && events.length > 0) {
            const nearEvents = events.filter(e => new Date(e.start_time) <= thirtyDaysOut)
            if (nearEvents.length > 0) {
                trimmedContextStr += `Calendar Events (next 30 days):\n`
                nearEvents.forEach(e => {
                    const start = new Date(e.start_time)
                    trimmedContextStr += `- ${e.title} (${start.toLocaleDateString()})\n`
                })
                trimmedContextStr += '\n'
            }
        }

        if (tasks && tasks.length > 0) {
            trimmedContextStr += `Tasks:\n`
            tasks.forEach(t => {
                const priority = t.priority && t.priority !== 'medium' ? `[${t.priority.toUpperCase()}] ` : ''
                trimmedContextStr += `- ${priority}${t.title} (${t.status})\n`
            })
            trimmedContextStr += '\n'
        }

        // If still over limit, include only note titles
        if (trimmedContextStr.length > 6000) {
            if (notes && notes.length > 0) {
                trimmedContextStr += `Your Notes (titles only):\n`
                notes.forEach(n => {
                    trimmedContextStr += `- "${n.title || 'Untitled'}"\n`
                })
            }
        } else {
            // Include recent notes with content (up to 10)
            const recentNotes = notes?.slice(0, 10) || []
            if (recentNotes.length > 0) {
                trimmedContextStr += `Your Notes:\n`
                recentNotes.forEach(n => {
                    trimmedContextStr += `- "${n.title || 'Untitled'}": ${n.content}\n\n`
                })
            }
        }

        return trimmedContextStr
    }

    return contextStr
}
