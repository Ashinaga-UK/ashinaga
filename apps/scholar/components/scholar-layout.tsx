'use client';

import { ThemeToggle } from '@workspace/ui';
import {
  CheckSquare,
  ChevronLeft,
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

const HOME_HREF = '/dashboard';

function getScholarSection(pathname: string) {
  return (
    NAV_ITEMS.find(
      (item) =>
        pathname === item.href || (item.href !== HOME_HREF && pathname.startsWith(`${item.href}/`))
    ) ?? NAV_ITEMS[0]
  );
}

function ScholarSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-ashinaga-teal-100 dark:border-sidebar-border">
      {isMobile ? (
        <div className="flex items-center border-b border-ashinaga-teal-100 px-2 py-1.5 dark:border-sidebar-border">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
            onClick={() => setOpenMobile(false)}
          >
            <ChevronLeft className="size-5" aria-hidden />
            Close
          </button>
        </div>
      ) : null}
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

function ScholarHeader() {
  const pathname = usePathname();
  const section = getScholarSection(pathname);
  const isHome = section.href === HOME_HREF;

  return (
    <header
      className="z-30 grid h-14 w-full shrink-0 items-center border-b border-ashinaga-teal-100 bg-background px-3 dark:border-sidebar-border sm:px-4 md:flex md:gap-2"
      style={{ gridTemplateColumns: '1fr auto 1fr' }}
    >
      <div className="flex items-center justify-start md:contents">
        {!isHome ? (
          <Link
            href={HOME_HREF}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label="Back to Overview"
          >
            <ChevronLeft className="size-5" aria-hidden />
            <span className="sr-only">Back to Overview</span>
          </Link>
        ) : null}
        <SidebarTrigger
          aria-label="Toggle sidebar"
          className={cn('shrink-0 md:order-2', !isHome && 'hidden md:inline-flex')}
        />
      </div>
      <div className="flex min-w-0 items-center justify-center md:order-1 md:justify-start">
        {!isHome ? (
          <h1 className="truncate text-center text-sm font-semibold text-foreground md:hidden">
            {section.label}
          </h1>
        ) : null}
        <Link
          href={HOME_HREF}
          className={cn(
            'min-w-0 items-center justify-center gap-2 md:justify-start',
            isHome ? 'flex' : 'hidden md:flex'
          )}
        >
          <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 md:flex">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="truncate text-center text-sm font-semibold text-foreground">
            Ashinaga Scholar Portal
          </h1>
        </Link>
      </div>
      <div className="flex items-center justify-end md:order-3 md:ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

export function ScholarLayout({ children, onLogout }: ScholarLayoutProps) {
  return (
    <SidebarProvider
      className="flex-col bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-background dark:to-background"
      style={{ '--sidebar-header-height': '3.5rem' } as React.CSSProperties}
    >
      <ScholarHeader />
      <div className="flex min-h-0 flex-1">
        <ScholarSidebar onLogout={onLogout} />
        <SidebarInset className="bg-transparent">
          <div className="flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
