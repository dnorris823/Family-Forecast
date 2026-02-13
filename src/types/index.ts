
export type FamilyGroup = {
    id: string
    name: string
    created_at: string
}

export type Profile = {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    family_id: string | null
    updated_at: string | null
}

export type Event = {
    id: string
    title: string
    description: string | null
    start_time: string
    end_time: string
    is_all_day: boolean
    location: string | null
    family_id: string
    created_by: string
    is_private: boolean
    recurrence_rule: string | null
    created_at: string
}

export type Task = {
    id: string
    title: string
    description: string | null
    status: 'todo' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high' | 'urgent' | null
    due_date: string | null
    assignee_id: string | null
    family_id: string
    created_by: string
    is_private: boolean
    recurrence_rule: string | null
    created_at: string
}

export type Note = {
    id: string
    content: string
    tags: string[] | null
    is_shared: boolean
    user_id: string
    family_id: string
    created_at: string
}
