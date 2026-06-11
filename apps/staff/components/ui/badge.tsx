import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive-foreground/90',
        success:
          'border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
        warning:
          'border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
        info: 'border-[hsl(var(--info))]/20 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]',
        muted: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
