'use client';

import {
  ClipboardCheck,
  FileText,
  Home,
  Library,
  LogOut,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

export const STAFF_NAV_ITEMS = [
  { href: '/', value: 'overview', label: 'Overview', icon: Home },
  { href: '/?tab=scholars', value: 'scholars', label: 'Scholars', icon: Users },
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
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Ashinaga Staff">
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-brand">
                  <span className="text-sm font-semibold text-brand-foreground">A</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Ashinaga</span>
                  <span className="truncate text-xs text-muted-foreground">Staff Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
      <SidebarRail />
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

  return (
    <SidebarProvider>
      <StaffSidebar activeTab={activeTab} onLogout={onLogout} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-4">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-medium text-foreground">Ashinaga Staff</h1>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
              Supporting Scholar Success
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onOpenProfile}
              aria-label="Open my profile"
            >
              <Avatar className="h-8 w-8 cursor-pointer">
                {user?.image && <AvatarImage src={user.image} alt={user.name || 'User'} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
