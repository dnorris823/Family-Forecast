import { expect, test, describe } from 'vitest'
import { getCalendarViewRange } from './date-utils'
import { format } from 'date-fns'

describe('getCalendarViewRange', () => {
    test('calculates correct range for February 2026', () => {
        // Feb 1 2026 is a Sunday. 
        // So startOfWeek should likely be Feb 1 (if week starts on Sunday)
        const date = new Date('2026-02-15T12:00:00') // Middle of Feb
        const { startDate, endDate, days, firstDayOfMonth } = getCalendarViewRange(date)

        // Verify first day of month
        expect(format(firstDayOfMonth, 'yyyy-MM-dd')).toBe('2026-02-01')

        // Verify start of view (should be Jan 25 2026 if week starts on Sun? Wait, Feb 1 is Sunday)
        // Let's check Feb 2025. Feb 1 2025 is Saturday.
        // Start of view should be Sunday Jan 26 2025.

        // Let's stick to the current month in the prompt context: Feb 2026.
        // Feb 1 2026 is Sunday.
        expect(format(startDate, 'yyyy-MM-dd')).toBe('2026-02-01')

        // Feb 28 2026 is Saturday.
        // So the view should essentially just be exactly Feb 1 to Feb 28? 
        // (4 weeks exactly? 28 days)
        expect(days.length).toBe(28)
        expect(format(endDate, 'yyyy-MM-dd')).toBe('2026-02-28')
    })

    test('calculates correct range for a month starting on Wednesday', () => {
        // May 2026 starts on Friday.
        // let's try April 2026. Starts on Wednesday.
        const date = new Date('2026-04-10')
        const { startDate, endDate, days } = getCalendarViewRange(date)

        // April 1st is Wednesday.
        // Start of week (Sunday) should be March 29.
        expect(format(startDate, 'yyyy-MM-dd')).toBe('2026-03-29')

        // April 30 is Thursday.
        // End of week (Saturday) should be May 2.
        expect(format(endDate, 'yyyy-MM-dd')).toBe('2026-05-02')

        // 5 weeks * 7 = 35 days
        expect(days.length).toBe(35)
    })
})
