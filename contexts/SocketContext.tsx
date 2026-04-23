"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (session?.user?.keycloakId) {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            console.log("[Socket] Connecting to:", backendUrl);
            const socketInstance = io(backendUrl, {
                auth: {
                    userId: session.user.keycloakId,
                },
                transports: ["polling", "websocket"], // Standard optimization for reliability
                timeout: 5000, // Stop waiting after 5 seconds
                reconnectionAttempts: 3,
            });

            socketInstance.on("connect", () => {
                setIsConnected(true);
                console.log("[Socket] Connected");
            });

            socketInstance.on("disconnect", () => {
                setIsConnected(false);
                console.log("[Socket] Disconnected");
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
            };
        }
    }, [session?.user?.keycloakId]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
