'use client';

import {
  Calendar,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  cancelInvitation,
  getInvitations,
  type InvitationSummary,
  resendInvitation,
} from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useToast } from './ui/use-toast';

interface OnboardingTrackerProps {
  onNavigateToInvitations: () => void;
  onInviteUpdate: () => void;
}

export function OnboardingTracker({
  onNavigateToInvitations,
  onInviteUpdate,
}: OnboardingTrackerProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'resend' | 'cancel' | null>(null);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const allInvites = await getInvitations('pending');
      const list = Array.isArray(allInvites) ? allInvites : [];
      // Show up to 5 pending invitations on the dashboard
      setInvitations(list.slice(0, 5));
    } catch (err) {
      console.error('Error loading invitations for onboarding tracker:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleResend = async (id: string) => {
    setBusyId(id);
    setActionType('resend');
    try {
      await resendInvitation(id);
      toast({
        title: 'Invitation resent',
        description: 'A new invitation email has been sent successfully.',
      });
      await loadInvitations();
      onInviteUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to resend invitation',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
      setActionType(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this invitation? The signup link will be deactivated.'
      )
    ) {
      return;
    }
    setBusyId(id);
    setActionType('cancel');
    try {
      await cancelInvitation(id);
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been successfully revoked.',
      });
      await loadInvitations();
      onInviteUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to cancel invitation',
        description: msg.replace(/^API Error:\s*\d+\s*-\s*/, ''),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
      setActionType(null);
    }
  };

  return (
    <Card className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <UserCheck className="h-4.5 w-4.5 text-muted-foreground" />
            Onboarding & Invitations
          </CardTitle>
          <CardDescription className="text-xs">
            Monitor and manage pending portal invites.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigateToInvitations} className="text-xs h-8">
          Manage all
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-start">
        {loading ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center flex-1 border border-dashed rounded-lg border-border/60">
            <UserCheck className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">No pending invites</p>
            <p className="mt-1 text-[10px] text-muted-foreground max-w-[180px]">
              All invitees have joined the portal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {invitations.map((invite) => {
              const isBusy = busyId === invite.id;
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3 group"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate block">
                        {invite.email}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wide px-1 py-0 h-3.5 shrink-0"
                      >
                        {invite.userType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className={new Date(invite.expiresAt) < new Date() ? 'text-destructive' : ''}>
                        {new Date(invite.expiresAt) < new Date() ? 'Expired' : 'Expires'}: {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                      {invite.resentCount !== '0' && (
                        <>
                          <span className="mx-0.5">•</span>
                          <span>Resent {invite.resentCount}x</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      disabled={isBusy}
                      onClick={() => handleResend(invite.id)}
                      title="Resend invitation"
                    >
                      {isBusy && actionType === 'resend' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isBusy}
                      onClick={() => handleCancel(invite.id)}
                      title="Cancel invitation"
                    >
                      {isBusy && actionType === 'cancel' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
