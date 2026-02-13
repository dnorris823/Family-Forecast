// This will contain function definitions that the AI can use.
// e.g. "get_events", "add_task".
// For now, we define the interfaces.

export type Tool = {
    name: string
    description: string
    parameters: Record<string, any>
}

export const tools: Tool[] = [
    {
        name: "get_calendar_events",
        description: "Get events for a specific date range",
        parameters: {
            type: "object",
            properties: {
                start: { type: "string", description: "ISO date string" },
                end: { type: "string", description: "ISO date string" }
            },
            required: ["start", "end"]
        }
    },
    {
        name: "add_task",
        description: "Add a new task to the list",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string" },
                due_date: { type: "string" }
            },
            required: ["title"]
        }
    }
]
