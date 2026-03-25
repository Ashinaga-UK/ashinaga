'use client';

import { Loader2, UserPlus } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  cancelInvitation,
  createStaffInvitation,
  getInvitations,
  type InvitationSummary,
  resendInvitation,
} from '../lib/api-client';
import { Button } from './ui/button';
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
import { useToast } from './ui/use-toast';

interface StaffInviteDialogProps {
  trigger?: React.ReactNode;
}

export function StaffInviteDialog({ trigger }: StaffInviteDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [staffPending, setStaffPending] = useState<InvitationSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStaffInvites = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await getInvitations('pending');
      setStaffPending(rows.filter((r) => r.userType === 'staff'));
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load invitations',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      void loadStaffInvites();
    }
  }, [open, loadStaffInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: 'Email required',
        description: 'Enter the colleague’s work email address.',
        variant: 'destructive',
      });
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
      await loadStaffInvites();
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

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await resendInvitation(id);
      toast({ title: 'Invitation resent', description: 'Another email was sent.' });
      await loadStaffInvites();
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
      await loadStaffInvites();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-ashinaga-teal-200 hover:bg-ashinaga-teal-50 bg-transparent w-full"
          >
            <UserPlus className="h-6 w-6" />
            Invite Staff
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to create their Ashinaga staff account.
            Invitations expire after 7 days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-invite-email">Work email</Label>
            <Input
              id="staff-invite-email"
              type="email"
              autoComplete="email"
              placeholder="name@organization.org"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={submitting}
            />
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
            >
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

        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Pending staff invitations</h4>
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : staffPending.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No pending staff invitations.</p>
          ) : (
            <ul className="space-y-2">
              {staffPending.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-800 break-all">{inv.email}</span>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId !== null}
                      onClick={() => handleResend(inv.id)}
                    >
                      {busyId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={busyId !== null}
                      onClick={() => handleCancel(inv.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
