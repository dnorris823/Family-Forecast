"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CheckCircle2, FileText, ChevronRight, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface DashboardData {
    events: any[]
    tasks: any[]
    notes: any[]
    totalTasks: number
    highPriorityTasks: number
}

interface AtAGlanceProps {
    data: DashboardData
}

export function AtAGlance({ data }: AtAGlanceProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Upcoming Events */}
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        Upcoming Events
                    </CardTitle>
                    <Link href="/dashboard/calendar">
                        <Badge variant="outline" className="h-6 px-1 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                            <ChevronRight className="h-4 w-4" />
                        </Badge>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.events.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4">No upcoming events</p>
                        ) : (
                            data.events.map((event) => (
                                <div key={event.id} className="flex flex-col gap-1 border-l-2 border-blue-200 pl-3 py-1">
                                    <span className="text-sm font-medium leading-none">{event.title}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(event.start_time), "MMM d, h:mm a")}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Active Tasks */}
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        Active Tasks
                    </CardTitle>
                    <Link href="/dashboard/tasks">
                        <Badge variant="outline" className="h-6 font-normal">
                            {data.totalTasks} total
                        </Badge>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.tasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4">No active tasks</p>
                        ) : (
                            data.tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between gap-2">
                                    <span className="text-sm line-clamp-1">{task.title}</span>
                                    <Badge
                                        variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'}
                                        className="text-[10px] h-5 px-1.5 capitalize"
                                    >
                                        {task.priority}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Notes */}
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" />
                        Second Brain
                    </CardTitle>
                    <Link href="/dashboard/brain">
                        <Badge variant="outline" className="h-6 px-1 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                            <ChevronRight className="h-4 w-4" />
                        </Badge>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.notes.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4">No recent notes</p>
                        ) : (
                            data.notes.map((note) => (
                                <Link
                                    key={note.id}
                                    href={`/dashboard/brain?note=${note.id}`}
                                    className="flex items-center gap-2 group"
                                >
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                                    <span className="text-sm truncate group-hover:text-amber-600 transition-colors">
                                        {note.title || 'Untitled'}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
