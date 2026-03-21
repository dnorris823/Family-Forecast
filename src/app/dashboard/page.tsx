import { AtAGlance } from "@/components/dashboard/at-a-glance"
import { getDashboardSummary } from "./dashboard-actions"

export default async function DashboardPage() {
    const summary = await getDashboardSummary()

    if ("error" in summary) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="font-mono-ui text-xs text-gray-400">
                    Error loading dashboard: {summary.error}
                </p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-10">
            {/* Editorial display header */}
            <div className="pt-6">
                <p className="animate-fade-up font-mono-ui mb-3 text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
                    {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
                <h1 className="animate-fade-up [animation-delay:0.1s] dark-gradient-heading text-6xl font-bold leading-none tracking-tight text-[#111] dark:text-white/95 lg:text-7xl">
                    Your Family
                </h1>
                <h1 className="animate-fade-up [animation-delay:0.18s] dark-gradient-heading text-6xl leading-tight tracking-tight text-[#111] dark:text-white/95 lg:text-7xl">
                    <span className="font-display">Dashboard.</span>
                </h1>
            </div>

            <div className="animate-fade-up [animation-delay:0.28s]">
                <AtAGlance data={summary} />
            </div>
        </div>
    )
}
