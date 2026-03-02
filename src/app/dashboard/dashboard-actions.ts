"use server"

import { createClient } from "@/lib/supabase/server"
import { startOfDay, endOfDay, addDays, formatISO } from "date-fns"
import { unstable_noStore as noStore } from "next/cache"

export async function getDashboardSummary() {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Not authenticated" }
    }

    // Get user's profile for family_id
    const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .single()

    if (!profile?.family_id) {
        return { error: "Profile not found" }
    }

    const today = new Date()
    const nextWeek = addDays(today, 7)

    // Parallel data fetching
    const [eventsResult, tasksResult, notesResult] = await Promise.all([
        // Upcoming events
        supabase
            .from("events")
            .select("*")
            .eq("family_id", profile.family_id)
            .gte("start_time", formatISO(startOfDay(today)))
            .lte("end_time", formatISO(endOfDay(nextWeek)))
            .order("start_time", { ascending: true })
            .limit(5),

        // Active tasks count and high priority tasks
        supabase
            .from("tasks")
            .select("*")
            .eq("family_id", profile.family_id)
            .neq("status", "done")
            .order("priority", { ascending: false }) // Urgent, High, Medium, Low
            .limit(5),

        // Recent second brain notes
        supabase
            .from("second_brain")
            .select("id, title, updated_at, is_shared")
            .eq("family_id", profile.family_id)
            .order("updated_at", { ascending: false })
            .limit(3)
    ])

    return {
        events: eventsResult.data || [],
        tasks: tasksResult.data || [],
        notes: notesResult.data || [],
        totalTasks: tasksResult.data?.length || 0,
        highPriorityTasks: tasksResult.data?.filter(t => t.priority === 'high' || t.priority === 'urgent').length || 0
    }
}
