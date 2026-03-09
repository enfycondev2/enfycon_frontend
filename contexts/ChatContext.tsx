"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "./SocketContext";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

interface ChatUser {
    id: string;
    fullName: string;
    email: string;
    keycloakId: string;
    roles: string[];
    lastOnline?: string;
    isBlockedByMe?: boolean;
    hasBlockedMe?: boolean;
}

interface ChatContextType {
    onlineUsers: Set<string>; // Keycloak IDs
    typingUsers: Set<string>; // Keycloak IDs
    messages: Message[];
    chatUsers: ChatUser[];
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (isOpen: boolean) => void;
    openChatWithUser: (userId: string) => void;
    sendMessage: (receiverId: string, receiverKeycloakId: string, content: string) => void;
    markAsRead: (senderId: string) => void;
    setTyping: (receiverKeycloakId: string, isTyping: boolean) => void;
    deleteMessages: (messageIds: string[]) => Promise<void>;
    clearHistory: (otherUserId: string) => Promise<void>;
    blockUser: (targetUserId: string) => Promise<void>;
    unblockUser: (targetUserId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
    onlineUsers: new Set(),
    typingUsers: new Set(),
    messages: [],
    chatUsers: [],
    activeChatId: null,
    setActiveChatId: () => { },
    isDrawerOpen: false,
    setIsDrawerOpen: () => { },
    openChatWithUser: () => { },
    sendMessage: () => { },
    markAsRead: () => { },
    setTyping: () => { },
    deleteMessages: async () => { },
    clearHistory: async () => { },
    blockUser: async () => { },
    unblockUser: async () => { },
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { socket, isConnected } = useSocket();
    const { data: session } = useSession();

    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const openChatWithUser = useCallback((userId: string) => {
        setActiveChatId(userId);
        setIsDrawerOpen(true);
    }, []);

    const playChatSound = async () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // WhatsApp style sound: Soft high-pitched "ping"
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = "sine";
            // Start higher 1500Hz, drop quickly 1200Hz
            oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (error) {
            console.error("Failed to play chat sound:", error);
        }
    };

