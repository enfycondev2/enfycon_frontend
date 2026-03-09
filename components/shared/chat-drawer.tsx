"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft, Search } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ChatWindow from "@/components/chat/ChatWindow";

function formatLastSeen(lastOnline?: string): string {
    if (!lastOnline) return 'Last seen recently';
    const tz = 'America/New_York';
    const date = new Date(lastOnline);
    const now = new Date();
    const dateET = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const nowET = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const diffDays = Math.floor((nowET.getTime() - dateET.getTime()) / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDays === 0) return `Last seen today at ${timeStr} ET`;
    if (diffDays === 1) return 'Last seen yesterday';
    return `Last seen ${diffDays} days ago`;
}

const ChatDrawer = () => {
    const { chatUsers, onlineUsers, typingUsers, activeChatId, setActiveChatId, isDrawerOpen, setIsDrawerOpen } = useChat();
    const [width, setWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = chatUsers.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUserClick = (userId: string) => {
        setActiveChatId(userId);
    };

    const handleBack = () => {
        setActiveChatId(null);
    };

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = window.innerWidth - mouseMoveEvent.clientX;
                if (newWidth >= 300 && newWidth <= window.innerWidth * 0.8) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
                <Button
                    size="icon"
                    className={cn(
                        "rounded-[50%] text-neutral-900 sm:w-10 sm:h-10 w-8 h-8 bg-gray-200/75 hover:bg-slate-200 focus-visible:ring-0 dark:bg-slate-700 dark:hover:bg-slate-600 border-0 cursor-pointer relative"
                    )}
                >
                    <MessageSquare className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="p-0 border-l dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-none"
                style={{
                    width: `${width}px`,
                    maxWidth: 'none',
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                showClose={false}
            >
                {/* Drag Handle */}
                <div
                    className={cn(
                        "absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50",
                        isResizing && "bg-primary/50"
                    )}
                    onMouseDown={startResizing}
                />
                {activeChatId ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <ChatWindow
                            showBackButton={true}
                            onBack={handleBack}
                            showCloseButton={true}
                            onClose={() => setIsDrawerOpen(false)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <SheetHeader className="p-6 border-b border-neutral-100 dark:border-slate-800 shrink-0 flex-row items-center justify-between space-y-0">
                            <SheetTitle className="text-xl font-bold">Messages</SheetTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDrawerOpen(false)}
                                className="text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <ArrowLeft className="h-5 w-5 rotate-180" />
                            </Button>
                        </SheetHeader>
                        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-9 h-10 bg-neutral-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto scroll-sm">
                            {filteredUsers.length === 0 ? (
                                <div className="py-20 px-6 text-center text-neutral-500 dark:text-neutral-400">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-base italic">
                                        {searchQuery ? "No users match your search" : "No users available to chat"}
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isOnline = onlineUsers.has(u.keycloakId);
                                    const isTyping = typingUsers.has(u.keycloakId);

                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => handleUserClick(u.id)}
                                            className="flex px-6 py-4 hover:bg-neutral-50 dark:hover:bg-slate-800/50 justify-start gap-4 border-b border-neutral-50 dark:border-slate-800/50 last:border-0 transition-colors cursor-pointer"
                                        >
                                            <div className="relative shrink-0">
                                                <Avatar className="w-12 h-12 shadow-sm border border-neutral-100 dark:border-slate-800">
                                                    <AvatarFallback className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 font-bold text-sm">
                                                        {u.fullName.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {isOnline && (
                                                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h6 className="text-sm font-bold mb-0.5 text-neutral-900 dark:text-white truncate">
                                                    {u.fullName}
                                                </h6>
                                                <p className={cn(
                                                    "mb-0 text-xs truncate font-medium",
                                                    isTyping
                                                        ? "text-primary animate-pulse"
                                                        : isOnline
                                                            ? "text-green-500"
                                                            : "text-neutral-400 dark:text-neutral-500"
                                                )}>
                                                    {isTyping ? "typing..." : isOnline ? "Online" : formatLastSeen(u.lastOnline)}
                                                </p>
                                                <p className="mb-0 text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                                                    {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default ChatDrawer;
