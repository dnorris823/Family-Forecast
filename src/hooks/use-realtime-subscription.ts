"use client"

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useRealtimeSubscription(
    table: string,
    onChange: () => void,
    filter?: string
) {
    const router = useRouter()
    const onChangeRef = useRef(onChange)

    // Update ref so we don't restart subscription on every function change
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
        const supabase = createClient()
        console.log(`[Realtime] Subscribing to ${table}...`)

        const config: any = {
            event: '*',
            schema: 'public',
            table: table,
        }
        if (filter) config.filter = filter

        const channel = supabase
            .channel(`realtime-sync-${table}`)
            .on(
                'postgres_changes',
                config,
                (payload) => {
                    console.log(`[Realtime] ${table} change detected!`, payload)
                    onChangeRef.current()
                    router.refresh()
                }
            )
            .subscribe((status, err) => {
                console.log(`[Realtime] ${table} status: ${status}`, err || '')
            })

        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`)
            supabase.removeChannel(channel)
        }
    }, [table, filter, router])
}
