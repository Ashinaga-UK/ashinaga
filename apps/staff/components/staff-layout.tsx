'use client';

import { ThemeToggle } from '@workspace/ui';
import {
  ChevronLeft,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Home,
  Library,
  LogOut,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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

export const STAFF_NAV_ITEMS = [
  { href: '/', value: 'overview', label: 'Overview', icon: Home },
  { href: '/?tab=scholars', value: 'scholars', label: 'Scholars', icon: Users },
  {
    href: '/?tab=prep-documents',
    value: 'prep-documents',
    label: 'Prep documents',
    icon: FolderOpen,
  },
  {
    href: '/?tab=annual-reviews',
    value: 'annual-reviews',
    label: 'Annual Reviews',
    icon: ClipboardCheck,
  },
  { href: '/?tab=requests', value: 'requests', label: 'Requests', icon: FileText },
  {
    href: '/?tab=announcements',
    value: 'announcements',
    label: 'Announcements',
    icon: MessageSquare,
  },
  { href: '/?tab=resources', value: 'resources', label: 'Resources', icon: Library },
  { href: '/?tab=invitations', value: 'invitations', label: 'Invitations', icon: Mail },
] as const;

interface StaffLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onLogout: () => void;
  onOpenProfile: () => void;
  user?: {
    name?: string | null;
    image?: string | null;
  };
}

function StaffSidebar({ activeTab, onLogout }: Pick<StaffLayoutProps, 'activeTab' | 'onLogout'>) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {isMobile ? (
        <div className="flex items-center border-b border-sidebar-border px-2 py-1.5">
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
              {STAFF_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeTab === item.value}
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

export function StaffLayout({
  children,
  activeTab,
  onLogout,
  onOpenProfile,
  user,
}: StaffLayoutProps) {
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';
  const isHome = activeTab === 'overview';

  return (
    <SidebarProvider
      className="flex h-svh flex-col overflow-hidden"
      style={{ '--sidebar-header-height': '3.5rem' } as React.CSSProperties}
    >
      <header
        className="z-30 grid h-14 w-full shrink-0 items-center border-b bg-background/80 px-3 backdrop-blur-xl sm:px-4 md:flex md:gap-2"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        <div className="flex items-center justify-start md:contents">
          {!isHome ? (
            <Link
              href="/"
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
            <h1 className="truncate text-center text-sm font-medium text-foreground md:hidden">
              {STAFF_NAV_ITEMS.find((item) => item.value === activeTab)?.label ?? 'Ashinaga Staff'}
            </h1>
          ) : null}
          <Link
            href="/"
            className={cn(
              'min-w-0 items-center justify-center gap-2 md:justify-start',
              isHome ? 'flex' : 'hidden md:flex'
            )}
          >
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-brand md:flex">
              <span className="text-sm font-semibold text-brand-foreground">A</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-center text-sm font-medium text-foreground md:text-left">
                Ashinaga Staff
              </h1>
              <p className="hidden truncate text-[11px] text-muted-foreground md:block">
                Supporting Scholar Success
              </p>
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-end gap-1 md:order-3 md:ml-auto">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={onOpenProfile}
            aria-label="Open my profile"
          >
            <Avatar className="h-8 w-8 cursor-pointer">
              {user?.image && (
                <AvatarImage key={user.image} src={user.image} alt={user.name || 'User'} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <StaffSidebar activeTab={activeTab} onLogout={onLogout} />
        <SidebarInset className="min-h-0 min-w-0 overflow-y-auto">
          <div className="min-w-0 flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
