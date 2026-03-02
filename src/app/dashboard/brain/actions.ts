'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { Note } from '@/types'

export async function getNotes() {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return []

    const { data, error } = await supabase
        .from('second_brain')
        .select('*')
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching notes:', error)
        return []
    }

    return data
}

// Fix updateNote access control: allow shared-note edits by family members (T014)
export async function updateNote(
    noteId: string,
    title: string,
    content: string,
    isShared: boolean
) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) {
        return { error: 'User profile not found' }
    }

    const { data, error } = await supabase
        .from('second_brain')
        .update({ title, content, is_shared: isShared })
        .eq('id', noteId)
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)
        .select()
        .single()

    if (error) {
        console.error('Error updating note:', error)
        return { error: error.message }
    }

    return { success: true, data }
}

// T007 — Delete a note (own or shared family note)
export async function deleteNote(noteId: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { error: 'User profile not found' }

    const { error } = await supabase
        .from('second_brain')
        .delete()
        .eq('id', noteId)
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)

    if (error) {
        console.error('Error deleting note:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return { success: true }
}

// T008 — Rename a note title (own or shared family note)
export async function renameNote(noteId: string, newTitle: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { error: 'User profile not found' }

    const { data, error } = await supabase
        .from('second_brain')
        .update({ title: newTitle })
        .eq('id', noteId)
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)
        .select()
        .single()

    if (error) {
        console.error('Error renaming note:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return { success: true, data }
}

// T009 — Move a note to a different folder (creator-only)
export async function moveNote(noteId: string, newFolderPath: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { data, error } = await supabase
        .from('second_brain')
        .update({ folder_path: newFolderPath })
        .eq('id', noteId)
        .eq('created_by', user.id)
        .select()
        .single()

    if (error) {
        console.error('Error moving note:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return { success: true, data }
}

// T010 — Rename a folder (bulk-update folder_path prefix, creator-owned notes only)
export async function renameFolder(oldPath: string, newPath: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    // Fetch all creator-owned notes under the old path
    const { data: notes, error: fetchError } = await supabase
        .from('second_brain')
        .select('id, folder_path')
        .eq('created_by', user.id)
        .like('folder_path', `${oldPath}%`)

    if (fetchError) {
        console.error('Error fetching notes for folder rename:', fetchError)
        return { error: fetchError.message }
    }

    if (!notes || notes.length === 0) return { success: true, updated: 0 }

    // Bulk update each note's folder_path
    const updates = notes.map(note => ({
        id: note.id,
        folder_path: note.folder_path.replace(oldPath, newPath)
    }))

    let updated = 0
    for (const update of updates) {
        const { error } = await supabase
            .from('second_brain')
            .update({ folder_path: update.folder_path })
            .eq('id', update.id)
            .eq('created_by', user.id)

        if (!error) updated++
    }

    revalidatePath('/dashboard/brain')
    return { success: true, updated }
}

// T011 — Delete a folder and all notes inside it (access control per note)
export async function deleteFolder(folderPath: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { error: 'User profile not found' }

    // Fetch all notes under the folder path
    const { data: notes, error: fetchError } = await supabase
        .from('second_brain')
        .select('id, title')
        .like('folder_path', `${folderPath}%`)
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)

    if (fetchError) {
        console.error('Error fetching notes for folder delete:', fetchError)
        return { error: fetchError.message }
    }

    if (!notes || notes.length === 0) return { success: true, deleted: 0, errors: [] }

    let deleted = 0
    const errors: string[] = []

    for (const note of notes) {
        const { error } = await supabase
            .from('second_brain')
            .delete()
            .eq('id', note.id)
            .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)

        if (error) {
            errors.push(`Failed to delete "${note.title}": ${error.message}`)
        } else {
            deleted++
        }
    }

    revalidatePath('/dashboard/brain')
    return { success: true, deleted, errors }
}

// T012 — Export a single note (read-only, returns title/content/folderPath)
export async function exportNote(noteId: string) {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { error: 'User profile not found' }

    const { data, error } = await supabase
        .from('second_brain')
        .select('id, title, content, folder_path')
        .eq('id', noteId)
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)
        .single()

    if (error || !data) {
        return { error: error?.message || 'Note not found' }
    }

    return { title: data.title || 'Untitled', content: data.content, folderPath: data.folder_path }
}

// T013 — Export all notes visible to this user
export async function exportAllNotes(): Promise<Note[]> {
    noStore()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return []

    const { data, error } = await supabase
        .from('second_brain')
        .select('*')
        .or(`created_by.eq.${user.id},and(is_shared.eq.true,family_id.eq.${profile.family_id})`)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error exporting all notes:', error)
        return []
    }

    return data as Note[]
}

async function generateEmbedding(text: string): Promise<number[]> {
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = 'nomic-embed-text'

    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt: text })
        })

        if (!response.ok) {
            throw new Error(`Ollama Embedding Error: ${await response.text()}`)
        }

        const data = await response.json()
        return data.embedding
    } catch (e) {
        console.error("Failed to generate embedding", e)
        return []
    }
}

export async function createNote(
    title: string,
    content: string,
    folderPath: string = '/',
    isShared: boolean = false
) {
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

    let embedding = null
    try {
        const vector = await generateEmbedding(content)
        if (vector.length > 0) {
            embedding = vector
        }
    } catch {
        console.warn("Skipping embedding generation")
    }

    const { data, error } = await supabase.from('second_brain').insert({
        title,
        content,
        folder_path: folderPath,
        is_shared: isShared,
        embedding,
        created_by: user.id,
        family_id: profile.family_id
    }).select().single()

    if (error) {
        console.error('Error creating note:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return data
}
