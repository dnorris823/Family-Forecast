'use client'

import { Play } from 'lucide-react'

interface VideoResult {
    title: string
    thumbnail: string
    url: string
    source?: string
    description?: string
    age?: string
}

export function VideoResults({ results }: { results: VideoResult[] }) {
    if (!results?.length) return null

    return (
        <div className="flex flex-col gap-2 not-prose my-2">
            {results.map((r, i) => (
                <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.06] p-2 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/[0.04]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={r.thumbnail}
                            alt={r.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-5 w-5 fill-white text-white" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12px] font-medium text-[#111] dark:text-white/80">{r.title}</p>
                        {r.source && (
                            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/30">
                                {r.source}{r.age ? ` · ${r.age}` : ''}
                            </p>
                        )}
                        {r.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500 dark:text-white/40">{r.description}</p>
                        )}
                    </div>
                </a>
            ))}
        </div>
    )
}
