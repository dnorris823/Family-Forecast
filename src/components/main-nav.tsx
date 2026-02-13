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
        <nav className="flex items-center space-x-4 lg:space-x-6">
            {routes.map((route) => (
                <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                        route.active ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    <route.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{route.label}</span>
                </Link>
            ))}
        </nav>
    )
}
