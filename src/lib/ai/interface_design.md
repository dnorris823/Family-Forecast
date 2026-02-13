# AI / Ollama Interface Design

## Overview
The application connects to a local Ollama instance running on the Home Server (e.g., `http://localhost:11434` relative to the server, or a LAN IP). Since browsers cannot directly access HTTP endpoints without CORS issues (and mixed content issues if deployed on HTTPS), we will use Next.js API Routes as a proxy.

## 1. API API Routes

### `GET /api/ai/models`
- **Purpose**: Fetch available models from Ollama to populate the settings dropdown.
- **Upstream**: `GET <OLLAMA_HOST>/api/tags`
- **Response**: JSON list of model names (e.g., `['llama3', 'mistral', 'gemma']`).

### `POST /api/ai/chat`
- **Purpose**: Main chat endpoint. Receives user message and conversation history.
- **Upstream**: `POST <OLLAMA_HOST>/api/chat`
- **Logic**:
    1. Retrieve relevant context from `second_brain` using vector search (Supabase).
    2. Retrieve relevant context from `events` and `tasks` (based on query time range).
    3. Construct a system prompt with this context.
    4. Stream the response back to the client.

## 2. Tool Definitions (Function Calling)
We will implement a "Tools" layer. Even if the local model doesn't support native function calling perfectly, we can prompt it to output strict JSON or specific tokens to trigger actions.

### Supported Tools
1.  **`query_calendar(start_date, end_date)`**
    *   *Description*: Get events for a specific range.
    *   *Source*: Supabase `events` table.
2.  **`query_tasks(status, assignee)`**
    *   *Description*: Get tasks, optionally filtered.
    *   *Source*: Supabase `tasks` table.
3.  **`add_task(title, due_date, assignee)`**
    *   *Description*: Create a new task.
    *   *Source*: Supabase `tasks` table.
4.  **`create_event(title, start, end)`**
    *   *Description*: Schedule something on the calendar.
    *   *Source*: Supabase `events` table.
5.  **`search_brain(query)`**
    *   *Description*: Semantic search on the Second Brain.
    *   *Source*: Supabase `second_brain` table (vector search).

## 3. Data Flow
1.  **User**: "What's on my schedule this weekend?"
2.  **Next.js API**:
    *   Identifies intent (calendar query).
    *   Fetches events for upcoming weekend from Supabase.
    *   Constructs prompt: "User asked about schedule. Here is the data: [List of Events]. Summarize it."
3.  **Ollama**: Generates natural language summary.
4.  **UI**: Displays streaming response.

## 4. Configuration
- `OLLAMA_BASE_URL`: Environment variable (e.g., `http://192.168.1.100:11434`).
- `OLLAMA_MODEL`: Default model, but overridable per user.
