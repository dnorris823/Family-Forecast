"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <div className="flex-1 lg:max-w-2xl">
                    <Tabs defaultValue="general" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="family">Family Group</TabsTrigger>
                            <TabsTrigger value="ai">AI Rules</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile</CardTitle>
                                    <CardDescription>
                                        Update your personal information.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Display Name</Label>
                                        <Input defaultValue="Dad" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Email</Label>
                                        <Input defaultValue="dad@example.com" disabled />
                                    </div>
                                    <Button>Save Changes</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="family" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Family Members</CardTitle>
                                    <CardDescription>
                                        Manage who has access to your family space.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Invites coming soon.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
