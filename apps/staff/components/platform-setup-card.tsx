'use client';

import { toSafeHttpUrl } from '@workspace/ui/lib/safe-href';
import { Loader2 } from 'lucide-react';
import type { PlatformSetup, PlatformSetupStatus } from '../lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface PlatformSetupCardProps {
  setups: PlatformSetup[];
  updatingSlug?: string | null;
  onStatusChange: (slug: string, status: PlatformSetupStatus) => void | Promise<void>;
}

export function PlatformSetupCard({
  setups,
  updatingSlug,
  onStatusChange,
}: PlatformSetupCardProps) {
  const completeCount = setups.filter((setup) => setup.status === 'yes').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform setup</CardTitle>
        <CardDescription>
          Track whether this Prep Year candidate has been set up on each required platform.{' '}
          {completeCount}/{setups.length} complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setups.map((setup) => {
          const safeUrl = toSafeHttpUrl(setup.signpostingUrl);
          return (
            <div
              key={setup.platformId}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Label htmlFor={`platform-setup-${setup.slug}`}>{setup.name}</Label>
                {safeUrl ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground truncate hover:underline"
                  >
                    {setup.signpostingUrl}
                  </a>
                ) : setup.signpostingUrl ? (
                  <p className="text-xs text-muted-foreground truncate">{setup.signpostingUrl}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={setup.status}
                  onValueChange={(value) => onStatusChange(setup.slug, value as PlatformSetupStatus)}
                  disabled={updatingSlug === setup.slug}
                >
                  <SelectTrigger id={`platform-setup-${setup.slug}`} className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                {updatingSlug === setup.slug ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