    const playSendSound = async () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // WhatsApp style "Sent" sound: Quick soft "pop"
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (error) {
            console.error("Failed to play send sound:", error);
        }
    };

    // 1. Fetch Chat Users
    useEffect(() => {
        if (session?.user?.accessToken) {
            const fetchUsers = async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/users`, {
                        headers: { Authorization: `Bearer ${session.user.accessToken}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Filter out the current user
                        const filtered = data.filter((u: any) => u.id !== session.user.id);
                        setChatUsers(filtered);
                    }
                } catch (err) {
                    console.error("Failed to fetch chat users:", err);
                }
            };
            fetchUsers();
        }
    }, [session?.user?.accessToken, session?.user?.id]);

    // 2. Fetch History when active chat changes
    useEffect(() => {
        if (session?.user?.accessToken && activeChatId) {
            const fetchHistory = async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${activeChatId}`, {
                        headers: { Authorization: `Bearer ${session.user.accessToken}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch message history:", err);
                }
            };
            fetchHistory();
        } else if (!activeChatId) {
            setMessages([]);
        }
    }, [session?.user?.accessToken, activeChatId]);

    // 3. Socket Listeners
    useEffect(() => {
        if (socket && isConnected) {
            // Get initial online list
            socket.emit("get_online_users");

            socket.on("online_users_list", (ids: string[]) => {
                setOnlineUsers(new Set(ids));
            });

            socket.on("user_status", ({ userId, status, lastOnline }: { userId: string; status: "online" | "offline"; lastOnline?: string }) => {
                setOnlineUsers((prev) => {
                    const next = new Set(prev);
                    if (status === "online") next.add(userId);
                    else next.delete(userId);
                    return next;
                });

                if (status === "offline" && lastOnline) {
                    setChatUsers((prev) =>
                        prev.map(u => u.keycloakId === userId ? { ...u, lastOnline } : u)
                    );
                }
            });

            socket.on("user_typing", ({ userId }: { userId: string }) => {
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.add(userId);
                    return next;
                });
            });

            socket.on("user_stop_typing", ({ userId }: { userId: string }) => {
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            });

            socket.on("receive_message", (message: Message) => {
                // 1. Update messages list
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    if (
                        (message.senderId === activeChatId || message.receiverId === activeChatId) ||
                        (message.senderId === session?.user?.id || message.receiverId === session?.user?.id)
                    ) {
                        return [...prev, message];
                    }
                    return prev;
                });

                // 2. Reorder chat users to bring the active one to top
                setChatUsers((prev) => {
                    const otherId = message.senderId === session?.user?.id ? message.receiverId : message.senderId;
                    const userIndex = prev.findIndex(u => u.id === otherId);
                    if (userIndex > -1) {
                        const newUsers = [...prev];
                        const [user] = newUsers.splice(userIndex, 1);
                        return [user, ...newUsers];
                    }
                    return prev;
                });

                // 3. Play sound if not from me
                if (message.senderId !== session?.user?.id) {
                    playChatSound();
                }

                // 4. Show notification if not in active chat
                if (message.senderId !== activeChatId && message.senderId !== session?.user?.id) {
                    const sender = chatUsers.find(u => u.id === message.senderId);
                    toast(`New message from ${sender?.fullName || 'someone'}`, { icon: '💬' });
                }
            });


            return () => {
                socket.off("online_users_list");
                socket.off("user_status");
                socket.off("user_typing");
                socket.off("user_stop_typing");
                socket.off("receive_message");
            };
        }
    }, [socket, isConnected, activeChatId, session?.user?.id, chatUsers, setTypingUsers]);

    // Heartbeat emitter — keeps lastOnline fresh while the tab is open.
    // Emits every 60 s; the backend throttles DB writes to once per 5 min.
    useEffect(() => {
        if (!socket || !isConnected) return;

        const interval = setInterval(() => {
            socket.emit('heartbeat');
        }, 60_000);

        return () => {
            clearInterval(interval);
        };
    }, [socket, isConnected]);

    const sendMessage = useCallback((receiverId: string, receiverKeycloakId: string, content: string) => {
        if (socket && session?.user?.id) {
            socket.emit("send_message", {
                receiverId,
                receiverKeycloakId,
                content,
                senderDbId: session.user.id
            });

            // Move this user to top of chatUsers immediately
            setChatUsers((prev) => {
                const userIndex = prev.findIndex(u => u.id === receiverId);
                if (userIndex > -1) {
                    const newUsers = [...prev];
                    const [user] = newUsers.splice(userIndex, 1);
                    return [user, ...newUsers];
                }
                return prev;
            });
        }
    }, [socket, session?.user?.id]);


    const setTyping = useCallback((receiverKeycloakId: string, isTyping: boolean) => {
        if (socket) {
            socket.emit(isTyping ? "typing" : "stop_typing", { receiverKeycloakId });
        }
    }, [socket]);

    const markAsRead = useCallback(async (senderId: string) => {
        if (session?.user?.accessToken) {
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/read/${senderId}`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${session.user.accessToken}` },
                });
            } catch (err) {
                console.error("Failed to mark messages as read:", err);
            }
        }
    }, [session?.user?.accessToken]);

    const deleteMessages = useCallback(async (messageIds: string[]) => {
        if (session?.user?.accessToken && messageIds.length > 0) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ messageIds })
                });
                if (res.ok) {
                    setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
                }
            } catch (err) {
                console.error("Failed to delete messages:", err);
            }
        }
    }, [session?.user?.accessToken]);

    const clearHistory = useCallback(async (otherUserId: string) => {
        if (session?.user?.accessToken) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${otherUserId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${session.user.accessToken}` },
                });
                if (res.ok) {
                    if (activeChatId === otherUserId) {
                        setMessages([]);
                    }
                }
            } catch (err) {
                console.error("Failed to clear chat history:", err);
            }
        }
    }, [session?.user?.accessToken, activeChatId]);

    const blockUser = useCallback(async (targetUserId: string) => {
        if (session?.user?.accessToken) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/block/${targetUserId}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.user.accessToken}` },
                });
                if (res.ok) {
                    setChatUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, isBlockedByMe: true } : u));
                    toast.success("User blocked");
                }
            } catch (err) {
                console.error("Failed to block user:", err);
            }
        }
    }, [session?.user?.accessToken]);

    const unblockUser = useCallback(async (targetUserId: string) => {
        if (session?.user?.accessToken) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/block/${targetUserId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${session.user.accessToken}` },
                });
                if (res.ok) {
                    setChatUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, isBlockedByMe: false } : u));
                    toast.success("User unblocked");
                }
            } catch (err) {
                console.error("Failed to unblock user:", err);
            }
        }
    }, [session?.user?.accessToken]);

    return (
        <ChatContext.Provider value={{
            onlineUsers,
            typingUsers,
            messages,
            chatUsers,
            activeChatId,
            setActiveChatId,
            isDrawerOpen,
            setIsDrawerOpen,
            openChatWithUser,
            sendMessage,
            markAsRead,
            setTyping,
            deleteMessages,
            clearHistory,
            blockUser,
            unblockUser
        }}>
            {children}
        </ChatContext.Provider>
    );
};
