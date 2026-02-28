'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { Note } from '@/types'

export async function getNotes() {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('second_brain')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching notes:', error)
        return []
    }

    return data
}

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

    const { data, error } = await supabase
        .from('second_brain')
        .update({
            title,
            content,
            is_shared: isShared
        })
        .eq('id', noteId)
        .eq('created_by', user.id) // Ensure user owns the note
        .select()
        .single()

    if (error) {
        console.error('Error updating note:', error)
        return { error: error.message }
    }

    return { success: true, data }
}


async function generateEmbedding(text: string): Promise<number[]> {
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = 'nomic-embed-text' // Standard embedding model, user needs to pull this

    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: text
            })
        })

        if (!response.ok) {
            throw new Error(`Ollama Embedding Error: ${await response.text()}`)
        }

        const data = await response.json()
        return data.embedding
    } catch (e) {
        console.error("Failed to generate embedding", e)
        // Return empty array or throw? 
        // If we fail to embed, search won't work.
        // For MVP, allow note creation without embedding but warn.
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

    // Generate Embedding
    let embedding = null
    try {
        const vector = await generateEmbedding(content)
        if (vector.length > 0) {
            embedding = vector
        }
    } catch (e) {
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
