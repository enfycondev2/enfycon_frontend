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
    Send,
    ArrowLeft,
    User
} from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";

interface ChatWindowProps {
    showBackButton?: boolean;
    onBack?: () => void;
    showCloseButton?: boolean;
    onClose?: () => void;
}

function formatLastSeen(lastOnline?: string): string {
    if (!lastOnline) return 'Last seen recently';
    const tz = 'America/New_York';
    const date = new Date(lastOnline);
    const now = new Date();
    // Compare calendar days in ET, not local system time
    const dateET = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const nowET = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const diffDays = Math.floor((nowET.getTime() - dateET.getTime()) / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDays === 0) return `Last seen today at ${timeStr} ET`;
    if (diffDays === 1) return 'Last seen yesterday';
    return `Last seen ${diffDays} days ago`;
}

export default function ChatWindow({ showBackButton, onBack, showCloseButton, onClose }: ChatWindowProps) {
    const {
        chatUsers,
        messages,
        activeChatId,
        setActiveChatId,
        onlineUsers,
        typingUsers,
        sendMessage,
        markAsRead,
        setTyping,
        deleteMessages,
        clearHistory,
        blockUser,
        unblockUser
    } = useChat();
    const { data: session } = useSession();
    const [messageInput, setMessageInput] = useState("");
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant: "default" | "destructive";
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { },
        variant: "default"
    });
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    const activeUser = chatUsers.find((u) => u.id === activeChatId);
    const isOnline = activeUser ? onlineUsers.has(activeUser.keycloakId) : false;
    const isTyping = activeUser ? typingUsers.has(activeUser.keycloakId) : false;
    const isBlocked = activeUser?.isBlockedByMe;
    const hasBlockedMe = activeUser?.hasBlockedMe;

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
        if (!activeUser || !messageInput.trim() || isBlocked || hasBlockedMe) {
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
    }, [messageInput, activeUser, setTyping, isBlocked, hasBlockedMe]);

    // Long press logic
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePressStart = (msgId: string) => {
        if (isSelectionMode) return;
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = setTimeout(() => {
            setIsSelectionMode(true);
            toggleMessageSelection(msgId);
        }, 500); // 500ms for long press
    };

    const handlePressEnd = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const handleSubmitMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeChatId || !activeUser || isBlocked || hasBlockedMe) return;

        sendMessage(activeChatId, activeUser.keycloakId, messageInput);
        setMessageInput("");
        setTyping(activeUser.keycloakId, false);
    };

    const toggleMessageSelection = (id: string) => {
        setSelectedMessageIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedMessageIds.size === 0) return;
        setConfirmDialog({
            isOpen: true,
            title: "Delete Messages",
            description: `Are you sure you want to delete ${selectedMessageIds.size} selected messages? This action cannot be undone.`,
            variant: "destructive",
            onConfirm: async () => {
                await deleteMessages(Array.from(selectedMessageIds));
                setSelectedMessageIds(new Set());
                setIsSelectionMode(false);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClearChat = () => {
        if (!activeChatId) return;
        setConfirmDialog({
            isOpen: true,
            title: "Clear Chat History",
            description: "Are you sure you want to clear all messages in this chat? This will remove all messages for you.",
            variant: "destructive",
            onConfirm: async () => {
                await clearHistory(activeChatId);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const toggleBlock = async () => {
        if (!activeChatId || !activeUser) return;
        if (isBlocked) {
            await unblockUser(activeChatId);
        } else {
            setConfirmDialog({
                isOpen: true,
                title: "Block User",
                description: `Are you sure you want to block ${activeUser.fullName}? They will no longer be able to send you messages.`,
                variant: "destructive",
                onConfirm: async () => {
                    await blockUser(activeChatId);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            });
        }
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
        <div className="card border-0 overflow-hidden !p-0 flex flex-col h-full bg-[#efeae2] dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-neutral-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
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
                            {isTyping ? "typing..." : (isOnline ? "Online" : formatLastSeen(activeUser?.lastOnline))}
                        </p>
                    </div>
                </div>
                <div className="action inline-flex items-center gap-2">
                    {isSelectionMode && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-500">{selectedMessageIds.size} selected</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 h-8"
                                onClick={handleDeleteSelected}
                            >
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 h-8 text-neutral-500"
                                onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedMessageIds(new Set());
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400 w-8 h-8 rounded-full">
                                <EllipsisVertical width={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                className="text-neutral-600 dark:text-neutral-200 cursor-pointer"
                                onClick={handleClearChat}
                            >
                                <CircleX width={16} className="mr-2" />
                                All Clear
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={cn(
                                    "cursor-pointer",
                                    isBlocked ? "text-green-600" : "text-red-600 dark:text-red-400"
                                )}
                                onClick={toggleBlock}
                            >
                                <Ban width={16} className="mr-2" />
                                {isBlocked ? "Unblock User" : "Block User"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {showCloseButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full w-8 h-8"
                        >
                            <CircleX width={18} />
                        </Button>
                    )}
                </div>
            </div>

            <div
                ref={chatContainerRef}
                className="chat-message-list flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col p-6 gap-6 scroll-sm"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 opacity-40">
                        <div className="p-3 bg-white/50 rounded-full mb-2">
                            <Send width={24} className="text-neutral-400" />
                        </div>
                        <p className="text-xs">No messages yet. Say hi!</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.senderId === session?.user?.id;
                    const isSelected = selectedMessageIds.has(msg.id);
                    return (
                        <div
                            key={msg.id || i}
                            className={cn(
                                "max-w-[85%] flex items-end gap-3 transition-all duration-200",
                                isMe ? "ms-auto text-white flex-row-reverse" : "text-neutral-900",
                                isSelectionMode && "cursor-pointer"
                            )}
                            onClick={() => isSelectionMode && toggleMessageSelection(msg.id)}
                            onTouchStart={() => handlePressStart(msg.id)}
                            onTouchEnd={handlePressEnd}
                            onTouchMove={handlePressEnd}
                            onMouseDown={() => handlePressStart(msg.id)}
                            onMouseUp={handlePressEnd}
                            onMouseLeave={handlePressEnd}
                        >
                            {isSelectionMode && (
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mb-2 shrink-0",
                                    isSelected ? "bg-primary border-primary" : "border-neutral-300 bg-white"
                                )}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                            )}
                            {!isMe && (
                                <Avatar className="w-8 h-8 rounded-full mb-1">
                                    <AvatarFallback className="bg-neutral-200 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold">
                                        {activeUser.fullName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "p-3 shadow-sm relative group transition-all duration-200",
                                isMe
                                    ? "bg-[#d9fdd3] text-neutral-900 rounded-2xl rounded-ee-none border border-[#bedbb8]"
                                    : "bg-white dark:bg-slate-800 dark:text-white rounded-2xl rounded-es-none border border-neutral-200 dark:border-slate-800",
                                isSelected && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
                            )}>
                                {!isSelectionMode && (
                                    <div className={cn(
                                        "absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                                        isMe ? "right-full mr-1" : "left-full ml-1"
                                    )}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                                                    <EllipsisVertical width={12} className="text-neutral-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isMe ? "end" : "start"} className="min-w-[80px]">
                                                <DropdownMenuItem
                                                    className="text-xs text-red-500 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: "Delete Message",
                                                            description: "Are you sure you want to delete this message?",
                                                            variant: "destructive",
                                                            onConfirm: async () => {
                                                                await deleteMessages([msg.id]);
                                                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        });
                                                    }}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                                <p className="mb-1 text-sm leading-relaxed break-words">{msg.content}</p>
                                <p className={cn(
                                    "chat-time mb-0 text-[9px] text-end opacity-60 font-medium",
                                    isMe ? "text-neutral-600" : "text-neutral-500 dark:text-neutral-400"
                                )}>
                                    <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="shrink-0">
                {(isBlocked || hasBlockedMe) ? (
                    <div className="py-4 px-6 bg-red-50 border-t border-red-100 flex flex-col items-center justify-center gap-1">
                        <p className="text-xs font-semibold text-red-600">
                            {isBlocked ? "You have blocked this contact." : "You have been blocked by this contact."}
                        </p>
                        {isBlocked && (
                            <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-red-700 underline"
                                onClick={toggleBlock}
                            >
                                Unblock to send messages
                            </Button>
                        )}
                    </div>
                ) : (
                    <form
                        className="chat-message-box flex items-center justify-between py-4 border-t border-neutral-100 dark:border-slate-800 px-4 bg-white dark:bg-slate-900"
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
                            disabled={isSelectionMode}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmitMessage(e as any);
                                }
                            }}
                        />

                        <div className="chat-message-box-action flex items-center gap-2 ml-2">
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

                            <Button
                                type="submit"
                                disabled={!messageInput.trim() || isSelectionMode}
                                className="rounded-xl flex items-center justify-center w-10 h-10 p-0 bg-primary hover:bg-primary/90 transition-all shadow-sm shrink-0"
                            >
                                <Send width={18} />
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                confirmText="Confirm"
            />
        </div>
    );
}
