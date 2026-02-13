'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Note } from '@/types'

export async function getNotes() {
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

export async function createNote(formData: FormData) {
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

    const content = formData.get('content') as string
    const isShared = formData.get('is_shared') === 'on'
    const tagsString = formData.get('tags') as string
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)

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

    const { error } = await supabase.from('second_brain').insert({
        content,
        is_shared: isShared,
        tags,
        embedding,
        user_id: user.id,
        family_id: profile.family_id
    })

    if (error) {
        console.error('Error creating note:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return { success: true }
}
