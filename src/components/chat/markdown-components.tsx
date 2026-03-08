'use client'

import { ImageResults } from './image-results'
import { VideoResults } from './video-results'

export const markdownComponents = {
    code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
        const lang = /language-([\w-]+)/.exec(className || '')?.[1]

        if (lang === 'image-results') {
            try {
                return <ImageResults results={JSON.parse(String(children))} />
            } catch {
                // fall through to default rendering
            }
        }

        if (lang === 'video-results') {
            try {
                return <VideoResults results={JSON.parse(String(children))} />
            } catch {
                // fall through to default rendering
            }
        }

        return (
            <code className={className} {...props}>
                {children}
            </code>
        )
    }
}
