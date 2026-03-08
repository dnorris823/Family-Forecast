'use server'

import { createClient } from '@/lib/supabase/server'
import { formatISO, addDays, startOfDay, endOfDay } from 'date-fns'

// Tool Execution Functions
export async function executeAITool(toolName: string, args: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'User not authenticated' }
    }

    // Get user's family_id and API keys for data operations
    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id, brave_api_key')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) {
        return { error: 'User profile not found' }
    }

    try {
        switch (toolName) {
            case 'get_events':
                return await getEvents(supabase, args)

            case 'create_event':
                return await createEvent(supabase, user.id, profile.family_id, args)

            case 'get_tasks':
                return await getTasks(supabase, args)

            case 'create_task':
                return await createTask(supabase, user.id, profile.family_id, args)

            case 'update_task_status':
                return await updateTaskStatus(supabase, args)

            case 'get_notes':
                return await getNotes(supabase, args)

            case 'create_note':
                return await createNote(supabase, user.id, profile.family_id, args)

            case 'update_note':
                return await updateNote(supabase, user.id, profile.family_id, args)

            case 'list_folders':
                return await listFolders(supabase, user.id, profile.family_id)

            case 'move_note':
                return await moveNote(supabase, user.id, args)

            case 'rename_note':
                return await renameNote(supabase, user.id, profile.family_id, args)

            case 'rename_folder':
                return await renameFolder(supabase, user.id, args)

            case 'delete_note':
                return await deleteNote(supabase, user.id, profile.family_id, args)

            case 'delete_folder':
                return await deleteFolder(supabase, user.id, profile.family_id, args)

            case 'web_search':
                return await webSearch(profile.brave_api_key, args)

            case 'image_search':
                return await imageSearch(profile.brave_api_key, args)

            case 'video_search':
                return await videoSearch(profile.brave_api_key, args)

            default:
                return { error: `Unknown tool: ${toolName}` }
        }
    } catch (error: any) {
        console.error(`Tool execution error (${toolName}):`, error)
        return { error: error.message || 'Tool execution failed' }
    }
}

// Individual tool implementations
async function getEvents(supabase: any, args: any) {
    const startDate = args.start_date ? new Date(args.start_date) : new Date()
    const endDate = args.end_date ? new Date(args.end_date) : addDays(startDate, 7)

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', formatISO(startOfDay(startDate)))
        .lte('end_time', formatISO(endOfDay(endDate)))
        .order('start_time', { ascending: true })

    if (error) throw error
    return { events: data }
}

