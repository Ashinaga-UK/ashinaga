'use client';

import { Loader2, Mail, Search, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelInvitation,
  createStaffInvitation,
  getInvitations,
  getStaffForManagement,
  type InvitationSummary,
  removeStaffMember,
  resendInvitation,
  type StaffMember,
} from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/use-toast';

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled' | 'all';

function StatusBadge({ status }: { status: InvitationSummary['status'] }) {
  const variants: Record<
    InvitationSummary['status'],
    {
      variant: 'warning' | 'success' | 'muted' | 'destructive';
      label: string;
    }
  > = {
    pending: { variant: 'warning', label: 'Pending' },
    accepted: { variant: 'success', label: 'Accepted' },
    expired: { variant: 'muted', label: 'Expired' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };
  const v = variants[status];
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

interface InvitationListProps {
  userType: 'staff' | 'scholar';
}

function InvitationList({ userType }: InvitationListProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getInvitations(statusFilter === 'all' ? undefined : statusFilter);
      setRows(list.filter((r) => r.userType === userType));
    } catch (e) {
      toast({
        title: 'Could not load invitations',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userType, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, search]);

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await resendInvitation(id);
      toast({ title: 'Invitation resent', description: 'Another email was sent.' });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Resend failed',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this invitation? The link will stop working.')) return;
    setBusyId(id);
    try {
      await cancelInvitation(id);
      toast({ title: 'Invitation cancelled' });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Could not cancel',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvitationStatus)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="space-y-2 lg:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border lg:block">
            <div className="grid grid-cols-12 gap-2 border-b bg-muted/30 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Sent / Resends</div>
              <div className="col-span-2">Expires</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3.5">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground text-sm">No invitations</p>
          <p className="mt-1 text-muted-foreground text-sm">Nothing matches the current filters.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {filtered.map((inv) => {
              const expires = new Date(inv.expiresAt);
              const isPending = inv.status === 'pending';
              return (
                <li key={inv.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-foreground text-sm">{inv.email}</p>
                      <div className="mt-2">
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                        Sent
                      </dt>
                      <dd className="tabular-nums">
                        {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                        Expires
                      </dt>
                      <dd className="tabular-nums">{expires.toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider">
                        Resends
                      </dt>
                      <dd className="tabular-nums">{inv.resentCount}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isPending || busyId !== null}
                      onClick={() => handleResend(inv.id)}
                    >
                      {busyId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={!isPending || busyId !== null}
                      onClick={() => handleCancel(inv.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-hidden rounded-lg border lg:block">
            <div className="grid grid-cols-12 gap-2 border-b bg-muted/30 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Sent / Resends</div>
              <div className="col-span-2">Expires</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <ul className="divide-y">
              {filtered.map((inv) => {
                const expires = new Date(inv.expiresAt);
                const isPending = inv.status === 'pending';
                return (
                  <li
                    key={inv.id}
                    className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="col-span-4 break-all font-medium text-foreground">
                      {inv.email}
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="col-span-2 text-muted-foreground">
                      <div className="tabular-nums">
                        {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : '—'}
                      </div>
                      <div className="text-xs tabular-nums">Resends: {inv.resentCount}</div>
                    </div>
                    <div className="col-span-2 text-muted-foreground tabular-nums">
                      {expires.toLocaleDateString()}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isPending || busyId !== null}
                        onClick={() => handleResend(inv.id)}
                      >
                        {busyId === inv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Resend'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={!isPending || busyId !== null}
                        onClick={() => handleCancel(inv.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function InviteStaffButton({ onInvited }: { onInvited: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await createStaffInvitation(trimmed);
      toast({
        title: 'Invitation sent',
        description: `We emailed ${trimmed} with a link to complete staff signup.`,
      });
      setEmail('');
      setOpen(false);
      onInvited();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Could not send invitation',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700 sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to create their Ashinaga staff account.
            Invitations expire after 30 days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-invite-tab-email">Work email</Label>
            <Input
              id="staff-invite-tab-email"
              type="email"
              autoComplete="email"
              placeholder="name@organization.org"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={submitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ActiveStaffList() {
  const { toast } = useToast();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaffForManagement();
      setMembers(res.staff);
      setCanManage(res.canManage);
    } catch (e) {
      toast({
        title: 'Could not load staff',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleRemove = async (member: StaffMember) => {
    if (member.isSelf) return;
    const confirmed = window.confirm(
      `Remove ${member.name} (${member.email}) from staff?\n\nThey will lose access immediately and their active sessions will be ended. This cannot be undone from the app.`
    );
    if (!confirmed) return;
    setBusyUserId(member.userId);
    try {
      await removeStaffMember(member.userId);
      toast({
        title: 'Staff member removed',
        description: `${member.name} no longer has access to the staff portal.`,
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Could not remove staff member',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!loading && !canManage && (
          <p className="text-xs text-muted-foreground">
            Only super-admins can remove staff members.
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="space-y-2 lg:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="hidden rounded-lg border overflow-hidden lg:block">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <div className="col-span-4">Name</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3.5">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No active staff</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Nothing matches your search.' : 'Invite a colleague to get started.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {filtered.map((member) => (
              <li key={member.userId} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-full truncate text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                      {member.isSelf && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  {member.isSuperAdmin && (
                    <span title="Super admin" className="shrink-0 text-amber-600">
                      <Shield className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Badge
                    variant={member.role === 'admin' ? 'success' : 'muted'}
                    className="capitalize"
                  >
                    {member.role}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={!canManage || member.isSelf || busyUserId !== null}
                    onClick={() => handleRemove(member)}
                    title={
                      member.isSelf
                        ? 'You cannot remove yourself'
                        : !canManage
                          ? 'Only super-admins can remove staff'
                          : 'Remove staff member'
                    }
                  >
                    {busyUserId === member.userId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden rounded-lg border overflow-hidden lg:block">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <div className="col-span-4">Name</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <ul className="divide-y">
              {filtered.map((member) => (
                <li
                  key={member.userId}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors hover:bg-muted/30"
                >
                  <div className="col-span-4 font-medium text-foreground flex items-center gap-2">
                    <span className="truncate">{member.name}</span>
                    {member.isSelf && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-4 break-all text-muted-foreground">{member.email}</div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Badge
                      variant={member.role === 'admin' ? 'success' : 'muted'}
                      className="capitalize"
                    >
                      {member.role}
                    </Badge>
                    {member.isSuperAdmin && (
                      <span title="Super admin" className="text-amber-600">
                        <Shield className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={!canManage || member.isSelf || busyUserId !== null}
                      onClick={() => handleRemove(member)}
                      title={
                        member.isSelf
                          ? 'You cannot remove yourself'
                          : !canManage
                            ? 'Only super-admins can remove staff'
                            : 'Remove staff member'
                      }
                    >
                      {busyUserId === member.userId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export function InvitationsManagement({ onOnboardScholar }: { onOnboardScholar: () => void }) {
  const [tab, setTab] = useState<'staff-members' | 'staff' | 'scholar'>('staff-members');
  const [refreshKey, setRefreshKey] = useState(0);
  const tabLabels = {
    'staff-members': 'Active Staff',
    staff: 'Staff Invites',
    scholar: 'Scholar Invites',
  };

  return (
    <Card className="border-border">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl leading-tight sm:text-2xl">Staff & Invitations</CardTitle>
            <CardDescription>
              Manage active staff, and track staff and scholar invitations. Invitations expire after
              30 days.
            </CardDescription>
          </div>
          <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
            {tab === 'scholar' ? (
              <Button
                onClick={onOnboardScholar}
                className="w-full bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700 sm:w-auto"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Onboard Scholar
              </Button>
            ) : (
              <InviteStaffButton onInvited={() => setRefreshKey((k) => k + 1)} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'staff-members' | 'staff' | 'scholar')}
          className="space-y-4"
        >
          <div className="sm:hidden">
            <Select value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <SelectTrigger aria-label="Invitation section">
                <SelectValue placeholder={tabLabels[tab]} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff-members">Active Staff</SelectItem>
                <SelectItem value="staff">Staff Invites</SelectItem>
                <SelectItem value="scholar">Scholar Invites</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden w-full grid-cols-3 sm:grid sm:w-[480px]">
            <TabsTrigger value="staff-members">Active Staff</TabsTrigger>
            <TabsTrigger value="staff">Staff Invites</TabsTrigger>
            <TabsTrigger value="scholar">Scholar Invites</TabsTrigger>
          </TabsList>
          <TabsContent value="staff-members">
            <ActiveStaffList key={`staff-members-${refreshKey}`} />
          </TabsContent>
          <TabsContent value="staff">
            <InvitationList key={`staff-${refreshKey}`} userType="staff" />
          </TabsContent>
          <TabsContent value="scholar">
            <InvitationList key={`scholar-${refreshKey}`} userType="scholar" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
