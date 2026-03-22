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

    revalidatePath('/dashboard/brain')
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

// ─── Seed / Index / AI Name helpers ─────────────────────────────────────────

/** Extract first non-heading, non-blockquote, non-table line from markdown content */
function extractFirstContentLine(content: string): string {
    for (const line of content.split('\n')) {
        const t = line.trim()
        if (t && !t.startsWith('#') && !t.startsWith('>') && !t.startsWith('|') && !t.startsWith('-')) {
            return t.slice(0, 80)
        }
    }
    return ''
}

/** Build the AI-purpose label for a known AI Memory filename */
function aiMemoryFilePurpose(title: string): string {
    const map: Record<string, string> = {
        personality: 'Identity, tone, voice, name',
        rules: 'Always/never constraints',
        behavior: 'Priorities and proactive actions',
        'user-data': 'Family profile and preferences',
    }
    return map[title] ?? title
}

/** Default template files for seeding a fresh brain */
const SEED_FILES: Array<{ title: string; folder_path: string; content: string }> = [
    // ── User Section ──────────────────────────────────────────────────────────
    {
        title: '_index',
        folder_path: '/User',
        content: `# My Notes — Index
Auto-updated when notes are added, renamed, or removed.

| Topic | File | Description |
|-------|------|-------------|
| Family | /User/Family/Members | Family member profiles and notes |
| Family | /User/Family/Traditions | Traditions, rituals, celebrations |
| Health | /User/Health/Fitness Log | Workout and activity tracking |
| Health | /User/Health/Medical | Appointments, conditions, medications |
| Finance | /User/Finance/Budget | Monthly budget overview |
| Finance | /User/Finance/Goals | Financial goals and milestones |
| Work | /User/Work/Current Role | Job responsibilities and wins |
| Hobbies | /User/Hobbies/Reading List | Book list |
| Home | /User/Home/Projects | Home improvement ideas |
| Home | /User/Home/Maintenance | Recurring maintenance reminders |`,
    },
    {
        title: 'Members',
        folder_path: '/User/Family',
        content: `# Members
Track each family member's key details here.

## Adults
-
> *Example: John, 42, works from home*

## Children
-
> *Example: Emma, 12, 7th Grade*

## Pets
-
> *Example: Max, Golden Retriever, 3 years old*`,
    },
    {
        title: 'Traditions',
        folder_path: '/User/Family',
        content: `# Traditions
Capture the recurring traditions, rituals, and celebrations that matter to your family.

## Annual
-
> *Example: Summer camping trip every July*

## Seasonal
-
> *Example: Pumpkin carving on Halloween weekend*

## Special Occasions
-
> *Example: Anniversary dinner at favorite restaurant*`,
    },
    {
        title: 'Fitness Log',
        folder_path: '/User/Health',
        content: `# Fitness Log
Track health goals, workout routines, and recent activity.

## Current Goals
-
> *Example: Run a 5K by end of summer*

## Weekly Schedule
-
> *Example: Mon/Wed/Fri — 30 min morning walk*

## Recent Activity
-
> *Example: 2026-03-01 — Yoga class, 45 min*`,
    },
    {
        title: 'Medical',
        folder_path: '/User/Health',
        content: `# Medical
Keep track of family health information in one place.

## Insurance Info
-
> *Example: Provider: BlueCross, Policy #12345*

## Medications
-
> *Example: John — Vitamin D, daily*

## Upcoming Appointments
-
> *Example: 2026-04-10 — Annual checkup, Dr. Smith*

## Medical History
-
> *Example: Emma — Allergic to penicillin*`,
    },
    {
        title: 'Budget',
        folder_path: '/User/Finance',
        content: `# Budget
Monthly budget overview — income, expenses, and savings.

## Income
-
> *Example: Salary — $5,500/mo*

## Fixed Expenses
-
> *Example: Mortgage — $1,800/mo*

## Variable Expenses
-
> *Example: Groceries — ~$600/mo*

## Savings
-
> *Example: Emergency fund — $500/mo automatic transfer*`,
    },
    {
        title: 'Goals',
        folder_path: '/User/Finance',
        content: `# Finance Goals
Financial goals organized by time horizon.

## Short-term (within 1 year)
-
> *Example: Save $2,000 for a family vacation*

## Mid-term (1–5 years)
-
> *Example: Pay off car loan by 2028*

## Long-term (5+ years)
-
> *Example: Retire mortgage-free by 2040*`,
    },
    {
        title: 'Current Role',
        folder_path: '/User/Work',
        content: `# Current Role
A snapshot of your current work situation.

## Overview
-
> *Example: Senior Engineer at Acme Corp since 2022*

## Key Responsibilities
-
> *Example: Leading the mobile team of 5 engineers*

## Goals
-
> *Example: Complete leadership training by Q3*

## Wins
-
> *Example: Shipped v2.0 launch on time — March 2026*`,
    },
    {
        title: 'Reading List',
        folder_path: '/User/Hobbies',
        content: `# Reading List
Books to read, currently reading, and finished.

## Currently Reading
-
> *Example: Atomic Habits — James Clear*

## Want to Read
-
> *Example: The Psychology of Money — Morgan Housel*

## Finished
-
> *Example: Deep Work — Cal Newport — ⭐⭐⭐⭐⭐*`,
    },
    {
        title: 'Projects',
        folder_path: '/User/Home',
        content: `# Home Projects
Home improvement ideas and active projects.

## Planned
-
> *Example: Repaint living room — beige to sage green*

## In Progress
-
> *Example: Replace kitchen faucet — waiting on parts*

## Done
-
> *Example: Installed new outdoor lighting — Feb 2026*`,
    },
    {
        title: 'Maintenance',
        folder_path: '/User/Home',
        content: `# Maintenance
Recurring home maintenance reminders by frequency.

## Monthly
-
> *Example: Replace HVAC filter*

## Quarterly
-
> *Example: Test smoke detectors*

## Annual
-
> *Example: Service HVAC system — schedule every spring*`,
    },

    // ── AI Memory Section ─────────────────────────────────────────────────────
    {
        title: '_index',
        folder_path: '/AI Memory',
        content: `# AI Memory Index
This file is injected into every chat session. Check this table before searching for memory files.

| File | Path | Purpose |
|------|------|---------|
| Personality | /AI Memory/personality | Identity, tone, voice, name |
| Rules | /AI Memory/rules | Always/never constraints |
| Behavior | /AI Memory/behavior | Priorities and proactive actions |
| User Data | /AI Memory/user-data | Family profile and preferences |`,
    },
    {
        title: 'personality',
        folder_path: '/AI Memory',
        content: `# Agent Personality
Define how the AI presents itself. The Name field below will appear in all chat panels.

## Identity
- **Name**: (e.g., Sage, Aria, Max — this name appears in all chat panels)

## Tone
-
> *Example: Warm and encouraging — like a knowledgeable friend*

## Voice
-
> *Example: Conversational, first person, light humor when appropriate*

## Example Phrases
- Greeting:
> *Example: "Good morning! Here's what's on your plate today..."*
- Delivering news:
> *Example: "Heads up — I noticed something you might want to know..."*
- Celebrating wins:
> *Example: "Nice work! You knocked that one out."*`,
    },
    {
        title: 'rules',
        folder_path: '/AI Memory',
        content: `# Agent Rules
Explicit rules the AI must always follow, regardless of other instructions.

## Always Do
-
> *Example: Ask clarifying questions before making changes to events or tasks*

## Never Do
-
> *Example: Never delete a note without explicit user confirmation*

## Privacy & Data
-
> *Example: Only reference data for family members listed in user-data*`,
    },
    {
        title: 'behavior',
        folder_path: '/AI Memory',
        content: `# Agent Behavior
Define what the AI prioritizes and when to take initiative.

## Priorities
-
> *Example: Calendar and deadlines first, then tasks, then notes*

## Proactive Actions
-
> *Example: Remind me of upcoming events in the next 24 hours when I open chat*

## Response Format
-
> *Example: Keep responses concise — bullet points preferred over long paragraphs*`,
    },
    {
        title: 'user-data',
        folder_path: '/AI Memory',
        content: `# User Data
Fill in this file to help the AI understand your family. The AI reads this at the start of every session.

## Family Profile
- **Family name**:
> *Example: The Smiths*
- **Location / Timezone**:
> *Example: Austin, TX — Central Time (UTC-6)*

## Family Members
| Name | Role | Notes |
|------|------|-------|
|      |      |       |
> *Example: John | Parent | Works from home, prefers morning reminders*

## Preferences
- **Preferred communication style**:
> *Example: Direct and concise*
- **Weekly routine highlights**:
> *Example: Soccer practice every Tuesday, family dinner every Friday*
- **Things we care most about**:
> *Example: Health, education, and quality family time*`,
    },
]

