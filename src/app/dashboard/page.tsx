import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { AtAGlance } from "@/components/dashboard/at-a-glance"
import { getDashboardSummary } from "./dashboard-actions"

export default async function DashboardPage() {
    const summary = await getDashboardSummary()

    if ("error" in summary) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Error loading dashboard: {summary.error}</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <CalendarDateRangePicker />
                    <Button>Download</Button>
                </div>
            </div>

            {/* Real data widget */}
            <AtAGlance data={summary} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Space for future widgets or analytics */}
                <div className="md:col-span-4 h-40 rounded-lg border border-dashed flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Future Analytics Chart</p>
                </div>
                <div className="md:col-span-3 h-40 rounded-lg border border-dashed flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Family Activity Feed</p>
                </div>
            </div>
        </div>
    )
}
