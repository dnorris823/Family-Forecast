"use client"

import * as React from "react"
import { CalendarDays, CheckCircle2, FileText, ArrowUpRight, Clock } from "lucide-react"
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

const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-gray-100 text-gray-600",
    low: "bg-gray-50 text-gray-400",
}

export function AtAGlance({ data }: AtAGlanceProps) {
    return (
        <div className="space-y-4">
            {/* ── Stats bar ────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:divide-white/[0.06] dark:bg-white/[0.03]">
                <div className="px-8 py-7 text-center">
                    <div className="flex items-start justify-center">
                        <sup className="mt-2 text-xl font-bold text-gray-400">+</sup>
                        <span className="text-6xl font-bold tracking-tight text-[#111] dark:text-white/90">
                            {data.events.length}
                        </span>
                    </div>
                    <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-widest text-gray-400">
                        Upcoming Events
                    </p>
                </div>
                <div className="px-8 py-7 text-center">
                    <div className="flex items-start justify-center">
                        <sup className="mt-2 text-xl font-bold text-gray-400">+</sup>
                        <span className="text-6xl font-bold tracking-tight text-[#111] dark:text-white/90">
                            {data.totalTasks}
                        </span>
                    </div>
                    <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-widest text-gray-400">
                        Active Tasks
                    </p>
                </div>
                <div className="px-8 py-7 text-center">
                    <div className="flex items-start justify-center">
                        <sup className="mt-2 text-xl font-bold text-gray-400">+</sup>
                        <span className="text-6xl font-bold tracking-tight text-[#111] dark:text-white/90">
                            {data.notes.length}
                        </span>
                    </div>
                    <p className="font-mono-ui mt-2 text-[10px] uppercase tracking-widest text-gray-400">
                        Brain Notes
                    </p>
                </div>
            </div>

            {/* ── Bento grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-3 grid-rows-2 gap-4">

                {/* Events — dark card, spans 2 cols × 2 rows */}
                <div className="awakee-card col-span-2 row-span-2 flex flex-col rounded-3xl bg-[#111] p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-white/50" />
                            <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-white/40">
                                Upcoming Events
                            </span>
                        </div>
                        <Link
                            href="/dashboard/calendar"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/50 transition-colors hover:border-white/60 hover:text-white"
                        >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="mt-6 flex-1 space-y-0">
                        {data.events.length === 0 ? (
                            <p className="font-mono-ui py-4 text-sm italic text-white/30">
                                No upcoming events
                            </p>
                        ) : (
                            data.events.map((event, i) => (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "flex items-start justify-between py-4",
                                        i < data.events.length - 1 && "border-b border-white/[0.08]"
                                    )}
                                >
                                    <span className="text-base font-medium text-white/90">
                                        {event.title}
                                    </span>
                                    <div className="font-mono-ui ml-4 flex shrink-0 items-center gap-1.5 text-[11px] text-white/30">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(event.start_time), "MMM d, h:mm a")}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {data.highPriorityTasks > 0 && (
                        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3">
                            <span className="h-2 w-2 rounded-full bg-orange-400" />
                            <span className="text-sm text-white/60">
                                {data.highPriorityTasks} high-priority task{data.highPriorityTasks !== 1 ? "s" : ""} need attention
                            </span>
                        </div>
                    )}
                </div>

                {/* Tasks — yellow card */}
                <div className="awakee-card flex flex-col rounded-3xl bg-[#f5e641] p-6">
                    <div className="flex items-center justify-between">
                        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-black/40">
                            Active Tasks
                        </span>
                        <Link href="/dashboard/tasks">
                            <CheckCircle2 className="h-4 w-4 text-black/30 transition-colors hover:text-black/70" />
                        </Link>
                    </div>
                    <div className="mt-4 flex-1 space-y-2">
                        {data.tasks.length === 0 ? (
                            <p className="text-sm italic text-black/40">All clear!</p>
                        ) : (
                            data.tasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center justify-between gap-2">
                                    <span className="line-clamp-1 text-sm font-medium text-[#111]">
                                        {task.title}
                                    </span>
                                    <span className={cn(
                                        "font-mono-ui shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider",
                                        priorityColors[task.priority] ?? "bg-gray-100 text-gray-500"
                                    )}>
                                        {task.priority}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    {data.totalTasks > 3 && (
                        <Link
                            href="/dashboard/tasks"
                            className="font-mono-ui mt-4 text-[10px] uppercase tracking-widest text-black/40 hover:text-black/70"
                        >
                            +{data.totalTasks - 3} more →
                        </Link>
                    )}
                </div>

                {/* Notes — light gray card */}
                <div className="awakee-card flex flex-col rounded-3xl bg-[#f5f5f5] p-6 dark:bg-white/[0.07]">
                    <div className="flex items-center justify-between">
                        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
                            Second Brain
                        </span>
                        <Link href="/dashboard/brain">
                            <FileText className="h-4 w-4 text-black/30 transition-colors hover:text-black/70 dark:text-white/30 dark:hover:text-white/70" />
                        </Link>
                    </div>
                    <div className="mt-4 flex-1 space-y-2">
                        {data.notes.length === 0 ? (
                            <p className="text-sm italic text-black/40 dark:text-white/30">No recent notes</p>
                        ) : (
                            data.notes.slice(0, 4).map((note) => (
                                <Link
                                    key={note.id}
                                    href={`/dashboard/brain?note=${note.id}`}
                                    className="group flex items-center gap-2"
                                >
                                    <span className="h-1 w-1 shrink-0 rounded-full bg-black/20 transition-colors group-hover:bg-black/60 dark:bg-white/20 dark:group-hover:bg-white/60" />
                                    <span className="truncate text-sm text-black/60 transition-colors group-hover:text-black/90 dark:text-white/60 dark:group-hover:text-white/90">
                                        {note.title || "Untitled"}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                    {data.notes.length > 4 && (
                        <Link
                            href="/dashboard/brain"
                            className="font-mono-ui mt-4 text-[10px] uppercase tracking-widest text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                        >
                            View all →
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
