"use client";

import { useEmployeeMail } from "@/contexts/EmployeeMailContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Mail, Paperclip, Star, Loader2, ArrowLeft } from "lucide-react";

const EmployeeMailList = () => {
  const { messages, activeMessage, setActiveMessage, loading, selectedEmployee, loadMoreMessages, hasMore } = useEmployeeMail();

  if (!selectedEmployee) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl m-4 shadow-inner">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <Mail className="w-12 h-12 text-primary/30" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Select an Account</h3>
        <p className="max-w-[300px] text-center text-sm">Choose an employee from the sidebar to view their communications</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl m-4 overflow-hidden border border-white/20 dark:border-slate-800/50 shadow-xl shadow-slate-200/50 dark:shadow-none">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30">
                <Mail className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Messages</h2>
                <p className="text-xs text-slate-500 font-medium">Viewing {selectedEmployee.fullName || selectedEmployee.email}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {loading && messages.length === 0 && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600">
                {messages.length} Items
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <p className="text-sm font-medium animate-pulse">Fetching encrypted data...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 opacity-50">
            <Mail className="w-16 h-16 stroke-[1px]" />
            <p className="text-sm">This mailbox is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setActiveMessage(msg)}
                className={cn(
                  "flex flex-col p-4 rounded-2xl text-left transition-all duration-300 group border border-transparent",
                  activeMessage?.id === msg.id
                    ? "bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-100 dark:border-slate-700 ring-2 ring-primary/5"
                    : "hover:bg-white/60 dark:hover:bg-slate-800/40 hover:shadow-md"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!msg.isRead && (
                      <span className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/10 shadow-lg shadow-primary/20" />
                    )}
                    <span className={cn(
                        "text-sm truncate",
                        !msg.isRead ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-600 dark:text-slate-400"
                    )}>
                      {msg.from.emailAddress.name || msg.from.emailAddress.address}
                    </span>
                  </div>
                  <span className="text-[10px] whitespace-nowrap font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    {format(new Date(msg.receivedDateTime), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className={cn(
                    "text-sm truncate leading-snug",
                    !msg.isRead ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
                  )}>
                    {msg.subject || "(No Subject)"}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed opacity-70">
                    {msg.bodyPreview}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0">
                     {msg.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-400" />}
                     {msg.importance === 'high' && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter ring-1 ring-red-100 px-1.5 rounded">High Priority</span>}
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="p-4 mt-2 mb-4 flex justify-center border-t border-slate-50 dark:border-slate-800/50">
                <button
                  onClick={loadMoreMessages}
                  disabled={loading}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg hover:shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading older...</span>
                    </div>
                  ) : (
                    "Load More Messages"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeMailList;
