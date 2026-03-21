'use client'

interface ImageResult {
    title: string
    thumbnail: string
    url: string
    source?: string
}

export function ImageResults({ results }: { results: ImageResult[] }) {
    if (!results?.length) return null

    return (
        <div className="grid grid-cols-3 gap-2 not-prose my-2">
            {results.map((r, i) => (
                <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                    <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-white/[0.04]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={r.thumbnail}
                            alt={r.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                    </div>
                    <div className="px-2 py-1.5">
                        <p className="truncate text-[11px] font-medium text-[#111] dark:text-white/80">{r.title}</p>
                        {r.source && (
                            <p className="truncate text-[10px] text-gray-400 dark:text-white/30">{r.source}</p>
                        )}
                    </div>
                </a>
            ))}
        </div>
    )
}
