"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, MessageSquare, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import AiContentRenderer from "../chat/AiContentRenderer";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function FloatingAiAssistant() {
    const { data: session } = useSession();
    const { aiHistory, sendAiMessage } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isAdmin = session?.user?.roles?.includes("ADMIN");

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiHistory, isOpen]);

    if (!isAdmin) return null;

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const msg = inputValue.trim();
        setInputValue("");
        setIsTyping(true);
        await sendAiMessage(msg);
        setIsTyping(false);
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[400px] h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-800 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-primary text-white flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm leading-none">Enfy AI Bot</h3>
                                    <p className="text-[10px] opacity-80 mt-1">Smart Recruitment Assistant</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/10 rounded-full h-8 w-8"
                            >
                                <X size={18} />
                            </Button>
                        </div>

                        {/* Chat Body */}
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#f8fafc] dark:bg-slate-950/50"
                        >
                            {aiHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                                    <Bot size={48} className="mb-4 text-primary" />
                                    <p className="text-sm font-medium">Hello! I'm Enfy AI. How can I help you with the dashboard data today?</p>
                                    <p className="text-xs mt-2 italic">Example: "How many L1 cleared candidates do we have?"</p>
                                </div>
                            )}
                            
                            {aiHistory.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex flex-col max-w-[85%] gap-1",
                                        msg.role === 'user' ? "ms-auto items-end" : "me-auto items-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-3 rounded-2xl shadow-sm text-sm border",
                                            msg.role === 'user' 
                                                ? "bg-primary text-white rounded-br-none border-primary" 
                                                : "bg-white dark:bg-slate-800 text-neutral-900 dark:text-white rounded-bl-none border-neutral-100 dark:border-slate-700 w-full"
                                        )}
                                    >
                                        <AiContentRenderer content={msg.content} isMe={msg.role === 'user'} />
                                    </div>
                                    <span className="text-[9px] opacity-40 px-1">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm animate-pulse border border-neutral-100 dark:border-slate-700 w-fit">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                </div>
                            )}
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-neutral-100 dark:border-slate-800 flex gap-2">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask Enfy something..."
                                className="rounded-xl bg-neutral-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-10"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!inputValue.trim() || isTyping}
                                className="rounded-xl h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
                            >
                                <Send size={18} />
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-colors relative",
                    isOpen 
                        ? "bg-neutral-800 dark:bg-slate-700 text-white" 
                        : "bg-primary text-white"
                )}
                style={{ 
                    boxShadow: '0 8px 32px -4px rgba(var(--primary-rgb), 0.4)'
                }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <Minimize2 size={24} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="open"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <Bot size={28} />
                            <span className="text-[8px] font-bold mt-0.5 tracking-tighter">ENFY AI</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                    >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </motion.div>
                )}
            </motion.button>
        </div>
    );
}
