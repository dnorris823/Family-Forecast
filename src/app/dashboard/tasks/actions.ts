'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { Task } from '@/types'

export async function getTasks() {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Check if profile exists and has family_id, otherwise might return empty or error
    // But RLS handles it.

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching tasks:', error)
        return []
    }

    return data
}

export async function createTask(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "User not authenticated" }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) {
        throw new Error("User hasn't joined a family yet.")
    }

    const title = formData.get('title') as string
    const priority = formData.get('priority') as string
    const dueDate = formData.get('dueDate') as string

    const { error } = await supabase.from('tasks').insert({
        title,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        status: 'todo',
        family_id: profile.family_id,
        created_by: user.id
    })

    if (error) {
        console.error('Error creating task:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/tasks')
    return { success: true }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

    if (error) {
        console.error('Error updating task:', error)
        throw error
    }

    revalidatePath('/dashboard/tasks')
}
