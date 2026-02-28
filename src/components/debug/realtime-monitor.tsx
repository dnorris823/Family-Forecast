"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export function RealtimeMonitor({ table }: { table: string }) {
    const [status, setStatus] = React.useState<string>("CONNECTING")
    const [lastEvent, setLastEvent] = React.useState<any>(null)
    const [userId, setUserId] = React.useState<string | null>(null)
    const [eventCount, setEventCount] = React.useState(0)

    const [pingStatus, setPingStatus] = React.useState("")
    const [manualLogs, setManualLogs] = React.useState<any[]>([])

    const fetchManualLogs = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('realtime_debug').select('*').order('created_at', { ascending: false }).limit(3)
        if (data) setManualLogs(data)
    }

    React.useEffect(() => {
        const supabase = createClient()

        // Check Auth
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || "ANON")
        })
        fetchManualLogs()

        // Subscribe to user's requested table
        const channel1 = supabase
            .channel(`monitor-${table}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: table },
                (payload) => {
                    console.log(`[${table}] payload:`, payload)
                    setLastEvent(payload)
                    setEventCount(c => c + 1)
                }
            )
            .subscribe(status => setStatus(status))

        // Subscribe to DEBUG table
        const channel2 = supabase
            .channel('monitor-debug')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'realtime_debug' }, (payload) => {
                console.log("[DEBUG] payload:", payload)
                setLastEvent(payload)
                setEventCount(c => c + 1)
                setPingStatus("RECEIVED PONG!")
            })
            .subscribe()

        // Subscribe to BROADCAST (Client-to-Client)
        const channel3 = supabase
            .channel('broadcast-test')
            .on('broadcast', { event: 'ping' }, (payload) => {
                console.log("[Broadcast] Received:", payload)
                setLastEvent({ type: 'broadcast', ...payload })
                setEventCount(c => c + 1)
                setPingStatus("BROADCAST RECEIVED!")
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel1)
            supabase.removeChannel(channel2)
            supabase.removeChannel(channel3)
        }
    }, [table])

    const sendPing = async () => {
        setPingStatus("Sending Database Ping...")
        const supabase = createClient()

        // Test 1: Database Insert
        const { error } = await supabase.from('realtime_debug').insert({ message: 'DB Ping from ' + (userId || 'anon') })
        if (error) setPingStatus("DB Error: " + error.message)
        else {
            setPingStatus("DB Sent! Checking Broadcast...")
            // Test 2: Direct Broadcast
            const channel = supabase.channel('broadcast-test')
            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'ping',
                        payload: { message: 'hello from ' + userId },
                    })
                    setPingStatus("Both Sent! Waiting...")
                    setTimeout(fetchManualLogs, 2000)
                }
            })
        }
    }

    return (
        <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-2xl border-primary/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="p-3 pb-2 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">Realtime: {table}</CardTitle>
                    <Badge variant={status === 'SUBSCRIBED' ? 'default' : 'destructive'}>
                        {status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-3 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                    <span>User:</span>
                    <span className="truncate max-w-[150px]">{userId || "Checking..."}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Events:</span>
                    <span>{eventCount}</span>
                </div>

                <div className="pt-2 border-t mt-2">
                    <button
                        onClick={sendPing}
                        className="w-full bg-primary text-primary-foreground px-2 py-1 rounded text-center hover:opacity-90 transition-opacity"
                    >
                        Test Connection (Ping)
                    </button>
                    <div className="text-[10px] text-center mt-1 text-muted-foreground">{pingStatus}</div>

                    <div className="mt-2 text-[10px] border-t pt-1">
                        <div className="font-semibold">DB Rows (Manual Fetch):</div>
                        {manualLogs.map((log: any) => (
                            <div key={log.id} className="truncate text-muted-foreground">
                                {new Date(log.created_at).toLocaleTimeString()}: {log.message}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-2">
                    <div className="font-semibold mb-1">Last Event:</div>
                    <ScrollArea className="h-32 w-full rounded border bg-muted p-2">
                        {lastEvent ? (
                            <pre className="text-[10px] whitespace-pre-wrap break-all">
                                {JSON.stringify(lastEvent, null, 2)}
                            </pre>
                        ) : (
                            <div className="text-muted-foreground italic">Waiting for changes...</div>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    )
}
