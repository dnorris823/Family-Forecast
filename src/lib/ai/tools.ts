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

    // Get user's family_id for data operations
    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
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
        .select('id, title, content, is_shared, created_at')
        .order('created_at', { ascending: false })
        .limit(args.limit || 10)

    if (args.search) {
        query = query.or(`title.ilike.%${args.search}%,content.ilike.%${args.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return { notes: data }
}

async function createNote(supabase: any, userId: string, familyId: string, args: any) {
    const { data, error } = await supabase.from('second_brain').insert({
        title: args.title,
        content: args.content,
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
