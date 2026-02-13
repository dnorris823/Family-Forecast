"use client"

import * as React from "react"
import { format, isSameMonth, isSameDay, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CreateEventDialog } from "@/components/calendar/create-event-dialog"
import { getEvents } from "./actions"
import { type Event } from "@/types"
import { getCalendarViewRange } from "@/lib/date-utils"

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
    }, [startDate, endDate]) // Dependencies for useCallback based on what getEvents uses

    // Fetch events when month changes
    React.useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    return (
        <div className="flex-1 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold w-32 text-center">
                        {format(currentMonth, "MMMM yyyy")}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <CreateEventDialog onSuccess={fetchEvents} />
                </div>
            </div>

            <Card className="flex-1">
                <CardContent className="p-0 h-full">
                    <div className="grid grid-cols-7 h-full border-l border-t bg-muted/20">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="p-2 text-center font-semibold text-sm border-r border-b bg-background">
                                {day}
                            </div>
                        ))}

                        {days.map((day, dayIdx) => (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "min-h-[100px] p-2 border-r border-b bg-background transition-colors hover:bg-muted/50 cursor-pointer flex flex-col",
                                    !isSameMonth(day, firstDayOfMonth) && "text-muted-foreground bg-muted/10",
                                    isSameDay(day, new Date()) && "bg-accent/20"
                                )}
                                onClick={() => setSelectedDate(day)}
                            >
                                <time dateTime={format(day, 'yyyy-MM-dd')} className={cn(
                                    "ml-auto text-sm w-6 h-6 flex items-center justify-center rounded-full",
                                    isSameDay(day, new Date()) && "bg-primary text-primary-foreground font-bold"
                                )}>
                                    {format(day, 'd')}
                                </time>
                                <div className="flex-1 mt-1 space-y-1">
                                    {events.filter(e => isSameDay(parseISO(e.start_time), day)).map((event) => (
                                        <div key={event.id} className={cn(
                                            "px-2 py-1 rounded text-xs truncate font-medium",
                                            !event.is_private ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-secondary-foreground"
                                        )}>
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
