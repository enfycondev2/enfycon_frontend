"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Mail, ChevronRight, Search } from "lucide-react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import { useSocket } from "@/contexts/SocketContext";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    keycloakId: string;
    fullName: string | null;
    email: string;
    isActive: boolean;
    roles: string[];
    createdAt: string;
    profilePicture: string | null;
};

interface UsersListTableProps {
    searchQuery: string;
    statusFilter: string;
    roleFilter: string;
}

export default function UserTable({ searchQuery, statusFilter, roleFilter }: UsersListTableProps) {
    const { data: session } = useSession();
    const { socket } = useSocket();
    const [users, setUsers] = useState<User[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Socket online status listeners
    useEffect(() => {
        if (!socket) return;

        // 1. Initial request for all online users
        socket.emit("get_online_users");

        // 2. Listen for the initial list
        const handleOnlineUsersList = (ids: string[]) => {
            setOnlineUsers(new Set(ids));
        };

        // 3. Listen for status changes (online/offline)
        const handleUserStatus = (data: { userId: string; status: 'online' | 'offline' }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (data.status === 'online') {
                    newSet.add(data.userId);
                } else {
                    newSet.delete(data.userId);
                }
                return newSet;
            });
        };

        socket.on("online_users_list", handleOnlineUsersList);
        socket.on("user_status", handleUserStatus);

        return () => {
            socket.off("online_users_list", handleOnlineUsersList);
            socket.off("user_status", handleUserStatus);
        };
    }, [socket]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiClient("/auth/users");
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            setUpdatingId(id);
            const res = await apiClient(`/auth/admin/users/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
            toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            console.error("Error updating user status:", error);
            toast.error("Failed to update user status");
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch = 
            !searchQuery || 
            (user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (user.email.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = 
            statusFilter === "Status" || 
            (statusFilter === "Active" && user.isActive) ||
            (statusFilter === "Inactive" && !user.isActive);

        const matchesRole = 
            roleFilter === "ALL" || 
            user.roles.some(role => role.toUpperCase() === roleFilter.toUpperCase());

        return matchesSearch && matchesStatus && matchesRole;
    });

    const getRoleColor = (role: string) => {
        const r = role.toUpperCase();
        if (r.includes('ADMIN')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        if (r.includes('DELIVERY_HEAD')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        if (r.includes('ACCOUNT_MANAGER')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        if (r.includes('RECRUITER')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-primary/10 rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-neutral-800 dark:text-white">Synchronizing Personnel</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400 animate-pulse mt-0.5">Fetching latest team data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {filteredUsers.length === 0 ? (
                <div className="py-16 text-center bg-neutral-50/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-slate-800">
                    <div className="w-12 h-12 bg-neutral-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-neutral-400" />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-0.5">No matches found</h3>
                    <p className="text-neutral-500 dark:text-slate-400 max-w-xs mx-auto text-xs">
                        Adjust your filters or search keywords.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredUsers.map((user, index) => {
                        const isOnline = onlineUsers.has(user.keycloakId);
                        const isMe = user.id === session?.user?.id;
                        
                        return (
                            <div 
                                key={user.id} 
                                className={cn(
                                    "group relative p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl transition-all duration-300",
                                    "bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800/60 hover:border-primary/30 dark:hover:border-primary/30 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                                    !user.isActive && "opacity-75 grayscale-[0.3] bg-neutral-50 dark:bg-slate-950"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar Column */}
                                    <div className="relative shrink-0">
                                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-inner bg-neutral-100 dark:bg-slate-800">
                                            {user.profilePicture ? (
                                                <Image
                                                    src={user.profilePicture}
                                                    alt={user.fullName || user.email}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-base text-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
                                                    {(user.fullName || user.email).substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Presence Indicator */}
                                        <div className={cn(
                                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white dark:border-slate-900 flex items-center justify-center",
                                            isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                        )}>
                                            {isOnline && (
                                                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Identity info */}
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors duration-300 text-[15px]">
                                                {user.fullName || "Unverified Identity"}
                                            </h4>
                                            {isMe && (
                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter rounded-md">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-neutral-500 dark:text-slate-400 text-xs">
                                            <Mail className="w-3 h-3" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Column: Roles & Meta */}
                                <div className="flex flex-wrap items-center gap-3 sm:flex-[2] justify-start sm:justify-center">
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.roles
                                            .filter(role => [
                                                'ADMIN',
                                                'RECRUITER',
                                                'DELIVERY_HEAD',
                                                'ACCOUNT_MANAGER',
                                                'POD_LEAD',
                                                'POD-LEAD'
                                            ].includes(role.toUpperCase()))
                                            .map(role => (
                                                <span key={role} className={cn(
                                                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-300",
                                                    getRoleColor(role)
                                                )}>
                                                    {role.replace(/_/g, " ").replace(/-/g, " ")}
                                                </span>
                                            ))}
                                    </div>
                                    
                                    <div className="hidden xl:flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50 dark:bg-slate-800/40 px-2 py-1 rounded-lg border border-neutral-100 dark:border-slate-800">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>{format(new Date(user.createdAt), "MMM yyyy")}</span>
                                    </div>
                                </div>

                                {/* Action Column */}
                                <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-44 pl-3 border-l border-neutral-100 dark:border-slate-800/80">
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.15em] mb-1",
                                            user.isActive ? "text-emerald-500" : "text-neutral-400"
                                        )}>
                                            {user.isActive ? "Authorized" : "Revoked"}
                                        </span>
                                        <Switch
                                            checked={user.isActive}
                                            onCheckedChange={() => toggleStatus(user.id, user.isActive)}
                                            disabled={updatingId === user.id || isMe}
                                            className="data-[state=checked]:bg-emerald-500 h-5 w-9 shadow-inner scale-90"
                                        />
                                    </div>
                                    
                                    <Button variant="ghost" size="icon" className="h-8 w-8 min-w-8 rounded-xl bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 duration-300">
                                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
