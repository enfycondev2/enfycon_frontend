"use client";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { House } from 'lucide-react';
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";


interface BreadcrumbData {
    title: string,
    text: string,
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    DELIVERY_HEAD: "Delivery Head",
    "DELIVERY-HEAD": "Delivery Head",
    POD_LEAD: "Pod Lead",
    "POD-LEAD": "Pod Lead",
    ACCOUNT_MANAGER: "Account Manager",
    "ACCOUNT-MANAGER": "Account Manager",
    RECRUITER: "Recruiter",
    FIN_ADMIN: "Finance Admin",
    "FIN-ADMIN": "Finance Admin",
};

const ROLE_PATHS: Record<string, string> = {
    ADMIN: "/admin/dashboard",
    DELIVERY_HEAD: "/delivery-head/dashboard",
    "DELIVERY-HEAD": "/delivery-head/dashboard",
    POD_LEAD: "/pod-lead/dashboard",
    "POD-LEAD": "/pod-lead/dashboard",
    ACCOUNT_MANAGER: "/account-manager/dashboard",
    "ACCOUNT-MANAGER": "/account-manager/dashboard",
    RECRUITER: "/recruiter/dashboard",
    FIN_ADMIN: "/finance",
    "FIN-ADMIN": "/finance",
};

/** Normalise a raw role string to its canonical upper-snake form. */
const normalise = (role: string) => role.toUpperCase().replace(/-/g, "_");

const DashboardBreadcrumb = ({ title, text }: BreadcrumbData) => {
    const pathname = usePathname();
    const { data: session } = useSession();
    const rawRoles: string[] = (session?.user as any)?.roles || [];

    const normalisedRoles = rawRoles.map(normalise);

    const validRoles = Object.keys(ROLE_LABELS);

    // Try to match role based on current path
    let activeRole = normalisedRoles.find(r => {
        if (r === "FIN_ADMIN" && pathname?.includes("/finance")) return true;
        if (r === "ADMIN" && pathname?.includes("/admin")) return true;
        if (r === "RECRUITER" && pathname?.includes("/recruiter")) return true;
        if (r === "POD_LEAD" && (pathname?.includes("/pod-lead") || pathname?.includes("/pod_lead"))) return true;
        if (r === "ACCOUNT_MANAGER" && (pathname?.includes("/account-manager") || pathname?.includes("/account_manager"))) return true;
        if (r === "DELIVERY_HEAD" && (pathname?.includes("/delivery-head") || pathname?.includes("/delivery_head"))) return true;
        return false;
    });

    // Fallback if no path match
    if (!activeRole) {
        const isPodLeadRecruiter =
            normalisedRoles.includes("POD_LEAD") &&
            normalisedRoles.includes("RECRUITER");

        if (isPodLeadRecruiter) {
            activeRole = "POD_LEAD";
        } else {
            activeRole = normalisedRoles.find((r) => validRoles.includes(r)) ?? "ADMIN";
        }
    }

    const roleLabel = ROLE_LABELS[activeRole] ?? "Admin";

    return (
        <div className='flex flex-wrap items-center justify-between gap-2 mb-6'>
            <h6 className="text-2xl font-semibold">{title}</h6>
            <Breadcrumb>
                <BreadcrumbList>
                    {/* Role root crumb */}
                    <BreadcrumbItem>
                        <BreadcrumbLink
                            href={ROLE_PATHS[activeRole] || '/'}
                            className='flex items-center gap-2 font-medium text-base text-neutral-600 hover:text-primary dark:text-white dark:hover:text-primary'
                        >
                            <House size={16} />
                            {roleLabel}
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbSeparator />

                    {/* Dashboard crumb */}
                    <BreadcrumbItem>
                        <BreadcrumbLink
                            href={ROLE_PATHS[activeRole] || '/'}
                            className='font-medium text-base text-neutral-600 hover:text-primary dark:text-white dark:hover:text-primary'
                        >
                            Dashboard
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbSeparator />

                    {/* Current page crumb */}
                    <BreadcrumbItem className="text-base">
                        <BreadcrumbPage>{text}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
};

export default DashboardBreadcrumb;