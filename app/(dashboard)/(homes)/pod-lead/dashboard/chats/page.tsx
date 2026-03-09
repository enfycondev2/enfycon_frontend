"use client";

import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import LoadingSkeleton from "@/components/loading-skeleton";
import { Suspense } from "react";
import ChatBox from "@/app/(dashboard)/chat/components/chat-box";

const ChatsPage = () => {
    return (
        <>
            <DashboardBreadcrumb title="Chats" text="Chats" />
            <Suspense fallback={<LoadingSkeleton />}>
                <ChatBox />
            </Suspense>
        </>
    );
};

export default ChatsPage;
