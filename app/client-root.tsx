"use client";

import { AppSidebar } from "@/components/app-sidebar";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import ThemeCustomizer from "@/components/theme-customizer/theme-customizer";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "@/contexts/SocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import NotificationListener from "@/components/realtime/NotificationListener";
import AppreciationOverlay from "@/components/announcements/AppreciationOverlay";
import FloatingAiAssistant from "@/components/shared/FloatingAiAssistant";
import { cn } from "@/lib/utils";

export function ClientRoot({
  defaultOpen,
  isApproved,
  children,
}: {
  defaultOpen: boolean;
  isApproved: boolean;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SocketProvider>
        <NotificationProvider>
          <ChatProvider>
            {isApproved && <AppreciationOverlay />}
            <SidebarProvider defaultOpen={defaultOpen}>
              {isApproved && <NotificationListener />}
              {isApproved && <AppSidebar />}
              
              <SidebarInset className="grow-[1] min-w-0 flex flex-col min-h-svh bg-neutral-100 dark:bg-[#1e2734]">
                {isApproved && <Header />}
                
                <div className={cn(
                  "dashboard-body flex-1 min-w-0 overflow-x-clip",
                  isApproved ? "md:p-6 p-4" : "flex items-center justify-center min-h-[80vh]"
                )}>
                  {children}
                </div>
                
                {isApproved && <Footer />}
              </SidebarInset>

              {isApproved && <ThemeCustomizer />}
              {isApproved && <FloatingAiAssistant />}
              <Toaster position="top-center" reverseOrder={false} />
            </SidebarProvider>
          </ChatProvider>
        </NotificationProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