/**
 * Seed the brain with default files for a fresh user (0 notes).
 * Uses direct Supabase insert (skips embedding generation for speed).
 */
export async function seedDefaultNotes(): Promise<{ seeded: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { seeded: false, error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { seeded: false, error: 'No family' }

    const records = SEED_FILES.map(f => ({
        title: f.title,
        content: f.content,
        folder_path: f.folder_path,
        is_shared: false,
        embedding: null,
        created_by: user.id,
        family_id: profile.family_id,
    }))

    const { error } = await supabase.from('second_brain').insert(records)
    if (error) {
        console.error('Seed error:', error)
        return { seeded: false, error: error.message }
    }

    revalidatePath('/dashboard/brain')
    return { seeded: true }
}

/**
 * Rebuild /User/_index.md from all current notes under /User/.
 * Call after any create / rename / delete / move in the User section.
 */
export async function updateUserIndex(): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch all user-section notes (not the index itself)
    const { data: notes } = await supabase
        .from('second_brain')
        .select('id, title, folder_path, content')
        .eq('created_by', user.id)
        .like('folder_path', '/User/%')
        .neq('title', '_index')
        .order('folder_path')
        .order('title')

    // Build table rows
    const rows = (notes ?? []).map(n => {
        const pathParts = (n.folder_path ?? '').replace('/User', '').split('/').filter(Boolean)
        const topic = pathParts[0] ?? 'General'
        const filePath = `${n.folder_path}/${n.title ?? 'Untitled'}`
        const desc = extractFirstContentLine(n.content ?? '')
        return `| ${topic} | ${filePath} | ${desc} |`
    })

    const header = `# My Notes — Index\nAuto-updated when notes are added, renamed, or removed.`
    const tableHeader = `| Topic | File | Description |\n|-------|------|-------------|`
    const newContent = rows.length > 0
        ? `${header}\n\n${tableHeader}\n${rows.join('\n')}`
        : `${header}\n\n*No notes yet. Start by creating a note in a topic folder.*`

    // Find existing index note
    const { data: indexNote } = await supabase
        .from('second_brain')
        .select('id, is_shared')
        .eq('created_by', user.id)
        .eq('folder_path', '/User')
        .eq('title', '_index')
        .single()

    if (indexNote) {
        await supabase
            .from('second_brain')
            .update({ content: newContent })
            .eq('id', indexNote.id)
    } else {
        // Re-create if deleted
        const { data: profile } = await supabase
            .from('profiles').select('family_id').eq('id', user.id).single()
        if (profile?.family_id) {
            await supabase.from('second_brain').insert({
                title: '_index', content: newContent, folder_path: '/User',
                is_shared: false, embedding: null,
                created_by: user.id, family_id: profile.family_id,
            })
        }
    }

    revalidatePath('/dashboard/brain')
}

