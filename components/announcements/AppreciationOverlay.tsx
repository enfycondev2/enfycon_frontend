"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { X, Heart, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";

interface AppreciationMessage {
    id: string;
    title: string;
    content: string;
    category: string;
    hasImage: boolean;
}

const Balloon = ({ color, delay, left }: { color: string; delay: number; left: string }) => (
    <motion.div
        initial={{ y: "100vh", x: 0, opacity: 0 }}
        animate={{ 
            y: "-20vh", 
            x: [0, 20, -20, 0],
            opacity: [0, 1, 1, 0] 
        }}
        transition={{ 
            y: { duration: 10, ease: "linear", delay },
            x: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
            opacity: { duration: 10, times: [0, 0.1, 0.8, 1], delay }
        }}
        className="absolute z-[9998] pointer-events-none"
        style={{ left }}
    >
        <div className={`w-12 h-16 rounded-[50%_50%_50%_50%_/_40%_40%_60%_60%] ${color} relative shadow-lg`}>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-inherit opacity-50" />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[1px] h-8 bg-black/20" />
        </div>
    </motion.div>
);

export default function AppreciationOverlay() {
    const [message, setMessage] = useState<AppreciationMessage | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [imgError, setImgError] = useState(false);
    const { socket } = useSocket();

    const getTheme = (cat?: string) => {
        const c = cat?.toUpperCase() || "CONGRATS";
        switch (c) {
            case "BIRTHDAY":
                return {
                    gradient: "from-orange-500 via-pink-500 to-rose-500",
                    btn: "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 shadow-rose-500/30",
                    text: "from-rose-500 to-orange-600",
                    buttonLabel: "Thanks, Team! 🎈",
                    showConfetti: true,
                    showBalloons: true
                };
            case "NOTICE":
                return {
                    gradient: "from-blue-600 via-indigo-600 to-cyan-500",
                    btn: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",
                    text: "from-blue-500 to-indigo-600",
                    buttonLabel: "Got it! 👍",
                    showConfetti: false,
                    showBalloons: false
                };
            case "MOTIVATION":
                return {
                    gradient: "from-purple-600 via-violet-600 to-indigo-500",
                    btn: "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-purple-500/30",
                    text: "from-purple-500 to-violet-600",
                    buttonLabel: "Let's Go! 🚀",
                    showConfetti: false,
                    showBalloons: false
                };
            default: // CONGRATS
                return {
                    gradient: "from-indigo-600 via-purple-600 to-pink-500",
                    btn: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30",
                    text: "from-indigo-500 to-purple-600",
                    buttonLabel: "Yay! 🎉",
                    showConfetti: true,
                    showBalloons: false
                };
        }
    };

    const theme = getTheme(message?.category);

    useEffect(() => {
        const handleManualShow = (e: any) => {
            const data = e.detail;
            if (data) {
                setMessage(data);
                setImgError(false);
                setIsVisible(true);
            }
        };
        
        // Socket listener for real-time broadcasts from admin only
        if (socket) {
            socket.on("new_appreciation", (data) => {
                console.log("[Socket] Received new appreciation:", data);
                if (data) {
                    setMessage(data);
                    setImgError(false);
                    setTimeout(() => setIsVisible(true), 500); 
                }
            });
        }
        
        window.addEventListener("show-appreciation", handleManualShow);

        return () => {
            window.removeEventListener("show-appreciation", handleManualShow);
            if (socket) {
                socket.off("new_appreciation");
            }
        };
    }, [socket]);

    useEffect(() => {
        if (isVisible && theme.showConfetti) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100000 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [isVisible, theme.showConfetti]);

    const handleClose = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!message) return;
        setIsVisible(false);
        try {
            await apiClient(`/announcements/read/${message.id}`, { method: "POST" });
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const imageUrl = message ? `${baseUrl}/announcements/image/${message.id}` : "";

    return (
        <AnimatePresence>
            {isVisible && message && (
                <div key="overlay-root" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
                        onClick={handleClose}
                    />

                    {/* Balloons */}
                    {theme.showBalloons && (
                        <div className="absolute inset-0 z-[100000] pointer-events-none">
                            <Balloon color="bg-red-500" delay={0} left="10%" />
                            <Balloon color="bg-blue-500" delay={2} left="80%" />
                            <Balloon color="bg-yellow-500" delay={4} left="30%" />
                            <Balloon color="bg-green-500" delay={1} left="60%" />
                            <Balloon color="bg-purple-500" delay={3} left="90%" />
                            <Balloon color="bg-orange-500" delay={5} left="40%" />
                        </div>
                    )}

                    {/* Card Container */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 100, rotateX: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.2 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-[#1a1f2e] rounded-[32px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/10 z-[100001] pointer-events-auto"
                    >
                        {/* Static/Image area */}
                        <div className={`relative h-64 w-full bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
                            {message.hasImage && !imgError ? (
                                <img 
                                    src={imageUrl} 
                                    className="w-full h-full object-cover"
                                    alt="Celebration"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 4 }}
                                    >
                                        <Heart className="w-32 h-32 text-white/50 fill-white/20" />
                                    </motion.div>
                                </div>
                            )}

                            <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="absolute top-8 left-8"
                            >
                                <PartyPopper className="w-12 h-12 text-white/40" />
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="p-10 pt-8 text-center relative">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.text} mb-4`}
                            >
                                {message.title}
                            </motion.h2>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-8"
                            >
                                {message.content}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Button 
                                    onClick={handleClose}
                                    className={`${theme.btn} text-white px-10 py-6 rounded-full text-lg font-bold shadow-lg transform transition-all active:scale-95 translate-y-0 hover:-translate-y-1 relative z-10 cursor-pointer`}
                                >
                                    {theme.buttonLabel}
                                </Button>
                            </motion.div>
                        </div>

                        {/* Close button top right */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white/80 hover:bg-black/40 transition-colors backdrop-blur-md z-20 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
);
}
