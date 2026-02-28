"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ListTodo, KanbanSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { getTasks, updateTaskStatus } from "./actions"
import { type Task } from "@/types"
import { cn } from "@/lib/utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

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
        // Optimistic updatte
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
        await updateTaskStatus(taskId, newStatus)
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                <CreateTaskDialog onSuccess={fetchTasks} />
            </div>

            <Tabs defaultValue="list" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4" /> List
                        </TabsTrigger>
                        <TabsTrigger value="board" className="flex items-center gap-2">
                            <KanbanSquare className="h-4 w-4" /> Board
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {tasks.length === 0 && <p className="text-muted-foreground text-sm">No tasks yet.</p>}
                                {tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-4 w-4 rounded border",
                                                task.status === 'done' ? "bg-primary border-primary" : "border-muted-foreground"
                                            )}
                                                onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                                            />
                                            <span className={cn("font-medium", task.status === 'done' && "line-through text-muted-foreground")}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {task.priority !== 'medium' && <span className="uppercase mr-2 font-bold">{task.priority}</span>}
                                            {task.due_date && new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="board" className="h-[600px]">
                    <div className="grid grid-cols-3 gap-4 h-full">
                        {['todo', 'in_progress', 'done'].map(status => (
                            <div key={status} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-3">
                                <h3 className="font-semibold text-sm uppercase text-muted-foreground">{status.replace('_', ' ')}</h3>
                                {tasks.filter(t => t.status === status).map(task => (
                                    <div key={task.id} className="bg-background p-3 rounded shadow-sm border text-sm font-medium cursor-pointer hover:border-primary transition-colors"
                                        onClick={() => {
                                            const nextStatus = status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'done' : 'todo'
                                            handleStatusChange(task.id, nextStatus)
                                        }}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    )
}
