"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowUpRight, RotateCcw } from "lucide-react"
import { resetBrainDefaults } from "@/app/dashboard/brain/actions"

export default function SettingsPage() {
    const [resetStatus, setResetStatus] = React.useState<string | null>(null)
    const [isResetting, setIsResetting] = React.useState(false)

    const handleReset = async () => {
        setIsResetting(true)
        setResetStatus(null)
        const result = await resetBrainDefaults()
        setIsResetting(false)
        if (result.error) {
            setResetStatus(`Error: ${result.error}`)
        } else if (result.created === 0) {
            setResetStatus('All default files are already present.')
        } else {
            setResetStatus(`Restored ${result.created} missing file${result.created !== 1 ? 's' : ''}.`)
        }
    }
    return (
        <div className="flex-1 space-y-8">
            {/* Header */}
            <div className="pt-4">
                <p className="font-mono-ui mb-1 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-white/30">
                    Preferences
                </p>
                <h1 className="text-5xl font-bold leading-none tracking-tight text-[#111] dark:text-white/95 lg:text-6xl">
                    Settings<span className="font-display">.</span>
                </h1>
            </div>

            <div className="max-w-2xl">
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="h-auto rounded-full bg-[#f0f0f0] p-1.5 dark:bg-white/[0.06]">
                        <TabsTrigger
                            value="general"
                            className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                        >
                            General
                        </TabsTrigger>
                        <TabsTrigger
                            value="family"
                            className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                        >
                            Family Group
                        </TabsTrigger>
                        <TabsTrigger
                            value="ai"
                            className="rounded-full px-5 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:shadow-sm data-[state=active]:text-[#111] data-[state=inactive]:text-gray-500 dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white dark:data-[state=inactive]:text-white/40"
                        >
                            AI Rules
                        </TabsTrigger>
                    </TabsList>

                    {/* General */}
                    <TabsContent value="general" className="space-y-6">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111]">
                            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
                                <p className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Profile
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">
                                    Update your personal information.
                                </p>
                            </div>
                            <div className="space-y-5 px-6 py-6">
                                <div className="space-y-1.5">
                                    <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                        Display Name
                                    </Label>
                                    <Input
                                        defaultValue="Dad"
                                        className="rounded-xl border-gray-200 bg-[#f8f8f8] text-[#111] focus-visible:ring-1 focus-visible:ring-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus-visible:ring-white/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                        Email
                                    </Label>
                                    <Input
                                        defaultValue="dad@example.com"
                                        disabled
                                        className="rounded-xl border-gray-200 bg-[#f8f8f8] text-gray-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/30"
                                    />
                                </div>
                                <button className="flex items-center gap-3 rounded-full bg-[#111] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-[#111]">
                                    Save Changes
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                                        <ArrowUpRight className="h-3 w-3" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Family */}
                    <TabsContent value="family">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111]">
                            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
                                <p className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Family Members
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">
                                    Manage who has access to your family space.
                                </p>
                            </div>
                            <div className="px-6 py-10 text-center">
                                <p className="font-mono-ui text-xs text-gray-300 dark:text-white/20">
                                    Invites coming soon.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* AI Rules */}
                    <TabsContent value="ai" className="space-y-4">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111]">
                            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
                                <p className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    AI Behavior
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">
                                    Customize how the AI assistant behaves by editing AI Memory files in your Brain.
                                </p>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-sm text-gray-500 dark:text-white/40">
                                    Open the <strong className="text-[#111] dark:text-white/80">Brain</strong> page and edit the files in the <strong className="text-[#111] dark:text-white/80">AI Memory</strong> section to set your assistant&apos;s name, personality, rules, and behavior.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111]">
                            <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.04]">
                                <p className="font-mono-ui text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                                    Brain Structure
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">
                                    Restore any missing default notes and folders.
                                </p>
                            </div>
                            <div className="space-y-4 px-6 py-6">
                                <p className="text-sm text-gray-500 dark:text-white/40">
                                    If you&apos;ve accidentally deleted default files, this will recreate only the missing ones without changing anything you&apos;ve written.
                                </p>
                                {resetStatus && (
                                    <p className="text-sm text-gray-600 dark:text-white/60">{resetStatus}</p>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button
                                            disabled={isResetting}
                                            className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-[#111] transition-opacity hover:opacity-70 disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
                                        >
                                            {isResetting ? 'Restoring...' : 'Reset Brain to Defaults'}
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
                                                <RotateCcw className="h-3 w-3" />
                                            </span>
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reset Brain to Defaults?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will recreate any missing default files. Your existing notes will not be changed or deleted.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleReset}>
                                                Restore Missing Files
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
