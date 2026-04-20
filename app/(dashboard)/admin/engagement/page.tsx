"use client";

import React, { useState, useEffect } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, Upload, Send, HelpCircle, Loader2, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

interface User {
    id: string;
    fullName: string;
    email: string;
}

export default function TeamEngagementPage() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [recipientId, setRecipientId] = useState<string>("everyone");
    const [category, setCategory] = useState<string>("CONGRATS");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await apiClient("/auth/users");
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        fetchUsers();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const applyTemplate = (type: "CONGRATS" | "BIRTHDAY" | "NOTICE" | "MOTIVATION") => {
        const selectedUser = users.find(u => u.id === recipientId);
        const name = selectedUser ? selectedUser.fullName : "Teammate";

        setCategory(type);

        switch (type) {
            case "BIRTHDAY":
                setTitle(`Happy Birthday, ${name}! 🎂`);
                setContent(`Wishing you a wonderful day filled with joy, laughter, and lots of cake! You're a star! 🎈✨`);
                break;
            case "CONGRATS":
                setTitle(`Huge Congratulations, ${name}! 🎊`);
                setContent("Your hard work and dedication have really paid off. We are so proud to have you on the team!");
                break;
            case "NOTICE":
                setTitle("Important Team Notice 📋");
                setContent("Please take a moment to review the latest updates in your dashboard. Your action might be needed!");
                break;
            case "MOTIVATION":
                setTitle("Weekly Motivation ✨");
                setContent("Success is the sum of small efforts repeated day-in and day-out. Let's make this week legendary!");
                break;
        }
    };

    const handleBroadcast = async () => {
        if (!title || !content) {
            toast.error("Please fill in the title and content");
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            formData.append("category", category);
            if (recipientId !== "everyone") {
                formData.append("recipientId", recipientId);
            }
            if (image) {
                formData.append("image", image);
            }
            
            const res = await apiClient("/announcements/broadcast", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                toast.success(recipientId === "everyone" 
                    ? "Appreciation broadcasted to everyone! 🎉" 
                    : `Targeted message sent to ${users.find(u => u.id === recipientId)?.fullName}! 💝`
                );
                setTitle("");
                setContent("");
                setImage(null);
                setPreview(null);
                setCategory("CONGRATS");
            } else {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.message || "Failed to push appreciation";
                toast.error(errorMessage);
            }
        } catch (error: any) {
            console.error("Broadcast failed", error);
            toast.error(error.message || "An error occurred during push");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <DashboardBreadcrumb 
                title="Team Engagement" 
                text="Engagement" 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Card className="border-none shadow-xl bg-white dark:bg-[#1a1f2e] rounded-[24px] overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border-b border-red-100 dark:border-red-900/30 p-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500 rounded-2xl text-white">
                                    <Heart className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold">Appreciation Hub</CardTitle>
                                    <CardDescription>Recognize hard work with a high-impact pop-up.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Templates</Label>
                                <div className="flex flex-wrap gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="rounded-full border-red-200 text-red-600 hover:bg-orange-50"
                                        onClick={() => applyTemplate("BIRTHDAY")}
                                    >
                                        🎂 Happy Birthday
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="rounded-full border-pink-200 text-pink-600 hover:bg-pink-50"
                                        onClick={() => applyTemplate("CONGRATS")}
                                    >
                                        🎉 Congratulations
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50"
                                        onClick={() => applyTemplate("NOTICE")}
                                    >
                                        📢 Important Notice
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="rounded-full border-purple-200 text-purple-600 hover:bg-purple-50"
                                        onClick={() => applyTemplate("MOTIVATION")}
                                    >
                                        💡 Motivation
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Who goes the credit to?</Label>
                                <Select value={recipientId} onValueChange={setRecipientId}>
                                    <SelectTrigger className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                        <SelectValue placeholder="Select Recipient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="everyone" className="font-bold text-indigo-600">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Everyone (Team Broadcast)
                                            </div>
                                        </SelectItem>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.fullName} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</Label>
                                <Input 
                                    id="title"
                                    placeholder="e.g., Star of the Month! 🌟" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Content</Label>
                                <Textarea 
                                    id="content"
                                    placeholder="Tell them why they're awesome..." 
                                    rows={5}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Banner Image (Optional)</Label>
                                <div 
                                    className="relative h-40 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center bg-gray-50/20 hover:bg-gray-50/50 transition-colors cursor-pointer overflow-hidden group"
                                    onClick={() => document.getElementById("image-upload")?.click()}
                                >
                                    {preview ? (
                                        <>
                                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="w-8 h-8 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500">Upload a photo for extra impact</p>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        id="image-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            <Button 
                                className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold text-lg shadow-lg shadow-red-500/20"
                                onClick={handleBroadcast}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                ) : (
                                    <Send className="w-6 h-6 mr-2" />
                                )}
                                {recipientId === "everyone" ? "Send Celebration to All" : "Send Recognition to User"}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Preview Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-2 text-gray-500 mb-2 px-2">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Pop-up Preview</span>
                    </div>

                    <div className="relative border-4 border-gray-100 dark:border-gray-900 rounded-[40px] p-8 bg-neutral-50 dark:bg-black/20 aspect-[4/5] flex items-center justify-center overflow-hidden">
                        {/* Mock Card */}
                        <div className="w-full max-w-sm bg-white dark:bg-[#1a1f2e] rounded-[24px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 pointer-events-none">
                            <div className="h-32 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                                {preview ? (
                                    <img src={preview} className="w-full h-full object-cover" />
                                ) : (
                                    <Heart className="w-12 h-12 text-white/50" />
                                )}
                            </div>
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title || "Your Title Here"}</h3>
                                <p className="text-sm text-gray-500 line-clamp-3 mb-6">{content || "Your heartfelt message will appear here for the user to see."}</p>
                                <div className="h-10 w-32 bg-indigo-600 rounded-full mx-auto" />
                            </div>
                        </div>

                        {/* Decoration */}
                        <div className="absolute top-10 right-10 w-24 h-24 bg-red-400/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-10 left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
