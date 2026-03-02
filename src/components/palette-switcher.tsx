"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const PALETTES = [
    {
        id: "ocean",
        label: "Ocean Blue",
        light: "hsl(213, 94%, 52%)",
        dark: "hsl(213, 80%, 65%)",
    },
    {
        id: "sage",
        label: "Sage Green",
        light: "hsl(152, 45%, 38%)",
        dark: "hsl(152, 45%, 55%)",
    },
    {
        id: "amber",
        label: "Warm Amber",
        light: "hsl(38, 92%, 45%)",
        dark: "hsl(38, 85%, 60%)",
    },
    {
        id: "rose",
        label: "Soft Rose",
        light: "hsl(340, 65%, 50%)",
        dark: "hsl(340, 60%, 68%)",
    },
]

const STORAGE_KEY = "ff-palette"
const DEFAULT_PALETTE = "ocean"

export function PaletteSwitcher() {
    const { resolvedTheme, setTheme } = useTheme()
    const [palette, setPalette] = useState(DEFAULT_PALETTE)
    const [mounted, setMounted] = useState(false)
    const isDark = resolvedTheme === "dark"

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PALETTE
        setPalette(saved)
        document.documentElement.setAttribute("data-palette", saved)
    }, [])

    function applyPalette(id: string) {
        setPalette(id)
        localStorage.setItem(STORAGE_KEY, id)
        document.documentElement.setAttribute("data-palette", id)
    }

    // Avoid hydration mismatch — render a placeholder until mounted
    if (!mounted) {
        return <div className="flex items-center gap-1 w-[72px]" />
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-9 w-9"
                aria-label="Toggle dark mode"
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Pick accent color"
                    >
                        <Palette className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-3 w-48">
                    <p className="text-xs text-muted-foreground mb-2 font-medium tracking-wide uppercase">
                        Accent Color
                    </p>
                    <div className="flex flex-col gap-1">
                        {PALETTES.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => applyPalette(p.id)}
                                className={cn(
                                    "flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left",
                                    palette === p.id && "bg-accent text-accent-foreground font-medium"
                                )}
                            >
                                <span
                                    className="h-3.5 w-3.5 rounded-full flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                                    style={{ background: isDark ? p.dark : p.light }}
                                />
                                {p.label}
                                {palette === p.id && (
                                    <span className="ml-auto text-xs opacity-60">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
