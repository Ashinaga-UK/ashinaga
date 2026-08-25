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
import { cn } from '../lib/utils';
import { ThemeToggle } from './theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
    <Sidebar collapsible="icon" className="border-ashinaga-teal-100 dark:border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        isActive &&
                          'bg-ashinaga-teal-50 text-ashinaga-teal-700 hover:bg-ashinaga-teal-100 dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/80'
                      )}
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
    <SidebarProvider
      className="flex-col bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-background dark:to-background"
      style={{ '--sidebar-header-height': '3.5rem' } as React.CSSProperties}
    >
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ashinaga-teal-100 bg-background px-3 dark:border-sidebar-border sm:px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="truncate text-sm font-semibold text-foreground">
            Ashinaga Scholar Portal
          </h1>
        </Link>
        <SidebarTrigger aria-label="Toggle sidebar" className="shrink-0" />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <ScholarSidebar onLogout={onLogout} />
        <SidebarInset className="bg-transparent">
          <div className="flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
