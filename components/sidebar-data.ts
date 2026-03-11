import {
  BriefcaseBusiness,
  Boxes,
  ChartPie,
  ClipboardList,
  Component,
  House,
  MessageCircleMore,
  StickyNote,
  UsersRound,
  Mail,
  Bell
} from "lucide-react";

export const getSidebarData = (role: string) => {
  const adminNav = [
    {
      title: "Dashboard",
      url: "#",
      icon: House,
      isActive: true,
      items: [
        {
          title: "Home",
          url: "/admin/dashboard",
          icon: House,
        },
        {
          title: "All Jobs",
          url: "/admin/dashboard/jobs",
          icon: BriefcaseBusiness,
        },
        {
          title: "Pods",
          url: "/admin/dashboard/pods",
          icon: Boxes,
        },
        {
          title: "Account Manager",
          url: "/admin/dashboard/account-manager",
          icon: UsersRound,
        },
        {
          title: "Recruiter",
          url: "/admin/dashboard/recruiter",
          icon: UsersRound,
        },
        {
          title: "Login Media",
          url: "/admin/login-media",
          icon: MessageCircleMore,
        },
        {
          title: "Live Notifications",
          url: "/admin/dashboard/notifications",
          icon: Bell,
        },
      ],
    },{
       label: "Application",
    },
    {
      title: "Chat",
      url: "/admin/dashboard/chats",
      icon: MessageCircleMore,
    },
  ];

  const accountManagerNav = [
    {
      title: "Dashboard",
      url: "#",
      icon: House,
      isActive: true,
      items: [
        {
          title: "Dashboard Overview",
          url: "/account-manager/dashboard",
          icon: ChartPie,
        },
        {
          title: "Post a New Job",
          url: "/account-manager/dashboard/jobs/create",
          icon: StickyNote,
        },
        {
          title: "My Posted Jobs",
          url: "/account-manager/dashboard/jobs",
          icon: BriefcaseBusiness,
        },
        {
          title: "Submitted Jobs",
          url: "/account-manager/dashboard/jobs-submitted",
          icon: ClipboardList,
        },
      ],
    },
  ];

  const deliveryHeadNav = [
    {
      title: "Dashboard",
      url: "#",
      icon: House,
      isActive: true,
      items: [
        {
          title: "Home",
          url: "/delivery-head/dashboard",
          icon: House,
        },
        {
          title: "Jobs",
          url: "/delivery-head/dashboard/jobs",
          icon: BriefcaseBusiness,
        },
        {
          title: "Recruiters",
          url: "/delivery-head/dashboard/recruiters",
          icon: UsersRound,
        },
        {
          title: "Pods",
          url: "/delivery-head/dashboard/pods",
          icon: Boxes,
        },
        {
          title: "Account Manager",
          url: "/delivery-head/dashboard/account-manager",
          icon: UsersRound,
        },
      ],
    },
    {
      label: "Job Management",
    },
    {
      title: "Jobs",
      url: "#",
      icon: BriefcaseBusiness,
      isActive: true,
      items: [
        {
          title: "All Jobs",
          url: "/delivery-head/dashboard/jobs",
          icon: BriefcaseBusiness,
        },
        {
          title: "Submitted Jobs",
          url: "/delivery-head/dashboard/jobs-submitted",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Pod Management",
    },
    {
      title: "Pods",
      url: "#",
      icon: UsersRound,
      isActive: true,
      items: [
        {
          title: "All Pods",
          url: "/delivery-head/dashboard/pods",
          icon: Boxes,
        },
        {
          title: "Create Pod",
          url: "/delivery-head/dashboard/pods/create",
          icon: Component,
        },
      ],
    },
  ];

  const recruiterNav = [
    {
      title: "Dashboard",
      url: "#",
      icon: House,
      isActive: true,
      items: [
        {
          title: "Home",
          url: "/recruiter/dashboard",
          icon: House,
        },
        {
          title: "Assigned Jobs",
          url: "/recruiter/dashboard/jobs-assigned",
          icon: BriefcaseBusiness,
        },
        {
          title: "Submitted Jobs",
          url: "/recruiter/dashboard/jobs-submitted",
          icon: ClipboardList,
        },
        {
          title: "Jobs in my Pods",
          url: "/recruiter/dashboard/jobs",
          icon: Boxes,
        },
      ],
    },
  ];

  const podLeadNav = [
    {
      title: "Dashboard",
      url: "#",
      icon: House,
      isActive: true,
      items: [
        {
          title: "Home",
          url: "/recruiter/dashboard",
          icon: House,
        },
        {
          title: "Assigned Jobs",
          url: "/recruiter/dashboard/jobs-assigned",
          icon: BriefcaseBusiness,
        },
        {
          title: "Submitted Jobs",
          url: "/recruiter/dashboard/jobs-submitted",
          icon: ClipboardList,
        },
        {
          title: "Jobs in my Pods",
          url: "/recruiter/dashboard/jobs",
          icon: Boxes,
        },
      ],
    },
    {
      label: "POD Management",
    },
    {
      title: "My Pods",
      url: "#",
      icon: UsersRound,
      isActive: true,
      items: [
        {
          title: "Assigned Jobs",
          url: "/pod-lead/dashboard/pod-jobs",
          icon: BriefcaseBusiness,
        },
        {
          title: "Submitted Jobs",
          url: "/pod-lead/dashboard/pod-submissions",
          icon: ClipboardList,
        },
      ],
    },
  ];

  const roleUpper = role ? role.toUpperCase() : "";

  if (roleUpper === "ADMIN") {
    return { navMain: adminNav };
  } else if (roleUpper === "ACCOUNT_MANAGER" || roleUpper === "ACCOUNT-MANAGER") {
    return { navMain: accountManagerNav };
  } else if (roleUpper === "DELIVERY_HEAD" || roleUpper === "DELIVERY-HEAD") {
    return { navMain: deliveryHeadNav };
  } else if (roleUpper === "RECRUITER") {
    return { navMain: recruiterNav };
  } else if (roleUpper === "POD_LEAD" || roleUpper === "POD-LEAD") {
    return { navMain: podLeadNav };
  }

  return { navMain: [] };
};
