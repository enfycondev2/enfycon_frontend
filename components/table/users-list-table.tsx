"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Mail, ChevronRight, Search, ShieldCheck, Settings2, Loader2, Users, UserPlus, Activity } from "lucide-react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
    requestedRole: string | null;
    isApproved: boolean;
    createdAt: string;
    lastOnline: string | null;
    profilePicture: string | null;
};

interface UsersListTableProps {
    searchQuery: string;
    statusFilter: string;
    roleFilter: string;
}

/**
 * Statistics Card Component for the Overview Banner
 */
const StatCard = ({ title, value, icon: Icon, color, description, pulse }: {
    title: string;
    value: number;
    icon: any;
    color: "blue" | "emerald" | "amber";
    description: string;
    pulse?: boolean;
}) => {
    const colors = {
        blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-100",
        emerald: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-100",
        amber: "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-100",
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all duration-300">
            <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 relative",
                colors[color]
            )}>
                <Icon className="w-7 h-7" />
                {pulse && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-sm" />
                )}
            </div>
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-3xl font-black text-neutral-800 dark:text-white leading-none">{value}</h4>
                    <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-medium">{description}</p>
                </div>
            </div>
        </div>
    );
};

export default function UserTable({ searchQuery, statusFilter, roleFilter }: UsersListTableProps) {
    const { data: session } = useSession();
    const { socket } = useSocket();
    const [users, setUsers] = useState<User[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        socket.emit("get_online_users");

        const handleOnlineUsersList = (ids: string[]) => setOnlineUsers(new Set(ids));
        const handleUserStatus = (data: { userId: string; status: 'online' | 'offline' }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (data.status === 'online') newSet.add(data.userId);
                else newSet.delete(data.userId);
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

    useEffect(() => { fetchUsers(); }, []);

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
        } catch (error) { toast.error("Failed to update user status"); }
        finally { setUpdatingId(null); }
    };

    const handleApprove = async (id: string) => {
        try {
            setUpdatingId(id);
            const res = await apiClient(`/auth/admin/users/${id}/approve`, { method: "PATCH" });
            if (!res.ok) throw new Error("Failed");
            toast.success("User approved!");
            fetchUsers();
        } catch { toast.error("Failed"); }
        finally { setUpdatingId(null); }
    };

    const handleReject = async (id: string) => {
        try {
            setUpdatingId(id);
            const res = await apiClient(`/auth/admin/users/${id}/reject`, { method: "PATCH" });
            if (!res.ok) throw new Error("Failed");
            toast.success("Registration rejected");
            fetchUsers();
        } catch { toast.error("Failed"); }
        finally { setUpdatingId(null); }
    };

    const handleUpdateRoles = async (id: string, roles: string[]) => {
        try {
            setUpdatingId(id);
            const res = await apiClient(`/auth/admin/users/${id}/manage-roles`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roles }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Roles updated");
            fetchUsers();
        } catch { toast.error("Failed to update roles"); }
        finally { setUpdatingId(null); }
    };

    // Calculate Summary Stats
    const totalUsers = users.length;
    const activeNow = onlineUsers.size;
    const awaitingApproval = users.filter(u => !u.isApproved).length;

    const filteredUsers = users.filter((user) => {
        const matchesSearch = !searchQuery || (user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) || (user.email.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === "Status" || (statusFilter === "Active" && user.isActive) || (statusFilter === "Inactive" && !user.isActive);
        const profRoles = ['ADMIN', 'RECRUITER', 'DELIVERY_HEAD', 'ACCOUNT_MANAGER'];
        const hasProf = user.roles.some(r => profRoles.includes(r.toUpperCase().replace(/\s+|-/g, '_')));
        const matchesRole = roleFilter === "ALL" || (roleFilter === "NEW" && !hasProf) || user.roles.some(r => r.toUpperCase().replace(/\s+|-/g, '_') === roleFilter.toUpperCase().replace(/\s+|-/g, '_'));
        return matchesSearch && matchesStatus && matchesRole;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getRoleColor = (role: string) => {
        const r = role.toUpperCase().replace(/\s+|-/g, '_');
        if (r === 'ADMIN') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        if (r === 'DELIVERY_HEAD') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        if (r === 'ACCOUNT_MANAGER') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        if (r === 'RECRUITER') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-[5px] border-primary/10 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xl font-black text-neutral-800 dark:text-white uppercase tracking-wider">Synchronizing Data</p>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 animate-pulse mt-1">Retrieving latest personnel activity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-10">
            {/* Statistics Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Personnel" 
                    value={totalUsers} 
                    icon={Users} 
                    color="blue" 
                    description="Verified identities"
                />
                <StatCard 
                    title="Active Now" 
                    value={activeNow} 
                    icon={Activity} 
                    color="emerald" 
                    description="Real-time connectivity"
                    pulse
                />
                <StatCard 
                    title="Awaiting Approval" 
                    value={awaitingApproval} 
                    icon={UserPlus} 
                    color="amber" 
                    description="Pending onboarding"
                />
            </div>

            <div className="w-full bg-white dark:bg-slate-900 rounded-[3rem] border border-neutral-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-neutral-200/40 dark:shadow-none">
                <div className="min-w-[1100px]">
                    <div className="grid grid-cols-12 bg-neutral-50/50 dark:bg-slate-800/40 border-b border-neutral-100 dark:border-slate-800/60 py-6 px-8 items-center text-center">
                        <div className="col-span-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Personnel Identity</div>
                        <div className="col-span-3 text-left text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Professional Designations</div>
                        <div className="col-span-1 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Assign Role</div>
                        <div className="col-span-2 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Engagement</div>
                        <div className="col-span-2 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Last Active</div>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-slate-800/50">
                        {filteredUsers.length === 0 ? (
                            <div className="py-24 text-center">
                                <Search className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-neutral-800">No Personnel Found</h3>
                                <p className="text-neutral-500 text-sm">Adjust your filters to see more team members.</p>
                            </div>
                        ) : filteredUsers.map((user) => {
                            const isOnline = onlineUsers.has(user.keycloakId);
                            const isMe = user.id === session?.user?.id;
                            
                            return (
                                <div key={user.id} className="grid grid-cols-12 px-8 py-5 items-center hover:bg-neutral-50/40 dark:hover:bg-slate-800/20 transition-all duration-300 group">
                                    {/* Identity */}
                                    <div className="col-span-4 flex items-center gap-5">
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 rounded-[1.25rem] overflow-hidden shadow-sm bg-neutral-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 transition-transform group-hover:scale-105">
                                                {user.profilePicture ? (
                                                    <Image src={user.profilePicture} alt={user.fullName || ""} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-black text-sm text-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                                                        {(user.fullName || user.email).substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-black text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors duration-300 text-[15px]">
                                                    {user.fullName || "Unverified Identity"}
                                                </h4>
                                                {isMe && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-md">You</span>}
                                                {!user.isApproved && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">Pending</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-neutral-400 dark:text-slate-500 text-[12px] font-medium">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Roles */}
                                    <div className="col-span-3 flex flex-wrap gap-2 pr-4">
                                        {user.roles
                                            .filter(role => {
                                                const r = role.toLowerCase().replace(/_/g, '-');
                                                const isSystemRole = [
                                                    'offline-access', 
                                                    'uma-authorization', 
                                                    'manage-account', 
                                                    'view-profile', 
                                                    'default-roles'
                                                ].some(sys => r.includes(sys));
                                                return !isSystemRole;
                                            })
                                            .length > 0 ? (
                                            user.roles
                                                .filter(role => {
                                                    const r = role.toLowerCase().replace(/_/g, '-');
                                                    const isSystemRole = [
                                                        'offline-access', 
                                                        'uma-authorization', 
                                                        'manage-account', 
                                                        'view-profile', 
                                                        'default-roles',
                                                        'fin-admin',
                                                        'tracker'
                                                    ].some(sys => r.includes(sys));
                                                    return !isSystemRole;
                                                })
                                                .map(role => (
                                                    <span key={role} className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all",
                                                        getRoleColor(role)
                                                    )}>
                                                        {role.replace(/_/g, " ")}
                                                    </span>
                                                ))
                                        ) : (
                                            <span className="text-[10px] font-bold text-neutral-300 italic uppercase tracking-tighter">Identity Verified</span>
                                        )}
                                        {user.requestedRole && !user.isApproved && (
                                            <div className="mt-2 flex items-center gap-2 w-full">
                                                <Button size="sm" onClick={() => handleApprove(user.id)} disabled={updatingId === user.id} className="h-7 px-3 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                                                    Approve {user.requestedRole}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleReject(user.id)} disabled={updatingId === user.id} className="h-7 px-3 text-[10px] font-black text-rose-500 hover:bg-rose-50 rounded-xl">
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        {!isMe && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        disabled={updatingId === user.id}
                                                        className="h-10 w-10 rounded-2xl bg-neutral-50 dark:bg-slate-800/80 hover:bg-primary/10 hover:text-primary border border-neutral-100 dark:border-slate-800 shadow-sm transition-all"
                                                    >
                                                        {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-5 rounded-[2rem] shadow-2xl border-neutral-100 dark:border-slate-800" align="end">
                                                    <RolePicker user={user} onSave={(next) => handleUpdateRoles(user.id, next)} isUpdating={updatingId === user.id} />
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>

                                    {/* Engagement / Status */}
                                    <div className="col-span-2 flex flex-col items-center gap-2">
                                        <Switch
                                            checked={user.isActive}
                                            onCheckedChange={() => toggleStatus(user.id, user.isActive)}
                                            disabled={updatingId === user.id || isMe}
                                            className="data-[state=checked]:bg-emerald-500 scale-110"
                                        />
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.2em]",
                                            user.isActive ? "text-emerald-500" : "text-neutral-300"
                                        )}>
                                            {user.isActive ? "Active Account" : "Access Disabled"}
                                        </span>
                                    </div>

                                    {/* Last Active Real-time Column */}
                                    <div className="col-span-2 flex flex-col items-center justify-center text-center">
                                        {isOnline ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30">
                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Live Now</span>
                                                </div>
                                                <span className="text-[9px] text-emerald-500/70 font-medium italic">Connected</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1.5 text-neutral-400 dark:text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[11px] font-bold tracking-tight">
                                                        {user.lastOnline ? formatDistanceToNow(new Date(user.lastOnline), { addSuffix: true }) : "Unknown Activity"}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-neutral-300 dark:text-slate-600 italic">Historical Session</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RolePicker({ user, onSave, isUpdating }: { user: any; onSave: (roles: string[]) => void; isUpdating: boolean }) {
    const list = ['Recruiter', 'Delivery Head', 'Account manager'];
    const [pending, setPending] = useState<string[]>(() => user.roles.filter((r: string) => list.some(g => g.toLowerCase() === r.toLowerCase().replace(/_/g, ' '))));

    const handleSave = () => {
        const others = user.roles.filter((r: string) => !list.some(g => g.toLowerCase() === r.toLowerCase().replace(/_/g, ' ')));
        onSave([...others, ...pending]);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-50 dark:border-slate-800">
                <Settings2 className="w-5 h-5 text-primary" />
                <span className="text-[12px] font-black uppercase tracking-widest text-neutral-800 dark:text-white">Professional Roles</span>
            </div>
            <div className="space-y-3">
                {list.map(role => (
                    <div key={role} className="flex items-center gap-3 group/item">
                        <Checkbox 
                            id={`role-${user.id}-${role}`} 
                            checked={pending.some(r => r.toLowerCase().replace(/_/g, ' ') === role.toLowerCase())} 
                            onCheckedChange={(c) => {
                                if (c) setPending(p => [...new Set([...p, role])]);
                                else setPending(p => p.filter(r => r.toLowerCase().replace(/_/g, ' ') !== role.toLowerCase()));
                            }}
                        />
                        <label htmlFor={`role-${user.id}-${role}`} className="text-xs font-black uppercase tracking-widest text-neutral-500 group-hover/item:text-primary cursor-pointer transition-colors leading-none">
                            {role}
                        </label>
                    </div>
                ))}
            </div>
            <Button className="w-full rounded-2xl h-10 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/30" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Permissions
            </Button>
        </div>
    );
}
