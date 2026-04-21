"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { cn } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

interface SidebarItem {
  title?: string;
  url?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
  label?: string;
}

export function NavMain({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const isCollapsed = useSidebarCollapsed();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const handleToggleGroup = (title: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenGroup(title);
    } else if (openGroup === title) {
      setOpenGroup(null);
    }
  };

  // Find the best matching URL
  const bestMatchUrl = useMemo(() => {
    let match = "";
    const effectivePath = from || pathname;

    items.forEach((item) => {
      if (item.url && (effectivePath === item.url || effectivePath.startsWith(item.url + "/"))) {
        if (item.url.length > match.length) {
          match = item.url;
        }
      }
      item.items?.forEach((subItem) => {
        if (effectivePath === subItem.url || effectivePath.startsWith(subItem.url + "/")) {
          if (subItem.url.length > match.length) {
            match = subItem.url;
          }
        }
      });
    });
    return match;
  }, [items, pathname, from]);

  return (
    <SidebarGroup className={`${isCollapsed ? "px-1.5" : ""}`}>
      <SidebarMenu>
        {items.map((item) => {
          const isGroupActive = item.items?.some(
            (subItem) => subItem.url === bestMatchUrl
          );

          if (item.items && item.items.length > 0) {
            const isOpen = openGroup === item.title || isGroupActive;

            return (
              <Collapsible
                key={item.title}
                asChild
                open={isOpen}
                onOpenChange={(open) => {
                  if (item.title) {
                    if (open) {
                      setOpenGroup(item.title);
                    } else if (openGroup === item.title) {
                      setOpenGroup(null);
                    }
                  }
                }}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => {
                        if (item.title) {
                          handleToggleGroup(item.title, !isOpen);
                        }
                      }}
                      tooltip={item.title}
                      className={cn(
                        "cursor-pointer w-full flex py-5.5 px-3 text-base text-[#4b5563] dark:text-white data-[state=open]:bg-primary data-[state=open]:text-white hover:data-[state=open]:bg-primary dark:hover:data-[state=open]:bg-primary hover:data-[state=open]:text-white hover:bg-primary/10 active:bg-primary/10 dark:hover:bg-slate-700",
                        isOpen
                          ? "bg-primary text-white hover:bg-primary hover:text-white dark:bg-primary dark:hover:bg-primary"
                          : ""
                      )}
                    >
                      {item.icon && <item.icon className="!w-4.5 !h-4.5" />}
                      <span>{item.title}</span>
                      <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="gap-0 mt-2 space-y-1">
                      {item.items.map((subItem) => {
                        const isSubActive = subItem.url === bestMatchUrl;
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "py-5.5 px-3 text-base text-[#4b5563] dark:text-white hover:bg-primary/10 active:bg-primary/10 dark:hover:bg-slate-700",
                                isSubActive
                                  ? "bg-primary/15 text-primary font-bold dark:bg-primary/30 dark:text-white"
                                  : ""
                              )}
                            >
                              <Link
                                href={subItem.url}
                                className="flex items-center gap-3.5"
                              >
                                {subItem.icon ? (
                                  <subItem.icon className="!w-4 !h-4" />
                                ) : (
                                  <span className="w-2 h-2 rounded-[50%] bg-primary"></span>
                                )}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          if (item.label) {
            return (
              <SidebarGroupLabel key={`label-${item.label}`}>
                {item.label}
              </SidebarGroupLabel>
            );
          }

          if (item.url && item.title) {
            const isMenuActive = item.url === bestMatchUrl;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={cn(
                    "cursor-pointer py-5.5 px-3 text-base text-[#4b5563] dark:text-white hover:bg-primary/10 active:bg-primary/10 dark:hover:bg-slate-700",
                    isMenuActive
                      ? "bg-primary hover:bg-primary text-white dark:hover:bg-primary hover:text-white"
                      : ""
                  )}
                >
                  <Link href={item.url} className="flex items-center gap-3 w-full h-full">
                    {item.icon && <item.icon className="!size-5 shrink-0" />}
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return null;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
