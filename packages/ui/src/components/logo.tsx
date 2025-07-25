import type * as React from 'react';

type LogoProps = React.HTMLAttributes<HTMLSpanElement>;

export function Logo(props: LogoProps) {
  return (
    <span className="text-2xl font-bold text-gray-900 dark:text-white" {...props}>
      Ashinaga
    </span>
  );
}
