import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional call to action, e.g. a Button or a dialog trigger. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-card/40 px-4 py-6 text-center dark:border-border',
        className
      )}
    >
      <Icon className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
