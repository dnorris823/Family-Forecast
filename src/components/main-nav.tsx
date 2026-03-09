"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, CheckSquare, Brain, Home, Settings } from "lucide-react"

export function MainNav() {
    const pathname = usePathname()

    const routes = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: Home,
            active: pathname === "/dashboard",
        },
        {
            href: "/dashboard/calendar",
            label: "Calendar",
            icon: Calendar,
            active: pathname.startsWith("/dashboard/calendar"),
        },
        {
            href: "/dashboard/tasks",
            label: "Tasks",
            icon: CheckSquare,
            active: pathname.startsWith("/dashboard/tasks"),
        },
        {
            href: "/dashboard/brain",
            label: "Second Brain",
            icon: Brain,
            active: pathname.startsWith("/dashboard/brain"),
        },
        {
            href: "/dashboard/settings",
            label: "Settings",
            icon: Settings,
            active: pathname.startsWith("/dashboard/settings"),
        },
    ]

    return (
        <nav className="flex items-center gap-1 rounded-full bg-[#f0f0f0] p-1.5 dark:bg-white/[0.06]">
            {routes.map((route) => (
                <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                        "awakee-nav-pill rounded-full px-4 py-1.5 text-sm",
                        route.active
                            ? "bg-white font-medium text-[#111] shadow-sm scale-[1.02] dark:bg-white/[0.10] dark:text-white"
                            : "font-normal text-gray-500 hover:text-gray-800 dark:hover:text-white/80"
                    )}
                >
                    {/* Icon only on mobile */}
                    <route.icon className="h-4 w-4 md:hidden" />
                    {/* Label only on md+ */}
                    <span className="hidden md:inline">{route.label}</span>
                </Link>
            ))}
        </nav>
    )
}
