"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { login, signup } from "./actions"
import { ArrowUpRight } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white bg-dot-grid px-6 dark:bg-[#0A0A0A]">
            <div className="pointer-events-none fixed inset-x-0 top-0 h-[50vh] bg-glow-top" aria-hidden />
            <div className="relative w-full max-w-sm space-y-8">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500">
                        <span className="text-sm font-bold text-white">FF</span>
                    </div>
                    <span className="text-base font-bold text-[#111] dark:text-white/90">
                        Family<span className="font-display">Forecast</span>
                    </span>
                </div>

                {/* Display heading */}
                <div className="space-y-1">
                    <p className="font-mono-ui mb-3 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
                        Welcome back
                    </p>
                    <h1 className="gradient-text-accent text-5xl font-bold leading-none tracking-tight">
                        Good to see
                    </h1>
                    <h1 className="gradient-text-accent text-5xl leading-tight tracking-tight">
                        <span className="font-display">you.</span>
                    </h1>
                    <p className="font-mono-ui pt-2 text-xs text-gray-400 dark:text-white/30">
                        Sign in to your family space
                    </p>
                </div>

                {/* Auth tabs */}
                <Tabs defaultValue="login" className="space-y-5">
                    <TabsList className="h-auto rounded-full bg-[#f0f0f0] p-1.5 dark:bg-white/[0.06]">
                        <TabsTrigger
                            value="login"
                            className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                        >
                            Sign In
                        </TabsTrigger>
                        <TabsTrigger
                            value="signup"
                            className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                        >
                            Sign Up
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                        <form action={login} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] placeholder:text-gray-300 focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/20 dark:focus-visible:ring-violet-500/40"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus-visible:ring-violet-500/40"
                                />
                            </div>
                            <button
                                type="submit"
                                className="mt-2 flex w-full items-center justify-between rounded-full btn-gradient px-6 py-3 text-sm font-medium shadow-lg shadow-violet-500/20"
                            >
                                Sign In
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                            </button>
                        </form>
                    </TabsContent>

                    <TabsContent value="signup">
                        <form action={signup} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Full Name
                                </Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Jane Smith"
                                    required
                                    className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] placeholder:text-gray-300 focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/20 dark:focus-visible:ring-violet-500/40"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus-visible:ring-violet-500/40"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus-visible:ring-violet-500/40"
                                />
                            </div>
                            <button
                                type="submit"
                                className="mt-2 flex w-full items-center justify-between rounded-full btn-gradient px-6 py-3 text-sm font-medium shadow-lg shadow-violet-500/20"
                            >
                                Create Account
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                            </button>
                        </form>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
