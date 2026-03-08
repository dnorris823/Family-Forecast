'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { type Message } from '@/lib/ai/client'

export interface ChatSession {
    id: string
    title: string
    messages: Message[]
    model: string | null
    created_at: string
    updated_at: string
}

// ── Model preference ──────────────────────────────────────────────────────────

export async function getAIModel(): Promise<string | null> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('profiles')
        .select('ai_model')
        .eq('id', user.id)
        .single()

    return data?.ai_model ?? null
}

export async function saveAIModel(model: string): Promise<{ error?: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('profiles')
        .update({ ai_model: model })
        .eq('id', user.id)

    if (error) return { error: error.message }
    return {}
}

// ── AI generation options ─────────────────────────────────────────────────────

export interface AIOptions {
    temperature: number
    num_ctx: number | null
}

export async function getAIOptions(): Promise<AIOptions> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { temperature: 0.7, num_ctx: null }

    const { data } = await supabase
        .from('profiles')
        .select('ai_temperature, ai_num_ctx')
        .eq('id', user.id)
        .single()

    return {
        temperature: data?.ai_temperature ?? 0.7,
        num_ctx: data?.ai_num_ctx ?? null,
    }
}

export async function saveAIOptions(temperature: number, num_ctx: number | null): Promise<{ error?: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('profiles')
        .update({ ai_temperature: temperature, ai_num_ctx: num_ctx ?? null })
        .eq('id', user.id)

    if (error) return { error: error.message }
    return {}
}

// ── Brave Search API key ──────────────────────────────────────────────────────

export async function getBraveApiKey(): Promise<string | null> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('profiles')
        .select('brave_api_key')
        .eq('id', user.id)
        .single()

    return data?.brave_api_key ?? null
}

export async function saveBraveApiKey(key: string): Promise<{ error?: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('profiles')
        .update({ brave_api_key: key || null })
        .eq('id', user.id)

    if (error) return { error: error.message }
    return {}
}

// ── Chat sessions ─────────────────────────────────────────────────────────────

export async function getChatSessions(): Promise<ChatSession[]> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, messages, model, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching chat sessions:', error)
        return []
    }

    return data as ChatSession[]
}

export async function createChatSession(
    title: string,
    messages: Message[],
    model: string
): Promise<{ id: string } | { error: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
            user_id: user.id,
            title: title.slice(0, 100),
            messages,
            model,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating chat session:', error)
        return { error: error.message }
    }

    return { id: data.id }
}

export async function updateChatSession(
    id: string,
    messages: Message[],
    model?: string
): Promise<{ error?: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const update: Record<string, unknown> = {
        messages,
        updated_at: new Date().toISOString(),
    }
    if (model !== undefined) update.model = model

    const { error } = await supabase
        .from('chat_sessions')
        .update(update)
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return {}
}

export async function deleteChatSession(id: string): Promise<{ error?: string }> {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return {}
}
