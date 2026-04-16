"use client";

import { useEmployeeMail } from "@/contexts/EmployeeMailContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X, Reply, Forward, Trash2, Maximize2, User, Printer, Download, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const EmployeeMailViewer = () => {
  const { activeMessage, setActiveMessage, selectedEmployee } = useEmployeeMail();

  if (!activeMessage) {
    return (
      <div className="flex-[1.5] flex flex-col items-center justify-center p-8 text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl m-4 border border-white/20 dark:border-slate-800/50">
        <User className="w-16 h-16 stroke-[1px] mb-4 opacity-30" />
        <p className="text-sm font-medium">Select a message to preview its contents</p>
      </div>
    );
  }

  const isHtml = activeMessage.body?.contentType === "html";

  return (
    <div className="flex-[1.5] flex flex-col min-w-0 bg-white dark:bg-slate-950 rounded-3xl m-4 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 ring-1 ring-slate-200/50 dark:ring-slate-800/50">
      {/* Header Actions */}
      <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setActiveMessage(null)} className="xl:hidden">
                <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full"><Reply className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full"><Forward className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></Button>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400"><Printer className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-400"><Download className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-400"><Maximize2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Message Content */}
        <div className="p-8">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-8 leading-tight tracking-tight">
                {activeMessage.subject || "(No Subject)"}
            </h1>

            <div className="flex items-start justify-between mb-10 pb-8 border-b border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-4 ring-slate-50 dark:ring-slate-800">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {activeMessage.from.emailAddress.name?.[0] || activeMessage.from.emailAddress.address[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white">{activeMessage.from.emailAddress.name}</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">&lt;{activeMessage.from.emailAddress.address}&gt;</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium mt-1">
                            to: {selectedEmployee?.email}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
                        {format(new Date(activeMessage.receivedDateTime), "EEEE, MMM d, yyyy")}
                    </span>
                    <span className="text-[11px] font-medium text-slate-300">
                        {format(new Date(activeMessage.receivedDateTime), "h:mm a")} ({format(new Date(activeMessage.receivedDateTime), "O")})
                    </span>
                </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                {isHtml ? (
                    <div 
                        className="email-content-rendered reset-all-styles" 
                        dangerouslySetInnerHTML={{ __html: activeMessage.body?.content || "" }} 
                    />
                ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {activeMessage.body?.content || activeMessage.bodyPreview}
                    </pre>
                )}
            </div>
        </div>
      </div>

      {/* Quick Reply Placeholder */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-700 shadow-sm transition-focus-within focus-within:ring-2 focus-within:ring-primary/20">
                <Avatar className="h-8 w-8 ml-1">
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] uppercase font-bold">You</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm text-slate-400 font-medium">Click to reply as {selectedEmployee?.fullName || selectedEmployee?.email}...</div>
                <Button className="rounded-xl h-9 px-4 font-bold">Reply</Button>
            </div>
      </div>
    </div>
  );
};

export default EmployeeMailViewer;
