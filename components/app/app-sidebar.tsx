"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { FileText, Inbox, LayoutDashboard, LogOut, MessageCircleQuestion, Settings, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/format";
import { useMe } from "./me-provider";
import { RoleBadge } from "./status-badge";
import { Wordmark } from "./wordmark";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { href: "/inbox", label: "Inbox", icon: Inbox, match: ["/inbox"] },
  { href: "/trends", label: "Trends", icon: TrendingUp, match: ["/trends", "/themes"] },
  { href: "/ask", label: "Ask LOOP", icon: MessageCircleQuestion, match: ["/ask"] },
  { href: "/reports", label: "Reports", icon: FileText, match: ["/reports"] },
  { href: "/settings", label: "Settings", icon: Settings, match: ["/settings"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { me, name, role, workspaceName, loading } = useMe();
  const { setOpenMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 pb-2 pt-6">
        <Link href="/dashboard" className="rounded-md" aria-label="LOOP dashboard" onClick={() => setOpenMobile(false)}>
          <Wordmark />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] uppercase tracking-[0.18em]">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Main">
              <SidebarMenu>
                {NAV.map((item) => {
                  const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} className="h-10 text-[0.92rem]">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-sidebar-border p-4">
        {loading && !me ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-violet/40">
              <AvatarFallback className="bg-violet/20 font-mono text-xs font-semibold text-lavender">
                {initials(name || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{workspaceName ?? "Workspace"}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {role ? <RoleBadge role={role} /> : <span />}
          <Button
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut({ callbackUrl: "/" });
            }}
          >
            {!signingOut && <LogOut aria-hidden="true" />}
            Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
