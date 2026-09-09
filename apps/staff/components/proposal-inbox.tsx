'use client';

import { Loader2 } from 'lucide-react';
import { useProposalInbox } from '../lib/hooks/use-queries';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function ProposalInbox({ onOpenScholar }: { onOpenScholar: (scholarId: string) => void }) {
  const { data = [], isLoading, error } = useProposalInbox();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Proposal reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inbox...
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Could not load proposal reviews.</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submitted proposal steps waiting.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((item) => (
              <li
                key={`${item.scholarId}-${item.stepKey}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.scholarName}</p>
                  <p className="text-sm text-muted-foreground">{item.stepTitle}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenScholar(item.scholarId)}
                >
                  Review
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
