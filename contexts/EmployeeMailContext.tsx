"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";

interface Employee {
    id: string;
    fullName: string | null;
    email: string;
    roles: string[];
    profilePicture: string | null;
}

interface MailFolder {
    id: string;
    displayName: string;
    unreadItemCount: number;
    totalItemCount: number;
}

interface MailMessage {
    id: string;
    subject: string;
    from: { emailAddress: { name: string; address: string } };
    receivedDateTime: string;
    hasAttachments: boolean;
    importance: string;
    isRead: boolean;
    bodyPreview: string;
    body?: { content: string; contentType: string };
}

interface EmployeeMailContextType {
    employees: Employee[];
    selectedEmployee: Employee | null;
    setSelectedEmployee: (emp: Employee | null) => void;
    folders: MailFolder[];
    activeFolderId: string;
    setActiveFolderId: (id: string) => void;
    messages: MailMessage[];
    activeMessage: MailMessage | null;
    setActiveMessage: (msg: MailMessage | null) => void;
    loading: boolean;
    hasMore: boolean;
    refreshMessages: () => Promise<void>;
    loadMoreMessages: () => Promise<void>;
    sendEmail: (payload: any) => Promise<boolean>;
}

const EmployeeMailContext = createContext<EmployeeMailContextType | undefined>(undefined);

export function EmployeeMailProvider({ children }: { children: ReactNode }) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [folders, setFolders] = useState<MailFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string>("inbox");
    const [messages, setMessages] = useState<MailMessage[]>([]);
    const [activeMessage, setActiveMessage] = useState<MailMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Fetch employee list on mount
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await apiClient("employee-mail/employees");
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                }
            } catch (error) {
                console.error("Error fetching employees for mail reader:", error);
            }
        };
        fetchEmployees();
    }, []);

    // Fetch folders when employee changes
    useEffect(() => {
        if (!selectedEmployee) {
            setFolders([]);
            setMessages([]);
            return;
        }

        const fetchFolders = async () => {
            try {
                const res = await apiClient(`employee-mail/folders?email=${selectedEmployee.email}`);
                if (res.ok) {
                    const data = await res.json();
                    setFolders(data);
                }
            } catch (error) {
                console.error("Error fetching folders:", error);
            }
        };

        fetchFolders();
    }, [selectedEmployee]);

    // Fetch messages when employee or folder changes
    useEffect(() => {
        if (!selectedEmployee) return;
        setSkip(0); // Reset pagination
        refreshMessages(true);
    }, [selectedEmployee, activeFolderId]);

    const refreshMessages = async (reset: boolean = false) => {
        if (!selectedEmployee) return;
        setLoading(true);
        const currentSkip = reset ? 0 : skip;
        try {
            const res = await apiClient(`employee-mail/messages?email=${selectedEmployee.email}&folderId=${activeFolderId}&top=${PAGE_SIZE}&skip=${currentSkip}`);
            if (res.ok) {
                const data = await res.json();
                if (reset) {
                    setMessages(data);
                    setSkip(PAGE_SIZE);
                } else {
                    setMessages(prev => [...prev, ...data]);
                    setSkip(prev => prev + PAGE_SIZE);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error("Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    const loadMoreMessages = async () => {
        if (loading || !hasMore) return;
        await refreshMessages(false);
    };

    // Fetch full message detail when active message changes
    useEffect(() => {
        if (!selectedEmployee || !activeMessage || activeMessage.body) return;

        const fetchDetail = async () => {
            try {
                const res = await apiClient(`employee-mail/messages/${activeMessage.id}?email=${selectedEmployee.email}`);
                if (res.ok) {
                    const data = await res.json();
                    setActiveMessage(data);
                }
            } catch (error) {
                console.error("Error fetching message detail:", error);
            }
        };
        fetchDetail();
    }, [activeMessage?.id, selectedEmployee?.email]);

    const sendEmail = async (payload: any) => {
        if (!selectedEmployee) return false;
        try {
            const res = await apiClient(`employee-mail/send?email=${selectedEmployee.email}`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success("Email sent successfully");
                return true;
            } else {
                toast.error("Failed to send email");
                return false;
            }
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Error sending email");
            return false;
        }
    };

    return (
        <EmployeeMailContext.Provider
            value={{
                employees,
                selectedEmployee,
                setSelectedEmployee,
                folders,
                activeFolderId,
                setActiveFolderId,
                messages,
                activeMessage,
                setActiveMessage,
                loading,
                hasMore,
                refreshMessages: () => refreshMessages(true),
                loadMoreMessages,
                sendEmail,
            }}
        >
            {children}
        </EmployeeMailContext.Provider>
    );
}

export function useEmployeeMail() {
    const context = useContext(EmployeeMailContext);
    if (context === undefined) {
        throw new Error("useEmployeeMail must be used within an EmployeeMailProvider");
    }
    return context;
}
