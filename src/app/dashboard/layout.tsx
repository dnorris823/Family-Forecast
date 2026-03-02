import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { ChatSheet } from "@/components/chat/chat-sheet"
import { PaletteSwitcher } from "@/components/palette-switcher"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="border-b">
                <div className="flex h-16 items-center px-4">
                    <div className="flex items-center gap-2 font-bold text-xl mr-8">
                        FamilyForecast
                    </div>
                    <MainNav />
                    <div className="ml-auto flex items-center gap-2">
                        <PaletteSwitcher />
                        <UserNav />
                    </div>
                </div>
            </div>
            <div className="flex-1 space-y-4 p-8 pt-6 relative">
                {children}
                <ChatSheet />
            </div>
        </div>
    )
}
