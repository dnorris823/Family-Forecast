"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { getTasks, updateTaskStatus } from "./actions"
import { type Task } from "@/types"
import { cn } from "@/lib/utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { format } from "date-fns"

const priorityStyles: Record<string, string> = {
    urgent: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    high: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
    medium: "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-white/40",
    low: "bg-gray-50 text-gray-400 dark:bg-white/[0.03] dark:text-white/25",
}

const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
}

export default function TasksPage() {
    const [tasks, setTasks] = React.useState<Task[]>([])

    const fetchTasks = React.useCallback(async () => {
        const data = await getTasks()
        setTasks(data as unknown as Task[])
    }, [])

    useRealtimeSubscription('tasks', fetchTasks)

    React.useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
        await updateTaskStatus(taskId, newStatus)
    }

    return (
        <div className="flex-1 space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between pt-4">
                <div>
                    <p className="animate-fade-up font-mono-ui mb-1 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
                        Manage
                    </p>
                    <h1 className="animate-fade-up [animation-delay:0.1s] text-5xl font-bold leading-none tracking-tight text-[#111] dark:text-white/95 lg:text-6xl">
                        Tasks<span className="font-display">.</span>
                    </h1>
                </div>
                <div className="animate-fade-up [animation-delay:0.18s]">
                    <CreateTaskDialog onSuccess={fetchTasks} />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="list" className="animate-fade-up [animation-delay:0.28s] space-y-6">
                <TabsList className="h-auto rounded-full bg-[#f0f0f0] p-1.5 dark:bg-white/[0.06]">
                    <TabsTrigger
                        value="list"
                        className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                    >
                        List
                    </TabsTrigger>
                    <TabsTrigger
                        value="board"
                        className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                    >
                        Board
                    </TabsTrigger>
                </TabsList>

                {/* List view */}
                <TabsContent value="list">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111]">
                        {tasks.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="font-mono-ui text-xs text-gray-300 dark:text-white/20">
                                    No tasks yet. Create one to get started.
                                </p>
                            </div>
                        ) : (
                            tasks.map((task, i) => (
                                <div
                                    key={task.id}
                                    className={cn(
                                        "flex items-center justify-between gap-4 px-6 py-4",
                                        i < tasks.length - 1 && "border-b border-gray-100 dark:border-white/[0.04]"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                                            className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                                task.status === 'done'
                                                    ? "border-[#111] bg-[#111] dark:border-white dark:bg-white"
                                                    : "border-gray-300 hover:border-gray-500 dark:border-white/20 dark:hover:border-white/40"
                                            )}
                                        >
                                            {task.status === 'done' && (
                                                <svg className="h-2.5 w-2.5 text-white dark:text-[#111]" fill="none" viewBox="0 0 12 12">
                                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            task.status === 'done'
                                                ? "text-gray-300 line-through dark:text-white/25"
                                                : "text-[#111] dark:text-white/90"
                                        )}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        {task.due_date && (
                                            <span className="font-mono-ui text-[10px] text-gray-400 dark:text-white/30">
                                                {format(new Date(task.due_date), "MMM d")}
                                            </span>
                                        )}
                                        <span className={cn(
                                            "font-mono-ui rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider",
                                            priorityStyles[task.priority ?? ""] ?? "bg-gray-100 text-gray-400"
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Board view */}
                <TabsContent value="board">
                    <div className="grid grid-cols-3 gap-4">
                        {['todo', 'in_progress', 'done'].map((status) => (
                            <div
                                key={status}
                                className="flex flex-col gap-3 rounded-3xl bg-[#f5f5f5] p-5 dark:bg-white/[0.04]"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                        {statusLabels[status]}
                                    </span>
                                    <span className="font-mono-ui text-[10px] text-gray-300 dark:text-white/20">
                                        {tasks.filter(t => t.status === status).length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {tasks.filter(t => t.status === status).map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => {
                                                const next = status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'done' : 'todo'
                                                handleStatusChange(task.id, next)
                                            }}
                                            className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm dark:border-white/[0.06] dark:bg-[#1a1a1a] dark:hover:border-white/10"
                                        >
                                            <p className="text-sm font-medium text-[#111] dark:text-white/90">
                                                {task.title}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className={cn(
                                                    "font-mono-ui rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider",
                                                    priorityStyles[task.priority ?? ""] ?? "bg-gray-100 text-gray-400"
                                                )}>
                                                    {task.priority}
                                                </span>
                                                {task.due_date && (
                                                    <span className="font-mono-ui text-[10px] text-gray-400 dark:text-white/30">
                                                        {format(new Date(task.due_date), "MMM d")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {tasks.filter(t => t.status === status).length === 0 && (
                                        <p className="font-mono-ui py-4 text-center text-[10px] text-gray-300 dark:text-white/15">
                                            Empty
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
