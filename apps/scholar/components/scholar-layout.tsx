'use client';

import { ThemeToggle } from '@workspace/ui';
import {
  CheckSquare,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  Library,
  LogOut,
  MessageSquare,
  PenLine,
  Target,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScholarSessionProvider, useScholarSession } from '../lib/scholar-session';
import { cn } from '../lib/utils';
import { ScholarNotificationsBell } from './scholar-notifications-bell';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

type ProgramStage = 'prep_year' | 'scholar';

const NAV_GROUPS = [
  { id: 'overview', label: null },
  { id: 'programme', label: 'My programme' },
  { id: 'updates', label: 'Updates & help' },
  { id: 'profile', label: null },
] as const;

type NavGroupId = (typeof NAV_GROUPS)[number]['id'];

const NAV_ITEMS = [
  { id: 'dashboard', group: 'overview', href: '/dashboard', label: 'Overview', icon: Home },
  { id: 'tasks', group: 'programme', href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'requests', group: 'programme', href: '/requests', label: 'My Requests', icon: FileText },
  { id: 'goals', group: 'programme', href: '/goals', label: 'My LDF', icon: Target },
  {
    id: 'annual-review',
    group: 'programme',
    href: '/annual-review',
    label: 'My Annual Review',
    icon: ClipboardCheck,
  },
  {
    id: 'documents',
    group: 'programme',
    href: '/documents',
    label: 'My Documents',
    icon: FolderOpen,
  },
  { id: 'proposal', group: 'programme', href: '/proposal', label: 'My Proposal', icon: PenLine },
  {
    id: 'announcements',
    group: 'updates',
    href: '/announcements',
    label: 'Announcements',
    icon: MessageSquare,
  },
  { id: 'resources', group: 'updates', href: '/resources', label: 'Resources', icon: Library },
  { id: 'faqs', group: 'updates', href: '/faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'profile', group: 'profile', href: '/profile', label: 'My Profile', icon: User },
] as const satisfies readonly {
  id: string;
  group: NavGroupId;
  href: string;
  label: string;
  icon: unknown;
}[];

type NavItem = (typeof NAV_ITEMS)[number];

const HOME_HREF = '/dashboard';

function getVisibleNavItems(
  programStage: ProgramStage | null,
  profileStatus: 'loading' | 'ready' | 'error'
): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.id === 'annual-review') return programStage === 'scholar';
    if (item.id === 'documents') return programStage === 'prep_year';
    if (item.id === 'proposal') return profileStatus === 'ready';
    return true;
  });
}

function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find(
    (item) =>
      pathname === item.href || (item.href !== HOME_HREF && pathname.startsWith(`${item.href}/`))
  );
}

function ScholarSidebar({
  onLogout,
  programStage,
  profileStatus,
}: {
  onLogout: () => void;
  programStage: ProgramStage | null;
  profileStatus: 'loading' | 'ready' | 'error';
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const navItems = getVisibleNavItems(programStage, profileStatus);
  const activeItem = findNavItem(pathname);

  return (
    <Sidebar
      collapsible="icon"
      className="overscroll-none border-ashinaga-teal-100 dark:border-sidebar-border"
    >
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
      <SidebarContent className="overscroll-none">
        {NAV_GROUPS.map((group) => {
          const items = navItems.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          const labelId = `scholar-nav-${group.id}`;
          return (
            <SidebarGroup key={group.id}>
              {group.label ? (
                <SidebarGroupLabel id={labelId}>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu aria-labelledby={group.label ? labelId : undefined}>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem?.id === item.id;
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
                          <Link
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setOpenMobile(false)}
                          >
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
          );
        })}
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

function ScholarHeader({ programStage }: { programStage: ProgramStage | null }) {
  const pathname = usePathname();
  const section = findNavItem(pathname) ?? NAV_ITEMS[0];
  const isHome = section.href === HOME_HREF;
  const brandTitle =
    programStage === 'prep_year' ? 'Ashinaga Prep Year' : 'Ashinaga Scholar Portal';

  return (
    <header
      className="z-30 grid h-14 w-full shrink-0 items-center border-b border-ashinaga-teal-100 bg-background px-3 dark:border-sidebar-border sm:px-4 md:flex md:gap-2"
      style={{ gridTemplateColumns: '1fr auto 1fr' }}
    >
      <div className="flex items-center justify-start md:contents">
        <SidebarTrigger aria-label="Toggle sidebar" className="shrink-0 md:order-2" />
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
            {brandTitle}
          </h1>
        </Link>
      </div>
      <div className="flex items-center justify-end gap-1 md:order-3 md:ml-auto">
        <ScholarNotificationsBell />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function ScholarLayout({ children, onLogout }: ScholarLayoutProps) {
  return (
    <ScholarSessionProvider>
      <ScholarLayoutChrome onLogout={onLogout}>{children}</ScholarLayoutChrome>
    </ScholarSessionProvider>
  );
}

function ScholarLayoutChrome({ children, onLogout }: ScholarLayoutProps) {
  const { programStage, profileStatus } = useScholarSession();

  return (
    <SidebarProvider
      className="flex h-svh flex-col overflow-hidden bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-background dark:to-background"
      style={{ '--sidebar-header-height': '3.5rem' } as React.CSSProperties}
    >
      <ScholarHeader programStage={programStage} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ScholarSidebar
          onLogout={onLogout}
          programStage={programStage}
          profileStatus={profileStatus}
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-y-auto overscroll-none bg-transparent">
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
