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
        <div className="awakee flex min-h-screen flex-col bg-white dark:bg-[#111]">
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm dark:border-white/[0.06] dark:bg-[#111]/90">
                <div className="flex h-16 items-center gap-4 px-6 lg:px-8">
                    {/* Logo mark */}
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111] dark:bg-white">
                            <span className="text-xs font-bold text-white dark:text-[#111]">FF</span>
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

            <div className="relative flex-1 p-6 lg:p-10">
                {children}
                <ChatSheet />
            </div>
        </div>
    )
}
