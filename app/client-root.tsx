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

export function ClientRoot({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
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
            <AppreciationOverlay />
            <SidebarProvider defaultOpen={defaultOpen}>
              <NotificationListener />
              <AppSidebar />
              <main className="dashboard-body-wrapper grow-[1] min-w-0 overflow-x-clip flex flex-col">
                <SidebarInset>
                  <Header />
                </SidebarInset>
                <div className="dashboard-body bg-neutral-100 dark:bg-[#1e2734] md:p-6 p-4 flex-1 min-w-0 overflow-x-clip">
                  {children}
                </div>
                <Footer />
              </main>
              <ThemeCustomizer />
              <FloatingAiAssistant />
              <Toaster position="top-center" reverseOrder={false} />
            </SidebarProvider>
          </ChatProvider>
        </NotificationProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
