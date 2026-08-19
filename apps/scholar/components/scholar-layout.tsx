'use client';

import {
  CheckSquare,
  ClipboardCheck,
  FileText,
  Home,
  Library,
  LogOut,
  MessageSquare,
  Target,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

interface ScholarLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', href: '/dashboard', label: 'Overview', icon: Home },
  { id: 'profile', href: '/profile', label: 'My Profile', icon: User },
  { id: 'goals', href: '/goals', label: 'My LDF', icon: Target },
  { id: 'annual-review', href: '/annual-review', label: 'My Annual Review', icon: ClipboardCheck },
  { id: 'tasks', href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'requests', href: '/requests', label: 'My Requests', icon: FileText },
  { id: 'announcements', href: '/announcements', label: 'Announcements', icon: MessageSquare },
  { id: 'resources', href: '/resources', label: 'Resources', icon: Library },
] as const;

function ScholarSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1 group-data-[collapsible=icon]:justify-center">
          <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600">
                    <span className="text-sm font-bold text-white">A</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Ashinaga</span>
                    <span className="truncate text-xs text-muted-foreground">Scholar Portal</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger aria-label="Toggle sidebar" className="shrink-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={onLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function ScholarLayout({ children, onLogout }: ScholarLayoutProps) {
  return (
    <SidebarProvider className="bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-background dark:to-background">
      <ScholarSidebar onLogout={onLogout} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-4">
          <SidebarTrigger aria-label="Toggle sidebar" className="md:hidden" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            Ashinaga Scholar Portal
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
