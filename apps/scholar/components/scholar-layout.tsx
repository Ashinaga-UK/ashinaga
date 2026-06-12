'use client';

import { CheckSquare, FileText, Home, LogOut, MessageSquare, Target, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

interface ScholarLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function ScholarLayout({ children, onLogout }: ScholarLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', href: '/dashboard', label: 'Overview', icon: Home },
    { id: 'profile', href: '/profile', label: 'My Profile', icon: User },
    { id: 'goals', href: '/goals', label: 'My LDF', icon: Target },
    { id: 'tasks', href: '/tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'requests', href: '/requests', label: 'My Requests', icon: FileText },
    { id: 'announcements', href: '/announcements', label: 'Announcements', icon: MessageSquare },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-ashinaga-teal-100 dark:border-sidebar-border py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600">
              <span className="text-white font-semibold text-sm">A</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <h1 className="truncate text-sm font-medium text-foreground">Ashinaga</h1>
              <p className="truncate text-[11px] text-muted-foreground">Scholar Portal</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-ashinaga-teal-100 dark:border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout} tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-background dark:to-background dark:bg-background w-full min-w-0">
        {/* Mobile header / Desktop trigger */}
        <header className="sticky top-0 z-40 w-full border-b border-ashinaga-teal-100 dark:border-sidebar-border bg-white/80 dark:bg-sidebar/80 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <div className="flex min-w-0 flex-col leading-tight md:hidden">
                <h1 className="truncate text-sm font-medium text-foreground">
                  Ashinaga Scholar Portal
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}
