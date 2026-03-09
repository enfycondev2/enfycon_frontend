"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Mail, MessageSquare } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MessageDropdown = () => {
  const { chatUsers, onlineUsers, typingUsers, setActiveChatId } = useChat();
  const router = useRouter();
  const pathname = usePathname();

  // Determine the base role path from the current URL (e.g., /admin, /delivery-head)
  const segments = pathname?.split("/") || [];
  const roleBase = segments.length > 1 ? segments[1] : "dashboard";
  const chatRoute = `/${roleBase}/dashboard/chats`;

  const handleUserClick = (userId: string) => {
    setActiveChatId(userId);
    router.push(chatRoute);
  };

  // We now respect the sorting from the backend (recent chats first)
  const sortedUsers = chatUsers;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "rounded-[50%] text-neutral-900 sm:w-10 sm:h-10 w-8 h-8 bg-gray-200/75 hover:bg-slate-200 focus-visible:ring-0 dark:bg-slate-700 dark:hover:bg-slate-600 border-0 cursor-pointer data-[state=open]:bg-gray-300 dark:data-[state=open]:bg-slate-600 relative"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {/* Example unread badge, could be wired up to actual unread messages later */}
          {/* <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-slate-800">
            2
          </span> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="sm:w-[350px] max-h-[unset] me-6 p-0 rounded-2xl overflow-hidden shadow-lg block border border-neutral-200 dark:border-slate-700">
        <div className="bg-white dark:bg-slate-800">
          <div className="py-3 px-4 rounded-lg bg-primary/10 dark:bg-primary/25 m-4 flex items-center justify-between gap-2">
            <h6 className="text-lg text-neutral-900 dark:text-white font-semibold mb-0">
              Messages
            </h6>
          </div>
          <div className="scroll-sm !border-t-0">
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-invisible hover:scrollbar-visible">
              {sortedUsers.length === 0 ? (
                <div className="py-10 px-4 text-center text-neutral-500 dark:text-neutral-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm italic">No users available to chat</p>
                </div>
              ) : (
                sortedUsers.map((u) => {
                  const isOnline = onlineUsers.has(u.keycloakId);
                  const isTyping = typingUsers.has(u.keycloakId);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleUserClick(u.id)}
                      className="flex px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 justify-start gap-4 border-b border-gray-100 dark:border-slate-700/50 last:border-0 transition-colors cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 shadow-sm border border-neutral-100 dark:border-slate-800">
                          <AvatarFallback className="bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs">
                            {u.fullName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-bold mb-0.5 text-neutral-900 dark:text-white truncate">
                          {u.fullName}
                        </h6>
                        <p className={cn(
                          "mb-0 text-xs truncate",
                          isTyping ? "text-primary animate-pulse font-medium" : "text-neutral-500 dark:text-neutral-400"
                        )}>
                          {isTyping ? "typing..." : u.email}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-center py-3 px-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => router.push(chatRoute)}
                className="text-primary dark:text-primary font-semibold hover:underline text-xs cursor-pointer w-full text-center bg-transparent border-0"
              >
                View All Chats
              </button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageDropdown;