import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
            method: 'GET',
        })

        if (!response.ok) {
            console.error('Failed to fetch Ollama models')
            return NextResponse.json({ models: [] })
        }

        const data = await response.json()

        // Return simplified model list
        const models = data.models?.map((m: any) => ({
            name: m.name,
            size: m.size,
            modified_at: m.modified_at
        })) || []

        return NextResponse.json({ models })
    } catch (error) {
        console.error('Error fetching Ollama models:', error)
        return NextResponse.json({ models: [] })
    }
}
