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
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { createNote } from "@/app/dashboard/brain/actions"
import { useState } from "react"

export function CreateNoteDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        try {
            const result = await createNote(formData)
            if (result?.error) {
                alert(`Error: ${result.error}`)
                return
            }
            setOpen(false)
            onSuccess?.()
        } catch (e) {
            alert('Failed to create note')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Note
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                    <DialogDescription>
                        Add a thought, recipe, or manual to your second brain.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="content" className="text-right pt-2">
                                Content
                            </Label>
                            <Textarea id="content" name="content" className="col-span-3 min-h-[150px]" placeholder="Type your markdown note here..." required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tags" className="text-right">
                                Tags
                            </Label>
                            <Input id="tags" name="tags" placeholder="wifi, recipe, urgent" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is_shared" className="text-right">
                                Share
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox id="is_shared" name="is_shared" />
                                <label
                                    htmlFor="is_shared"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Share with family
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Note</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
