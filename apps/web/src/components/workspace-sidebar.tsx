"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Anchor, Bell, Database, FileText, LogOut, MessageSquare, Radar, UserRound } from "lucide-react";
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
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/workspace", label: "Overview", icon: Radar },
  { href: "/workspace/sources", label: "Sources", icon: Database },
  { href: "/workspace/chat", label: "Chat", icon: MessageSquare },
  { href: "/workspace/automations", label: "Automations", icon: Bell },
  { href: "/workspace/runs", label: "Runs", icon: FileText },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/workspace" && pathname.startsWith(`${href}/`));
}

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Syntheci">
              <Link href="/workspace">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#1447e5] text-white">
                  <Anchor className="h-4 w-4" />
                </div>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Syntheci</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Maritime AI</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-12"
              disabled={isLoggingOut}
              onClick={logout}
              size="lg"
              tooltip="Log out"
              type="button"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <UserRound className="h-4 w-4" />
              </div>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">Demo Analyst</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {isLoggingOut ? "Logging out" : "analyst@syntheci.local"}
                </span>
              </span>
              <LogOut className="h-4 w-4 text-sidebar-foreground/60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
