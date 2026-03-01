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
            description: 'Get recent notes, optionally filtered by search term or folder path',
            parameters: {
                type: 'object',
                properties: {
                    search: {
                        type: 'string',
                        description: 'Search term to filter notes by title or content'
                    },
                    folder_path: {
                        type: 'string',
                        description: 'Filter notes to a specific folder path, e.g. "/Projects/Work". Use "/" for root.'
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
                    folder_path: {
                        type: 'string',
                        description: 'Folder path to create the note in, e.g. "/Projects/Work". Defaults to root "/".'
                    },
                    is_shared: {
                        type: 'boolean',
                        description: 'Whether to share with family. Defaults to false.'
                    }
                },
                required: ['title', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_note',
            description: 'Update an existing note in Second Brain. Provide only the fields to change.',
            parameters: {
                type: 'object',
                properties: {
                    note_id: { type: 'string', description: 'The ID of the note to update' },
                    title: { type: 'string', description: 'New title for the note (optional)' },
                    content: { type: 'string', description: 'New markdown content for the note (optional)' },
                    is_shared: { type: 'boolean', description: 'Whether to share with family (optional)' }
                },
                required: ['note_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_folders',
            description: 'List all folder paths in Second Brain, showing the full folder hierarchy.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'move_note',
            description: 'Move a note to a different folder in Second Brain.',
            parameters: {
                type: 'object',
                properties: {
                    note_id: { type: 'string', description: 'The ID of the note to move' },
                    folder_path: {
                        type: 'string',
                        description: 'Destination folder path, e.g. "/Projects/Work". Use "/" for root.'
                    }
                },
                required: ['note_id', 'folder_path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'rename_note',
            description: 'Rename a note in Second Brain.',
            parameters: {
                type: 'object',
                properties: {
                    note_id: { type: 'string', description: 'The ID of the note to rename' },
                    new_title: { type: 'string', description: 'New title for the note' }
                },
                required: ['note_id', 'new_title']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'rename_folder',
            description: 'Rename a folder in Second Brain. All notes inside the folder are updated automatically.',
            parameters: {
                type: 'object',
                properties: {
                    old_path: {
                        type: 'string',
                        description: 'Current folder path, e.g. "/Projects/Work"'
                    },
                    new_path: {
                        type: 'string',
                        description: 'New folder path, e.g. "/Projects/Work-2025"'
                    }
                },
                required: ['old_path', 'new_path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_note',
            description: 'Delete a note from Second Brain.',
            parameters: {
                type: 'object',
                properties: {
                    note_id: { type: 'string', description: 'The ID of the note to delete' }
                },
                required: ['note_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_folder',
            description: 'Delete a folder and all notes inside it from Second Brain.',
            parameters: {
                type: 'object',
                properties: {
                    folder_path: {
                        type: 'string',
                        description: 'The folder path to delete, e.g. "/Projects/Work". All nested notes will be deleted.'
                    }
                },
                required: ['folder_path']
            }
        }
    }
]
