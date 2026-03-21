import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { ChatSheet } from "@/components/chat/chat-sheet"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="awakee flex min-h-screen flex-col bg-white bg-dot-grid dark:bg-[#0A0A0A]">
            <div className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] bg-glow-top" aria-hidden />
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm dark:border-white/[0.05] dark:bg-[#0A0A0A]/80 dark:backdrop-blur-xl">
                <div className="flex h-16 items-center gap-4 px-6 lg:px-8">
                    {/* Logo mark */}
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500">
                            <span className="text-xs font-bold text-white">FF</span>
                        </div>
                        <span className="text-sm font-bold text-[#111] dark:text-white/90">
                            Family<span className="font-display text-base">Forecast</span>
                        </span>
                    </div>

                    {/* Pill nav — centered */}
                    <div className="flex flex-1 justify-center">
                        <MainNav />
                    </div>

                    {/* Right actions */}
                    <div className="flex shrink-0 items-center gap-2">
                        <ThemeToggle />
                        <UserNav />
                    </div>
                </div>
            </header>

            <div className="relative flex-1 p-6 lg:p-10 dark:bg-[#0A0A0A]">
                {children}
                <ChatSheet />
            </div>
        </div>
    )
}
