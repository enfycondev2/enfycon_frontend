import Logout from "@/components/auth/logout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import userImg from "@/public/assets/images/user.png";
import { ChevronDown, Mail, Settings, Sparkles, User, House, BriefcaseBusiness } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PodTeamMember = {
  id: string;
  fullName: string;
  email: string;
};

const ProfileDropdown = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [resolvedPodName, setResolvedPodName] = useState("");
  const [podTeamMembers, setPodTeamMembers] = useState<PodTeamMember[]>([]);
  const [isPodHeadVerified, setIsPodHeadVerified] = useState(false);
  const [isRoleResolved, setIsRoleResolved] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const rawRoles = [...(((session?.user as { roles?: string[] } | undefined)?.roles) || [])];
  if (isPodHeadVerified && !rawRoles.includes("POD_LEAD")) {
    rawRoles.push("POD_LEAD");
  }
  const validRoles = [
    "ADMIN",
    "POD_LEAD", "POD-LEAD",
    "ACCOUNT_MANAGER", "ACCOUNT-MANAGER",
    "RECRUITER",
    "DELIVERY_HEAD", "DELIVERY-HEAD"
  ];

  const displayRolesRaw = rawRoles
    .map((role) => role.toUpperCase())
    .filter((role) => validRoles.includes(role))
    .map((role) => role.replace(/-/g, "_"));
  const uniqueDisplayRoles = Array.from(new Set(displayRolesRaw));
  const selectedRolesBase = uniqueDisplayRoles;
  const hasPodLead = selectedRolesBase.includes("POD_LEAD");
  const hasRecruiter = selectedRolesBase.includes("RECRUITER");
  const hasDeliveryHead = selectedRolesBase.includes("DELIVERY_HEAD");
  const hasAccountManager = selectedRolesBase.includes("ACCOUNT_MANAGER");
  let urlRole = "";
  if (pathname?.startsWith("/account-manager") || pathname?.startsWith("/account_manager")) {
    urlRole = "ACCOUNT_MANAGER";
  } else if (pathname?.startsWith("/delivery-head") || pathname?.startsWith("/delivery_head")) {
    urlRole = "DELIVERY_HEAD";
  } else if (pathname?.startsWith("/recruiter")) {
    urlRole = "RECRUITER";
  } else if (pathname?.startsWith("/pod-lead") || pathname?.startsWith("/pod_lead")) {
    urlRole = "POD_LEAD";
  } else if (pathname?.startsWith("/admin")) {
    urlRole = "ADMIN";
  }

  const activeRole = urlRole && selectedRolesBase.includes(urlRole) ? urlRole : undefined;

  // If on the /recruiter/* path but the user also has POD_LEAD, show Pod Lead instead
  const effectiveActiveRole = (activeRole === "RECRUITER" && hasPodLead) ? "POD_LEAD" : activeRole;

  const switchableRoles = uniqueDisplayRoles.filter(role => role !== effectiveActiveRole);
  const canSwitchDashboard = switchableRoles.length > 0;

  const selectedRoles = effectiveActiveRole
    ? [effectiveActiveRole]
    : (hasPodLead && hasRecruiter
      ? selectedRolesBase.filter((role) => role !== "RECRUITER")
      : selectedRolesBase);

  const formattedRoles = selectedRoles.map((role) =>
    role
      .replace(/[_:-]/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char: string) => char.toUpperCase())
  );

  const roleConfig: Record<string, { chip: string; banner: string; label: string; path: string; icon: any }> = {
    ADMIN: {
      chip: "text-fuchsia-700 dark:text-fuchsia-200 bg-fuchsia-50/80 dark:bg-fuchsia-950/30 border-fuchsia-100/60 dark:border-fuchsia-900/35",
      banner: "bg-fuchsia-50/90 dark:bg-fuchsia-950/35",
      label: "Admin",
      path: "/admin/dashboard",
      icon: House,
    },
    POD_LEAD: {
      chip: "text-indigo-700 dark:text-indigo-200 bg-indigo-50/80 dark:indigo-950/30 border-indigo-100/60 dark:border-indigo-900/35",
      banner: "bg-indigo-50/90 dark:bg-indigo-950/35",
      label: "Pod Lead",
      path: "/pod-lead/dashboard",
      icon: House,
    },
    ACCOUNT_MANAGER: {
      chip: "text-cyan-700 dark:text-cyan-200 bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-100/60 dark:border-cyan-900/35",
      banner: "bg-cyan-50/90 dark:bg-cyan-950/35",
      label: "Account Manager",
      path: "/account-manager/dashboard",
      icon: BriefcaseBusiness,
    },
    RECRUITER: {
      chip: "text-emerald-700 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100/60 dark:border-emerald-900/35",
      banner: "bg-emerald-50/90 dark:bg-emerald-950/35",
      label: "Recruiter",
      path: "/recruiter/dashboard",
      icon: House,
    },
    DELIVERY_HEAD: {
      chip: "text-amber-700 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/30 border-amber-100/60 dark:border-amber-900/35",
      banner: "bg-amber-50/90 dark:bg-amber-950/35",
      label: "Delivery Head",
      path: "/delivery-head/dashboard",
      icon: House,
    },
  };

  const neutralRoleColors = {
    chip: "text-slate-700 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-950/30 border-slate-100/60 dark:border-slate-900/35",
    banner: "bg-slate-50/90 dark:bg-slate-950/35",
  };

  const getRoleColors = (role?: string) => (role ? { chip: roleConfig[role]?.chip || neutralRoleColors.chip, banner: roleConfig[role]?.banner || neutralRoleColors.banner } : neutralRoleColors);

  const displayName = session?.user?.name?.trim() || "User";
  const sessionPodName =
    ((session?.user as { podName?: string | null } | undefined)?.podName || "").trim();
  const podName = useMemo(() => (sessionPodName || resolvedPodName).trim(), [sessionPodName, resolvedPodName]);
  const formattedRoleLabel = formattedRoles.join(" + ");
  const activePodName = hasDeliveryHead ? "" : podName;
  const roleAndPodLabel = formattedRoleLabel
    ? (activePodName ? `${formattedRoleLabel} • ${activePodName}` : formattedRoleLabel)
    : (activePodName || "No role assigned");
  const rolePrefix = selectedRoles[0]?.replace(/[_]/g, "-").toLowerCase();
  const profileUrl = rolePrefix ? `/${rolePrefix}/view-profile` : "/dashboard";

  useEffect(() => {
    let isMounted = true;

    const parsePodName = (payload: unknown): string => {
      if (!payload || typeof payload !== "object") return "";
      const data = payload as {
        name?: string;
        pod?: { name?: string };
        pods?: Array<{ name?: string }>;
        members?: Array<{ pod?: { name?: string } }>;
      };
      if (data.pod?.name) return data.pod.name.trim();
      if (data.name) return data.name.trim();
      if (Array.isArray(data.pods) && data.pods[0]?.name) return (data.pods[0].name || "").trim();
      if (Array.isArray(data.members) && data.members[0]?.pod?.name) return (data.members[0].pod?.name || "").trim();
      return "";
    };

    const parseTeamMembers = (payload: unknown): PodTeamMember[] => {
      if (!payload || typeof payload !== "object") return [];
      const data = payload as {
        podHead?: { id?: string; fullName?: string; email?: string };
        recruiters?: Array<{ id?: string; fullName?: string; email?: string }>;
      };
      const rows = [data.podHead, ...(Array.isArray(data.recruiters) ? data.recruiters : [])]
        .filter(Boolean)
        .map((member) => {
          const typed = member as { id?: string; fullName?: string; email?: string };
          return {
            id: typed.id || typed.email || typed.fullName || "",
            fullName: (typed.fullName || "").trim(),
            email: (typed.email || "").trim(),
          };
        })
        .filter((member) => member.id && (member.fullName || member.email));

      return Array.from(new Map(rows.map((member) => [member.id, member])).values());
    };

    const resolvePodName = async () => {
      try {
        const authMeRes = await apiClient("/auth/me");
        if (authMeRes.ok) {
          const authMeData = await authMeRes.json();
          if (authMeData.isPodHead && isMounted) {
            setIsPodHeadVerified(true);
          }
          if (authMeData.profilePicture && isMounted) {
            setProfilePicture(authMeData.profilePicture);
          }
          if (isMounted) setIsRoleResolved(true);
        }
      } catch { if (isMounted) setIsRoleResolved(true); }

      try {
        const myTeamRes = await apiClient("/pods/my-team");
        if (myTeamRes.ok) {
          const myTeamData: unknown = await myTeamRes.json();
          const teamPod = Array.isArray(myTeamData)
            ? (myTeamData[0] as { pod?: { name?: string }; name?: string } | undefined)
            : myTeamData;
          const teamPodName = parsePodName(teamPod);
          const teamMembers = parseTeamMembers(teamPod);
          if (isMounted) {
            setPodTeamMembers(teamMembers);
          }
          if (!sessionPodName && teamPodName && isMounted) {
            setResolvedPodName(teamPodName);
            return;
          }
        }
      } catch {
        // noop: we'll try next endpoint
      }

      try {
        const myPodsRes = await apiClient("/pods/my-pods");
        if (!myPodsRes.ok) return;
        const myPodsData: unknown = await myPodsRes.json();
        const fromArray = Array.isArray(myPodsData)
          ? ((myPodsData[0] as { name?: string } | undefined)?.name || "").trim()
          : parsePodName(myPodsData);
        if (!sessionPodName && fromArray && isMounted) setResolvedPodName(fromArray);
      } catch {
        // noop
      }
    };

    void resolvePodName();
    return () => {
      isMounted = false;
    };
  }, [sessionPodName]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-10 sm:h-11 rounded-full border border-slate-200/55 dark:border-slate-600/45 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 px-1.5 sm:pr-3 gap-2 focus-visible:ring-0 cursor-pointer data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-700/90"
          )}
        >
          <div className="relative">
            <img
              src={profilePicture || session?.user?.image || userImg.src}
              className="rounded-full size-7 sm:size-8 object-cover"
              width={40}
              height={40}
              alt={session?.user?.name ?? "User profile"}
            />
            <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-800" />
          </div>

          <div className="hidden md:flex flex-col items-start leading-tight max-w-[180px]">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate w-full">
              {displayName}
            </span>
            <span className="flex flex-wrap items-center gap-1 max-w-full">
              {activePodName ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border max-w-full text-sky-700 dark:text-sky-200 bg-sky-50/80 dark:bg-sky-950/30 border-sky-100/60 dark:border-sky-900/35">
                  <span className="shrink-0">#</span>
                  <span className="truncate">{activePodName}</span>
                </span>
              ) : null}
              {isRoleResolved ? formattedRoles.slice(0, 2).map((roleLabel, index) => (
                <span
                  key={roleLabel}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border max-w-full",
                    getRoleColors(selectedRoles[index]).chip
                  )}
                >
                  <Sparkles className="size-3 shrink-0" />
                  <span className="truncate">{roleLabel}</span>
                </span>
              )) : <span className="inline-block h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />}
            </span>
          </div>

          <ChevronDown className="hidden md:block size-4 text-slate-500 dark:text-slate-300" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="sm:w-[300px] min-w-[250px] right-[40px] absolute p-4 rounded-2xl overflow-hidden shadow-lg"
        side="bottom"
        align="end"
      >
        <div className={cn("py-3 px-4 rounded-lg flex items-center gap-3", getRoleColors(selectedRoles[0]).banner)}>
          <img
            src={profilePicture || session?.user?.image || userImg.src}
            className="rounded-full size-12 object-cover flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm"
            alt={displayName}
          />
          <div>
            <h6 className="text-lg text-neutral-900 dark:text-white font-semibold mb-0">
              {displayName}
            </h6>
            <span className="text-sm text-neutral-500 dark:text-neutral-300 capitalize">
              {roleAndPodLabel}
            </span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto scroll-sm pt-4">
          {podTeamMembers.length > 0 ? (
            <div className="mb-4 pb-3 border-b border-neutral-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300 mb-2">
                Pod Members
              </p>
              <div className="space-y-2">
                {podTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-lg border border-neutral-200 dark:border-slate-700 px-2.5 py-2 bg-neutral-50/70 dark:bg-slate-800/40"
                  >
                    <p className="text-sm font-medium text-neutral-900 dark:text-white leading-tight truncate">
                      {member.fullName || member.email}
                    </p>
                    {member.email ? (
                      <p className="text-xs text-neutral-500 dark:text-neutral-300 leading-tight truncate">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <ul className="flex flex-col gap-3">
            {canSwitchDashboard ? (
              <>
                <li className="pt-1 mt-1 -mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">Switch Dashboard</span>
                </li>
                {switchableRoles.map((role) => {
                  const config = roleConfig[role];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <li key={role}>
                      <Link
                        href={config.path}
                        className="text-black dark:text-white hover:text-primary dark:hover:text-primary flex items-center gap-3 w-full"
                      >
                        <Icon className="w-5 h-5" /> {config.label}
                      </Link>
                    </li>
                  );
                })}
                <li className="mb-1 border-b border-neutral-200 dark:border-slate-700"></li>
              </>
            ) : null}
            <li>
              <Link
                href={profileUrl}
                className="text-black dark:text-white hover:text-primary dark:hover:text-primary flex items-center gap-3"
              >
                <User className="w-5 h-5" /> My Profile
              </Link>
            </li>
            {/* <li>
              <Link
                href="/email"
                className="text-black dark:text-white hover:text-primary dark:hover:text-primary flex items-center gap-3"
              >
                <Mail className="w-5 h-5" /> Inbox
              </Link>
            </li> */}
            <li>
              <Link
                href="/company"
                className="text-black dark:text-white hover:text-primary dark:hover:text-primary flex items-center gap-3 w-full"
              >
                <Settings className="w-5 h-5" /> Settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-theme-customizer'))}
                className="text-black dark:text-white hover:text-primary dark:hover:text-primary flex items-center gap-3 w-full"
              >
                <Settings className="w-5 h-5" /> Theme Settings
              </button>
            </li>
            <li>
              <Logout />
            </li>
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
