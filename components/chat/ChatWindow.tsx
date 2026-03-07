"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Ban,
    CircleX,
    EllipsisVertical,
    ImageIcon,
    LinkIcon,
    Phone,
    Send,
    Video,
    ArrowLeft,
    User
} from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatWindowProps {
    showBackButton?: boolean;
    onBack?: () => void;
}

export default function ChatWindow({ showBackButton, onBack }: ChatWindowProps) {
    const {
        chatUsers,
        messages,
        activeChatId,
        setActiveChatId,
        onlineUsers,
        typingUsers,
        sendMessage,
        markAsRead,
        setTyping
    } = useChat();
    const { data: session } = useSession();
    const [messageInput, setMessageInput] = useState("");
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    const activeUser = chatUsers.find((u) => u.id === activeChatId);
    const isOnline = activeUser ? onlineUsers.has(activeUser.keycloakId) : false;
    const isTyping = activeUser ? typingUsers.has(activeUser.keycloakId) : false;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, activeChatId]);

    useEffect(() => {
        if (activeChatId) {
            markAsRead(activeChatId);
        }
    }, [activeChatId, markAsRead]);

    // Typing signal
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!activeUser || !messageInput.trim()) {
            if (activeUser) setTyping(activeUser.keycloakId, false);
            return;
        }
        setTyping(activeUser.keycloakId, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(activeUser.keycloakId, false);
        }, 2000);
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [messageInput, activeUser, setTyping]);

    const handleSubmitMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeChatId || !activeUser) return;

        sendMessage(activeChatId, activeUser.keycloakId, messageInput);
        setMessageInput("");
        setTyping(activeUser.keycloakId, false);
    };

    if (!activeChatId || !activeUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-100 dark:border-slate-800">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <User size={32} />
                </div>
                <p className="text-sm font-medium">Select a user to start chatting</p>
            </div>
        );
    }

    return (
        <div className="card border-0 overflow-hidden !p-0 flex flex-col h-full bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-neutral-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack || (() => setActiveChatId(null))}
                            className="text-neutral-500"
                        >
                            <ArrowLeft width={20} />
                        </Button>
                    )}
                    <div className="img">
                        <Avatar className="w-10 h-10 border-2 border-primary/10">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                {activeUser.fullName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="info">
                        <h6 className="text-sm font-bold mb-0 leading-tight">{activeUser.fullName}</h6>
                        <p className={cn(
                            "mb-0 text-[11px] mt-0.5",
                            isTyping ? "text-primary animate-pulse font-medium" : "text-neutral-500 dark:text-neutral-400"
                        )}>
                            {isTyping ? "typing..." : (isOnline ? "Online" : "Offline")}
                        </p>
                    </div>
                </div>
                <div className="action inline-flex items-center gap-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400">
                                <Phone width={18} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Audio Call</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400">
                                <Video width={18} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Video Call</p>
                        </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400">
                                <EllipsisVertical width={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-neutral-600 dark:text-neutral-200">
                                <CircleX width={18} className="mr-2" />
                                All Clear
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-neutral-600 dark:text-neutral-200">
                                <Ban width={18} className="mr-2" />
                                Block
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div
                ref={chatContainerRef}
                className="chat-message-list flex-1 min-h-0 overflow-y-auto flex flex-col p-6 gap-6 scroll-sm"
            >
                {messages.map((msg, i) => {
                    const isMe = msg.senderId === session?.user?.id;
                    return (
                        <div
                            key={msg.id || i}
                            className={cn(
                                "max-w-[85%] flex items-end gap-3",
                                isMe ? "ms-auto text-white" : "text-neutral-900"
                            )}
                        >
                            {!isMe && (
                                <Avatar className="w-8 h-8 rounded-full">
                                    <AvatarFallback className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold">
                                        {activeUser.fullName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "p-4 shadow-sm",
                                isMe
                                    ? "bg-primary rounded-2xl rounded-ee-none"
                                    : "bg-neutral-50 dark:bg-slate-800 dark:text-white rounded-2xl rounded-es-none border border-neutral-100 dark:border-slate-800"
                            )}>
                                <p className="mb-2 text-sm leading-relaxed break-words">{msg.content}</p>
                                <p className={cn(
                                    "chat-time mb-0 text-[10px] text-end opacity-70",
                                    isMe ? "text-white" : "text-neutral-500 dark:text-neutral-400"
                                )}>
                                    <span>{format(new Date(msg.createdAt || Date.now()), "HH:mm")}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form
                className="chat-message-box flex items-center justify-between py-4 border-t border-neutral-100 dark:border-slate-800 shrink-0 px-4 bg-white dark:bg-slate-900"
                onSubmit={handleSubmitMessage}
            >
                <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className={cn(
                        "border-0 focus:border-0 grow bg-white dark:bg-transparent focus:outline-none focus:ring-0 py-2 px-3 focus-visible:ring-0 resize-none shadow-none h-10 min-h-[40px] max-h-[120px] scroll-sm"
                    )}
                    autoComplete="off"
                    name="chatMessage"
                    placeholder="Write message"
                    required
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitMessage(e as any);
                        }
                    }}
                />

                <div className="chat-message-box-action flex items-center gap-3 ml-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label
                                htmlFor="addAttachment"
                                className="p-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                            >
                                <LinkIcon
                                    width={18}
                                    className="text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                />
                                <Input type="file" id="addAttachment" className="hidden" />
                            </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Add Attachment</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label
                                htmlFor="addImage"
                                className="p-2 bg-transparent hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                            >
                                <ImageIcon
                                    width={18}
                                    className="text-neutral-500 dark:text-neutral-400 hover:text-primary"
                                />
                                <Input type="file" id="addImage" className="hidden" />
                            </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Add Image</p>
                        </TooltipContent>
                    </Tooltip>

                    <Button
                        type="submit"
                        className="rounded-xl flex items-center gap-2 h-10 px-4 bg-primary hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <span>Send</span>
                        <Send width={16} />
                    </Button>
                </div>
            </form>
        </div>
    );
}
