import EditProfileTabContent from "@/app/(dashboard)/[role]/view-profile/components/edit-profile-tab-content";
import ChangePasswordTabContent from "@/app/(dashboard)/[role]/view-profile/components/change-password-tab-content";
import NotificationPasswordTabContent from "@/app/(dashboard)/[role]/view-profile/components/notification-password-tab-content";
import ViewProfileSidebar from "@/app/(dashboard)/[role]/view-profile/components/view-profile-sidebar";
import TotpSetupTabContent from "@/app/(dashboard)/[role]/view-profile/components/totp-setup-tab-content";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Metadata } from "next";
import { serverApiClient } from "@/lib/serverApiClient";

const metadata: Metadata = {
    title: "View Profile & User Details | enfySync Admin Dashboard",
    description:
        "Access detailed user profiles and personal information in the enfySync Admin Dashboard built with Next.js and Tailwind CSS.",
};

const ViewProfile = async () => {
    let user = null;
    try {
        const response = await serverApiClient("/auth/me", { cache: 'no-store' });
        if (response.ok) {
            user = await response.json();
        }
    } catch (error) {
        console.error("Failed to fetch user profile", error);
    }

    return (
        <>
            <DashboardBreadcrumb title="View Profile" text="View Profile" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-4">
                    <ViewProfileSidebar user={user} />
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <Card className="card">
                        <CardContent className="px-0">
                            <Tabs defaultValue="editProfile" className="gap-4">
                                <TabsList className='active-gradient bg-transparent dark:bg-transparent rounded-none h-[50px] overflow-x-auto justify-start'>
                                    <TabsTrigger value="editProfile" className='py-2.5 px-4 font-semibold text-sm inline-flex items-center gap-3 dark:bg-transparent text-neutral-600 hover:text-primary dark:text-white dark:hover:text-blue-500 data-[state=active]:bg-gradient border-0 border-t-2 border-neutral-200 dark:border-neutral-500 data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-[0] data-[state=active]:shadow-none cursor-pointer'>
                                        Edit Profile
                                    </TabsTrigger>
                                    <TabsTrigger value="changePassword" className='py-2.5 px-4 font-semibold text-sm inline-flex items-center gap-3 dark:bg-transparent text-neutral-600 hover:text-primary dark:text-white dark:hover:text-blue-500 data-[state=active]:bg-gradient border-0 border-t-2 border-neutral-200 dark:border-neutral-500 data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-[0] data-[state=active]:shadow-none cursor-pointer'>
                                        Change Password
                                    </TabsTrigger>
                                    <TabsTrigger value="totp" className='py-2.5 px-4 font-semibold text-sm inline-flex items-center gap-3 dark:bg-transparent text-neutral-600 hover:text-primary dark:text-white dark:hover:text-blue-500 data-[state=active]:bg-gradient border-0 border-t-2 border-neutral-200 dark:border-neutral-500 data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-[0] data-[state=active]:shadow-none cursor-pointer whitespace-nowrap'>
                                        2FA Security
                                    </TabsTrigger>
                                    <TabsTrigger value="NotificationPassword" className='py-2.5 px-4 font-semibold text-sm inline-flex items-center gap-3 dark:bg-transparent text-neutral-600 hover:text-primary dark:text-white dark:hover:text-blue-500 data-[state=active]:bg-gradient border-0 border-t-2 border-neutral-200 dark:border-neutral-500 data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-[0] data-[state=active]:shadow-none cursor-pointer whitespace-nowrap'>
                                        Notification Settings
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="editProfile">
                                    <EditProfileTabContent user={user} />
                                </TabsContent>
                                <TabsContent value="changePassword">
                                    <ChangePasswordTabContent />
                                </TabsContent>
                                <TabsContent value="totp">
                                    <TotpSetupTabContent user={user} />
                                </TabsContent>
                                <TabsContent value="NotificationPassword">
                                    <NotificationPasswordTabContent />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                </div>
            </div>

        </>
    );
};
export default ViewProfile;