/**
 * Rebuild /AI Memory/_index.md from all current notes under /AI Memory/.
 * Call after any create / rename / delete in the AI Memory section.
 */
export async function updateAIMemoryIndex(): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: notes } = await supabase
        .from('second_brain')
        .select('id, title, folder_path')
        .eq('created_by', user.id)
        .eq('folder_path', '/AI Memory')
        .neq('title', '_index')
        .order('title')

    const rows = (notes ?? []).map(n => {
        const t = n.title ?? 'Untitled'
        const purpose = aiMemoryFilePurpose(t)
        return `| ${t.charAt(0).toUpperCase() + t.slice(1)} | /AI Memory/${t} | ${purpose} |`
    })

    const header = `# AI Memory Index\nThis file is injected into every chat session. Check this table before searching for memory files.`
    const tableHeader = `| File | Path | Purpose |\n|------|------|---------|`
    const newContent = rows.length > 0
        ? `${header}\n\n${tableHeader}\n${rows.join('\n')}`
        : `${header}\n\n*No memory files found. Default files can be restored from Settings.*`

    const { data: indexNote } = await supabase
        .from('second_brain')
        .select('id')
        .eq('created_by', user.id)
        .eq('folder_path', '/AI Memory')
        .eq('title', '_index')
        .single()

    if (indexNote) {
        await supabase
            .from('second_brain')
            .update({ content: newContent })
            .eq('id', indexNote.id)
    } else {
        const { data: profile } = await supabase
            .from('profiles').select('family_id').eq('id', user.id).single()
        if (profile?.family_id) {
            await supabase.from('second_brain').insert({
                title: '_index', content: newContent, folder_path: '/AI Memory',
                is_shared: false, embedding: null,
                created_by: user.id, family_id: profile.family_id,
            })
        }
    }

    revalidatePath('/dashboard/brain')
}

