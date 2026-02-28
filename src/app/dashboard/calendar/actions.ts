'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth, formatISO } from 'date-fns'

export async function getEvents(start: Date, end: Date) {
    noStore() // Opt out of static caching for this action
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`created_by.eq.${user.id},and(is_private.eq.false)`)
        // Optimization: The policy handles the actual security (view own OR family public).
        // But we need to make sure we don't fetch *too* much if policies are loose.
        // Actually, just relying on RLS is fine.
        .gte('start_time', formatISO(start))
        .lte('end_time', formatISO(end))

    if (error) {
        console.error('Error fetching events:', error)
        return []
    }

    return data
}

export async function createEvent(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error("CreateEvent Action: No user found. Cookies:", (await supabase.auth.getSession()).data.session ? "Session exists" : "No session")
        return { error: "User not authenticated" }
    }

    // Get user profile to find family_id
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) {
        // Handle case where user has no family yet. 
        // For MVP, maybe we just create a family for them or error out?
        // Let's create a default family for them if none exists? 
        // accessing 'family_groups' to insert might fail if they aren't authenticated properly or RLS issues.
        // For now, let's assume they have one or we fail.
        // Actually, let's auto-create a family if they don't have one? No, too complex for this action.
        // Throw error.
        throw new Error("User hasn't joined a family yet.")
    }

    const title = formData.get('title') as string
    const date = formData.get('date') as string // YYYY-MM-DD
    const time = formData.get('time') as string // HH:mm

    // Naive combine
    const startDateTime = new Date(`${date}T${time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // 1 hour default

    const { error } = await supabase.from('events').insert({
        title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        family_id: profile.family_id,
        created_by: user.id,
        is_private: formData.get('is_private') === 'on'
    })

    if (error) {
        console.error('Error creating event:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/calendar')
    return { success: true }
}
