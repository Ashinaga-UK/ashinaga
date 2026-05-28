'use client';

import { Loader2, Mail, Search, UserPlus } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelInvitation,
  createStaffInvitation,
  getInvitations,
  type InvitationSummary,
  resendInvitation,
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
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
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
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No invitations</p>
          <p className="mt-1 text-sm text-muted-foreground">Nothing matches the current filters.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
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
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors hover:bg-muted/30"
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
                      {busyId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
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
        <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
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
          <DialogFooter className="sm:justify-start gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
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

export function InvitationsManagement({ onOnboardScholar }: { onOnboardScholar: () => void }) {
  const [tab, setTab] = useState<'staff' | 'scholar'>('staff');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Track and manage staff and scholar invitations. Invitations expire after 30 days.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {tab === 'staff' ? (
              <InviteStaffButton onInvited={() => setRefreshKey((k) => k + 1)} />
            ) : (
              <Button
                onClick={onOnboardScholar}
                className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Onboard Scholar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'staff' | 'scholar')}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-[320px]">
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="scholar">Scholar</TabsTrigger>
          </TabsList>
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