async function createEvent(supabase: any, userId: string, familyId: string, args: any) {
    const startDateTime = new Date(`${args.date}T${args.time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    const { data, error } = await supabase.from('events').insert({
        title: args.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        family_id: familyId,
        created_by: userId,
        is_private: args.is_private || false
    }).select().single()

    if (error) throw error
    return { success: true, event: data }
}

async function getTasks(supabase: any, args: any) {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

    if (args.status && args.status !== 'all') {
        query = query.eq('status', args.status)
    } else if (!args.status) {
        // Default: show non-done tasks
        query = query.neq('status', 'done')
    }

    const { data, error } = await query
    if (error) throw error
    return { tasks: data }
}

async function createTask(supabase: any, userId: string, familyId: string, args: any) {
    const { data, error } = await supabase.from('tasks').insert({
        title: args.title,
        priority: args.priority || 'medium',
        due_date: args.due_date ? new Date(args.due_date).toISOString() : null,
        status: 'todo',
        family_id: familyId,
        created_by: userId
    }).select().single()

    if (error) throw error
    return { success: true, task: data }
}

async function updateTaskStatus(supabase: any, args: any) {
    const { data, error } = await supabase
        .from('tasks')
        .update({ status: args.status })
        .eq('id', args.task_id)
        .select()
        .single()

    if (error) throw error
    return { success: true, task: data }
}

async function getNotes(supabase: any, args: any) {
    let query = supabase
        .from('second_brain')
        .select('id, title, content, folder_path, is_shared, created_at')
        .order('created_at', { ascending: false })
        .limit(args.limit || 10)

    if (args.search) {
        query = query.or(`title.ilike.%${args.search}%,content.ilike.%${args.search}%`)
    }

    if (args.folder_path) {
        if (args.folder_path === '/') {
            query = query.or('folder_path.eq./,folder_path.is.null')
        } else {
            query = query.eq('folder_path', args.folder_path)
        }
    }

    const { data, error } = await query
    if (error) throw error
    return { notes: data }
}

async function createNote(supabase: any, userId: string, familyId: string, args: any) {
    const { data, error } = await supabase.from('second_brain').insert({
        title: args.title,
        content: args.content,
        folder_path: args.folder_path || '/',
        is_shared: args.is_shared || false,
        family_id: familyId,
        created_by: userId,
        embedding: null // Will be generated by trigger if needed
    }).select().single()

    if (error) throw error
    return { success: true, note: data }
}

async function updateNote(supabase: any, userId: string, familyId: string, args: any) {
    if (!args.note_id) return { error: 'note_id is required' }

    // Build partial update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.content !== undefined) updates.content = args.content
    if (args.is_shared !== undefined) updates.is_shared = args.is_shared

    if (Object.keys(updates).length === 0) return { error: 'No fields to update' }

    const { data, error } = await supabase
        .from('second_brain')
        .update(updates)
        .eq('id', args.note_id)
        .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)
        .select()
        .single()

    if (error) throw error
    return { success: true, note: data }
}

async function listFolders(supabase: any, userId: string, familyId: string) {
    const { data, error } = await supabase
        .from('second_brain')
        .select('folder_path')
        .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)

    if (error) throw error

    // Collect all unique folder paths and their ancestors
    const folderSet = new Set<string>(['/'])
    for (const row of data ?? []) {
        const fp = row.folder_path || '/'
        if (fp !== '/') {
            folderSet.add(fp)
            // Add intermediate ancestor paths
            const parts = fp.split('/').filter(Boolean)
            for (let i = 1; i <= parts.length; i++) {
                folderSet.add('/' + parts.slice(0, i).join('/'))
            }
        }
    }

    const folders = Array.from(folderSet).sort()
    return { folders }
}

async function moveNote(supabase: any, userId: string, args: any) {
    if (!args.note_id) return { error: 'note_id is required' }
    if (!args.folder_path) return { error: 'folder_path is required' }

    const { data, error } = await supabase
        .from('second_brain')
        .update({ folder_path: args.folder_path })
        .eq('id', args.note_id)
        .eq('created_by', userId)
        .select()
        .single()

    if (error) throw error
    return { success: true, note: data }
}

async function renameNote(supabase: any, userId: string, familyId: string, args: any) {
    if (!args.note_id) return { error: 'note_id is required' }
    if (!args.new_title) return { error: 'new_title is required' }

    const { data, error } = await supabase
        .from('second_brain')
        .update({ title: args.new_title })
        .eq('id', args.note_id)
        .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)
        .select()
        .single()

    if (error) throw error
    return { success: true, note: data }
}

async function renameFolder(supabase: any, userId: string, args: any) {
    if (!args.old_path) return { error: 'old_path is required' }
    if (!args.new_path) return { error: 'new_path is required' }

    // Fetch all creator-owned notes under the old path
    const { data: notes, error: fetchError } = await supabase
        .from('second_brain')
        .select('id, folder_path')
        .eq('created_by', userId)
        .like('folder_path', `${args.old_path}%`)

    if (fetchError) throw fetchError
    if (!notes || notes.length === 0) return { success: true, updated: 0 }

    let updated = 0
    for (const note of notes) {
        const newFolderPath = (note.folder_path as string).replace(args.old_path, args.new_path)
        const { error } = await supabase
            .from('second_brain')
            .update({ folder_path: newFolderPath })
            .eq('id', note.id)
            .eq('created_by', userId)
        if (!error) updated++
    }

    return { success: true, updated }
}

async function deleteNote(supabase: any, userId: string, familyId: string, args: any) {
    if (!args.note_id) return { error: 'note_id is required' }

    const { error } = await supabase
        .from('second_brain')
        .delete()
        .eq('id', args.note_id)
        .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)

    if (error) throw error
    return { success: true }
}

async function deleteFolder(supabase: any, userId: string, familyId: string, args: any) {
    if (!args.folder_path) return { error: 'folder_path is required' }

    const { data: notes, error: fetchError } = await supabase
        .from('second_brain')
        .select('id, title')
        .like('folder_path', `${args.folder_path}%`)
        .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)

    if (fetchError) throw fetchError
    if (!notes || notes.length === 0) return { success: true, deleted: 0 }

    let deleted = 0
    const errors: string[] = []
    for (const note of notes) {
        const { error } = await supabase
            .from('second_brain')
            .delete()
            .eq('id', note.id)
            .or(`created_by.eq.${userId},and(is_shared.eq.true,family_id.eq.${familyId})`)
        if (error) errors.push(`Failed to delete "${note.title}": ${error.message}`)
        else deleted++
    }

    return { success: true, deleted, errors }
}

async function imageSearch(apiKey: string | null, args: any) {
    if (!apiKey) {
        return { error: 'Brave Search API key not configured. Add it in Settings → Integrations → Web Search.' }
    }

    const count = Math.min(args.count || 6, 10)
    const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(args.query)}&count=${count}`

    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey
        }
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Brave Image Search error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const results = (data.results || [])
        .map((r: any) => ({
            title: r.title,
            thumbnail: r.thumbnail?.src,
            url: r.url,
            source: r.source
        }))
        .filter((r: any) => r.thumbnail)

    return { results, query: args.query }
}

async function videoSearch(apiKey: string | null, args: any) {
    if (!apiKey) {
        return { error: 'Brave Search API key not configured. Add it in Settings → Integrations → Web Search.' }
    }

    const count = Math.min(args.count || 5, 10)
    const url = `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(args.query)}&count=${count}`

    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey
        }
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Brave Video Search error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const results = (data.results || [])
        .map((r: any) => ({
            title: r.title,
            thumbnail: r.thumbnail?.src,
            url: r.url,
            source: r.source,
            description: r.description,
            age: r.age
        }))
        .filter((r: any) => r.thumbnail)

    return { results, query: args.query }
}

async function webSearch(apiKey: string | null, args: any) {
    if (!apiKey) {
        return { error: 'Brave Search API key not configured. Add it in Settings → Integrations → Web Search.' }
    }

    const count = Math.min(args.count || 5, 10)
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=${count}`

    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey
        }
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Brave Search error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const results = (data.web?.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description
    }))

    return { results, query: args.query }
}
