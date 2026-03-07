"use client";

import React, { useState, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Settings, User } from "lucide-react";
import userImg from "@/public/assets/images/user.png";
import ChatWindow from "@/components/chat/ChatWindow";
import { format } from "date-fns";

const ChatBox = () => {
    const {
        chatUsers,
        activeChatId,
        setActiveChatId,
        onlineUsers,
        typingUsers
    } = useChat();
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");

    const userIdParam = searchParams.get("userId");

    useEffect(() => {
        if (userIdParam) {
            setActiveChatId(userIdParam);
        }
    }, [userIdParam, setActiveChatId]);

    const filteredUsers = chatUsers.filter((u) =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const aOnline = onlineUsers.has(a.keycloakId) ? 1 : 0;
        const bOnline = onlineUsers.has(b.keycloakId) ? 1 : 0;
        return bOnline - aOnline;
    });

    const displayName = session?.user?.name || "User";

    return (
        <div className="chat-wrapper grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-260px)] min-h-0 overflow-hidden">
            {/* Sidebar / User List */}
            <div className={cn(
                "card shadow-sm border-0 overflow-hidden !p-0 md:col-span-4 xl:col-span-3 bg-white dark:bg-slate-900 flex flex-col h-full",
                activeChatId ? "hidden md:flex" : "flex"
            )}>
                <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4 border-b border-neutral-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={session?.user?.image || userImg.src} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                    {displayName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </div>
                        <div className="">
                            <h6 className="text-base font-bold mb-0 leading-tight">{displayName}</h6>
                            <p className="mb-0 text-[11px] text-neutral-500 dark:text-neutral-400">Available</p>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400">
                                <EllipsisVertical width={20} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className='text-neutral-600 dark:text-neutral-200'>
                                <User width={18} className='mr-2' />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className='text-neutral-600 dark:text-neutral-200'>
                                <Settings width={18} className='mr-2' />
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Command className="bg-transparent flex-1">
                    <div className="border-b border-neutral-100 dark:border-slate-800">
                        <CommandInput
                            placeholder="Search people..."
                            className="h-12"
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                    </div>
                    <CommandList className='flex-1 max-h-none h-[calc(100vh-370px)] scroll-sm overflow-y-auto'>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup className='p-0'>
                            {sortedUsers.map((user) => {
                                const isUserOnline = onlineUsers.has(user.keycloakId);
                                const isUserTyping = typingUsers.has(user.keycloakId);
                                const isActive = activeChatId === user.id;

                                return (
                                    <CommandItem
                                        key={user.id}
                                        value={user.fullName}
                                        onSelect={() => setActiveChatId(user.id)}
                                        className={cn(
                                            "p-0 transition-colors",
                                            isActive ? "bg-primary/5 dark:bg-primary/10" : ""
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex items-center justify-between gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 px-5 py-3 w-full border-b border-neutral-50 dark:border-slate-800/50",
                                                isActive && "bg-neutral-50 dark:bg-slate-800"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar className="w-10 h-10 shadow-sm border border-neutral-100 dark:border-slate-800">
                                                        <AvatarFallback className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs">
                                                            {user.fullName.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {isUserOnline && (
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm" />
                                                    )}
                                                </div>
                                                <div className="info">
                                                    <h6 className="text-sm font-bold mb-0.5 line-clamp-1">{user.fullName}</h6>
                                                    <p className={cn(
                                                        "mb-0 text-xs line-clamp-1",
                                                        isUserTyping ? "text-primary animate-pulse font-medium" : "text-neutral-500 dark:text-neutral-400"
                                                    )}>
                                                        {isUserTyping ? "typing..." : user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-end">
                                                <p className="mb-0 text-neutral-400 text-[10px]">
                                                    {isUserOnline ? "Now" : user.lastOnline ? format(new Date(user.lastOnline), "HH:mm") : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </div>

            <div className={cn(
                "col-span-12 md:col-span-8 xl:col-span-9 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden",
                !activeChatId ? "hidden md:flex" : "flex"
            )}>
                <ChatWindow showBackButton={true} onBack={() => setActiveChatId(null)} />
            </div>
        </div>
    );
};

export default ChatBox;
