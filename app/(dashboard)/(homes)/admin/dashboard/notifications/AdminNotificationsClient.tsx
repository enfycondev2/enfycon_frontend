'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Bell, Loader2, RefreshCw } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';

interface NotificationUser {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
}

interface InitiatorUser {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    isRead: boolean;
    createdAt: string;
    initiatorId?: string;
    user?: NotificationUser; // The recipient
    initiator?: InitiatorUser; // The sender
}

export default function AdminNotificationsClient() {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
    const { socket, isConnected } = useSocket();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotifications = useCallback(async (pageNum: number = 1, isRefresh = false) => {
        if (!token) return;
        try {
            if (!isRefresh) setIsLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/all?page=${pageNum}&limit=50`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data.data);
            setTotalPages(data.totalPages);
            setPage(data.page);
        } catch (error) {
            console.error('Error fetching admin notifications:', error);
            toast.error("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for real-time global admin notifications
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewAdminNotification = (newNotification: Notification) => {
            console.log("Received live admin notification:", newNotification);
            setNotifications(prev => [newNotification, ...prev]);
            toast.info(`New System Event: ${newNotification.title}`);
        };

        socket.on('admin_notification', handleNewAdminNotification);

        return () => {
            socket.off('admin_notification', handleNewAdminNotification);
        };
    }, [socket, isConnected]);

    const handleRefresh = () => {
        fetchNotifications(1, true);
    };

    const getBadgeVariant = (type: string) => {
        if (type.includes('JOB') || type === 'NEW_JOB') return 'default';
        if (type.includes('MESSAGE')) return 'secondary';
        if (type.includes('SUBMISSION')) return 'warning';
        return 'outline';
    };

    const formatRoles = (roles?: string[]) => {
        if (!roles || roles.length === 0) return '';
        const relevantRoles = ['ADMIN', 'DELIVERY_HEAD', 'POD_LEAD', 'ACCOUNT_MANAGER', 'RECRUITER'];
        const filtered = roles.filter(r => relevantRoles.includes(r));
        return filtered.join(', ');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live System Notifications</h2>
                    <p className="text-muted-foreground">
                        Monitor all notifications dispatched across the platform in real-time.
                    </p>
                </div>
                <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notification Feed
                        {isConnected ? (
                            <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                                Live
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
                                Disconnected
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Showing latest 50 global events (Page {page} of {totalPages || 1})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed border-border/50">
                            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground">No notifications found.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Time</TableHead>
                                        <TableHead>Sender</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="w-[300px]">Message</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notifications.map((notification) => (
                                        <TableRow key={notification.id}>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                {notification.initiator ? (
                                                    <>
                                                        <div className="font-medium">{notification.initiator.fullName || 'System'}</div>
                                                        <div className="text-xs text-muted-foreground">{notification.initiator.email}</div>
                                                        <div className="text-[10px] mt-1 text-primary">{formatRoles(notification.initiator.roles)}</div>
                                                    </>
                                                ) : (
                                                    <div className="font-medium text-muted-foreground">System Engine</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{notification.user?.fullName || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground">{notification.user?.email}</div>
                                                <div className="text-[10px] mt-1 text-primary">{formatRoles(notification.user?.roles)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(notification.type) as any}>
                                                    {notification.type.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {notification.title}
                                            </TableCell>
                                            <TableCell className="text-sm truncate max-w-xs" title={notification.message}>
                                                {notification.message}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {!isLoading && totalPages > 1 && (
                        <div className="flex justify-center mt-6 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => fetchNotifications(page - 1)}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground px-4">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => fetchNotifications(page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
