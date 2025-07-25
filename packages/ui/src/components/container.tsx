import { cn } from '@workspace/ui/lib/utils';
import type React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container width variant
   * - default: max-w-7xl with padding
   * - sm: max-w-3xl with padding
   * - fullWidth: full width with padding
   * - raw: no max-width or padding
   */
  variant?: 'default' | 'sm' | 'fullWidth' | 'raw';
}

/**
 * Responsive container component with variants
 * Controls the max-width and horizontal padding of its content
 */
export function Container({ className, variant = 'default', children, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-24 px-6',
        {
          'max-w-7xl': variant === 'default',
          'max-w-3xl': variant === 'sm',
          'max-w-none': variant === 'fullWidth',
          'px-0 md:px-0': variant === 'raw',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
