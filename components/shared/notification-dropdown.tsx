import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell, CircleCheck, Info, AlertTriangle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow, isValid } from "date-fns";

const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, getJobPath } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "NEW_JOB":
      case "JOB_ASSIGNMENT":
        return <Info className="text-primary" />;
      case "SUCCESS":
        return <CircleCheck className="text-green-500" />;
      case "WARNING":
        return <AlertTriangle className="text-yellow-500" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="text-primary" />;
      default:
        return <Bell className="text-gray-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "NEW_JOB":
      case "JOB_ASSIGNMENT":
        return "bg-blue-100 dark:bg-primary/25";
      case "SUCCESS":
        return "bg-green-100 dark:bg-green-600/25";
      case "WARNING":
        return "bg-yellow-100 dark:bg-yellow-600/25";
      case "NEW_MESSAGE":
        return "bg-primary/10 dark:bg-primary/25";
      default:
        return "bg-gray-100 dark:bg-gray-700";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "rounded-[50%] text-neutral-900 sm:w-10 sm:h-10 w-8 h-8 bg-gray-200/75 hover:bg-slate-200 focus-visible:ring-0 dark:bg-slate-700 dark:hover:bg-slate-600 border-0 cursor-pointer data-[state=open]:bg-gray-300 dark:data-[state=open]:bg-slate-600 relative"
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-slate-800">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="sm:w-[400px] max-h-[unset] me-6 p-0 rounded-2xl overflow-hidden shadow-lg block border border-neutral-200 dark:border-slate-700">
        <div className="bg-white dark:bg-slate-800">
          <div className="py-3 px-4 rounded-lg bg-primary/10 dark:bg-primary/25 m-4 flex items-center justify-between gap-2">
            <h6 className="text-lg text-neutral-900 dark:text-white font-semibold mb-0">
              Notifications
            </h6>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
              <span className="sm:w-8 sm:h-8 w-6 h-6 bg-white dark:bg-slate-800 text-primary dark:text-primary font-bold flex justify-center items-center rounded-full text-xs">
                {notifications.length}
              </span>
            </div>
          </div>
          <div className="scroll-sm !border-t-0">
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-invisible hover:scrollbar-visible">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center text-neutral-500 dark:text-neutral-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm italic">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.type === "NEW_MESSAGE" ? "/chat" : (n.data?.jobId ? getJobPath(n.data.jobId) : "#")}
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      "flex px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 justify-between gap-3 border-b border-gray-100 dark:border-slate-700/50 last:border-0 transition-colors",
                      !n.isRead && "bg-blue-50/30 dark:bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex-shrink-0 relative w-10 h-10 flex justify-center items-center rounded-full mt-1",
                        getIconBg(n.type)
                      )}>
                        {getIcon(n.type)}
                        {!n.isRead && (
                          <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800" />
                        )}
                      </div>
                      <div>
                        <h6 className={cn(
                          "text-sm mb-0.5",
                          !n.isRead ? "font-bold text-neutral-900 dark:text-white" : "font-medium text-neutral-600 dark:text-neutral-300"
                        )}>
                          {n.title}
                        </h6>
                        <p className="mb-0 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                        {(() => {
                          const date = new Date(n.timestamp);
                          return isValid(date)
                            ? formatDistanceToNow(date, { addSuffix: true })
                            : "Recently";
                        })()}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* {notifications.length > 0 && (
              <div className="text-center py-3 px-4 border-t border-gray-100 dark:border-slate-700">
                <Link
                  href="/notifications"
                  className="text-primary dark:text-primary font-semibold hover:underline text-xs"
                >
                  View All Notifications
                </Link>
              </div>
            )} */}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
