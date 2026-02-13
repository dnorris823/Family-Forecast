import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"

export function getCalendarViewRange(currentMonth: Date) {
    const firstDayOfMonth = startOfMonth(currentMonth)
    const lastDayOfMonth = endOfMonth(currentMonth)
    const startDate = startOfWeek(firstDayOfMonth)
    const endDate = endOfWeek(lastDayOfMonth)

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    return { startDate, endDate, days, firstDayOfMonth }
}
