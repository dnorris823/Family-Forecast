"use client"

import * as React from "react"
import { format, isSameMonth, isSameDay, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateEventDialog } from "@/components/calendar/create-event-dialog"
import { getEvents } from "./actions"
import { type Event } from "@/types"
import { getCalendarViewRange } from "@/lib/date-utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())
    const [events, setEvents] = React.useState<Event[]>([])

    const { startDate, endDate, days, firstDayOfMonth } = React.useMemo(() => {
        return getCalendarViewRange(currentMonth)
    }, [currentMonth])

    const fetchEvents = React.useCallback(async () => {
        const data = await getEvents(startDate, endDate)
        setEvents(data as unknown as Event[])
    }, [startDate, endDate])

    useRealtimeSubscription('events', fetchEvents)

    React.useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const handleNextMonth = () =>
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    const handlePrevMonth = () =>
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

    return (
        <div className="flex h-full flex-col space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between pt-4">
                <div>
                    <p className="animate-fade-up font-mono-ui mb-1 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
                        Schedule
                    </p>
                    <h1 className="animate-fade-up [animation-delay:0.1s] text-5xl font-bold leading-none tracking-tight text-[#111] dark:text-white/95 lg:text-6xl">
                        Calendar<span className="font-display">.</span>
                    </h1>
                </div>

                <div className="animate-fade-up [animation-delay:0.18s] flex items-center gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-mono-ui w-28 text-center text-sm font-medium text-gray-700 dark:text-white/70">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <CreateEventDialog onSuccess={fetchEvents} />
                </div>
            </div>

            {/* Calendar grid */}
            <div className="animate-fade-up [animation-delay:0.28s] flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06]">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-[#f8f8f8] dark:border-white/[0.06] dark:bg-white/[0.02]">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div
                            key={day}
                            className="font-mono-ui py-3 text-center text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid flex-1 grid-cols-7 grid-rows-6 bg-white dark:bg-[#111]">
                    {days.map((day) => (
                        <div
                            key={day.toString()}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                                "flex cursor-pointer flex-col border-b border-r border-gray-100 p-2 transition-colors dark:border-white/[0.04]",
                                "hover:bg-[#f8f8f8] dark:hover:bg-white/[0.02]",
                                !isSameMonth(day, firstDayOfMonth) && "opacity-25",
                                isSameDay(day, selectedDate ?? new Date(-1)) && "bg-[#f5f5f5] dark:bg-white/[0.03]"
                            )}
                        >
                            <time
                                dateTime={format(day, 'yyyy-MM-dd')}
                                className={cn(
                                    "ml-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                                    isSameDay(day, new Date())
                                        ? "bg-[#111] font-bold text-white dark:bg-white dark:text-[#111]"
                                        : "text-gray-700 dark:text-white/70"
                                )}
                            >
                                {format(day, 'd')}
                            </time>
                            <div className="mt-1 space-y-0.5">
                                {events
                                    .filter((e) => isSameDay(parseISO(e.start_time), day))
                                    .map((event) => (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "truncate rounded-full px-2 py-0.5 text-[10px] font-medium",
                                                !event.is_private
                                                    ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
                                                    : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50"
                                            )}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
