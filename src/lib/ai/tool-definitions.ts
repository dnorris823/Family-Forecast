// Tool Definitions for Ollama (no 'use server' - just data)
export const AI_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_events',
            description: 'Get calendar events for a date range. Defaults to next 7 days if no dates provided.',
            parameters: {
                type: 'object',
                properties: {
                    start_date: {
                        type: 'string',
                        description: 'Start date in YYYY-MM-DD format. Defaults to today.'
                    },
                    end_date: {
                        type: 'string',
                        description: 'End date in YYYY-MM-DD format. Defaults to 7 days from start.'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_event',
            description: 'Create a new calendar event',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Event title' },
                    date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
                    time: { type: 'string', description: 'Start time in HH:mm format (24-hour)' },
                    is_private: { type: 'boolean', description: 'Whether event is private. Defaults to false.' }
                },
                required: ['title', 'date', 'time']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_tasks',
            description: 'Get tasks, optionally filtered by status',
            parameters: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['todo', 'in_progress', 'done', 'all'],
                        description: 'Filter by status. Defaults to showing non-done tasks.'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_task',
            description: 'Create a new task',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Task title' },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'Task priority. Defaults to medium.'
                    },
                    due_date: {
                        type: 'string',
                        description: 'Due date in YYYY-MM-DD format (optional)'
                    }
                },
                required: ['title']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_task_status',
            description: 'Update the status of a task',
            parameters: {
                type: 'object',
                properties: {
                    task_id: { type: 'string', description: 'Task ID' },
                    status: {
                        type: 'string',
                        enum: ['todo', 'in_progress', 'done'],
                        description: 'New status'
                    }
                },
                required: ['task_id', 'status']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_notes',
            description: 'Get recent notes, optionally search by content',
            parameters: {
                type: 'object',
                properties: {
                    search: {
                        type: 'string',
                        description: 'Search term to filter notes by title or content'
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of notes to return. Defaults to 10.'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_note',
            description: 'Create a new note in Second Brain',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Note title' },
                    content: { type: 'string', description: 'Note content in markdown' },
                    is_shared: {
                        type: 'boolean',
                        description: 'Whether to share with family. Defaults to false.'
                    }
                },
                required: ['title', 'content']
            }
        }
    }
]
