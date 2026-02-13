"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createEvent } from "@/app/dashboard/calendar/actions"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"

export function CreateEventDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        try {
            const result = await createEvent(formData)
            if (result?.error) {
                alert(`Error: ${result.error}`)
                return
            }
            setOpen(false)
            onSuccess?.()
        } catch (e) {
            alert('Failed to create event. Please try again.')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Event
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Event</DialogTitle>
                    <DialogDescription>
                        Schedule a new event for your family.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input id="title" name="title" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Date
                            </Label>
                            <Input id="date" name="date" type="date" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">
                                Time
                            </Label>
                            <Input id="time" name="time" type="time" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is_private" className="text-right">
                                Private
                            </Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="is_private" name="is_private" />
                                <label
                                    htmlFor="is_private"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Only visible to me
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