/**
 * Parse the AI's display name from /AI Memory/personality.
 * Returns null if not set or file doesn't exist.
 */
export async function getAIName(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('second_brain')
        .select('content')
        .eq('created_by', user.id)
        .eq('folder_path', '/AI Memory')
        .eq('title', 'personality')
        .single()

    if (!data?.content) return null

    const match = data.content.match(/\*\*Name\*\*:\s*([^\n(]+)/i)
    if (!match) return null

    const name = match[1].trim()
    // Reject placeholder values
    if (!name || name.startsWith('(') || name.startsWith('e.g')) return null
    return name
}

/**
 * Recreate any missing default brain files without overwriting existing ones.
 * Returns the number of files created.
 */
export async function resetBrainDefaults(): Promise<{ created: number; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { created: 0, error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

    if (!profile?.family_id) return { created: 0, error: 'No family' }

    // Fetch existing notes to find which defaults are present
    const { data: existing } = await supabase
        .from('second_brain')
        .select('title, folder_path')
        .eq('created_by', user.id)

    const existingSet = new Set(
        (existing ?? []).map(n => `${n.folder_path}::${n.title}`)
    )

    const missing = SEED_FILES.filter(
        f => !existingSet.has(`${f.folder_path}::${f.title}`)
    )

    if (missing.length === 0) {
        // Rebuild both indexes even if nothing is missing
        await updateUserIndex()
        await updateAIMemoryIndex()
        return { created: 0 }
    }

    const records = missing.map(f => ({
        title: f.title,
        content: f.content,
        folder_path: f.folder_path,
        is_shared: false,
        embedding: null,
        created_by: user.id,
        family_id: profile.family_id,
    }))

    const { error } = await supabase.from('second_brain').insert(records)
    if (error) return { created: 0, error: error.message }

    await updateUserIndex()
    await updateAIMemoryIndex()
    revalidatePath('/dashboard/brain')
    return { created: missing.length }
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
