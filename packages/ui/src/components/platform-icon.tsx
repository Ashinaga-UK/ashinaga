import { Mail } from 'lucide-react';

export interface PlatformIconProps {
  slug: string;
  className?: string;
}

const frameStyle = {
  display: 'inline-flex',
  width: 40,
  height: 40,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: 6,
} as const;

export function PlatformIcon({ slug, className }: PlatformIconProps) {
  const frameProps = {
    'aria-hidden': true,
    className,
    'data-testid': `platform-icon-${slug}`,
    style: frameStyle,
  } as const;

  if (slug === 'coursera') {
    return (
      <span {...frameProps}>
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: Decorative icon is hidden and followed by the platform name. */}
        <svg viewBox="0 0 24 24" width="40" height="40">
          <rect width="24" height="24" rx="5" fill="#0056D2" />
          <path d="M16.8 15.1a6 6 0 1 1 0-6.2l-2.7 1.5a2.9 2.9 0 1 0 0 3.2l2.7 1.5Z" fill="white" />
        </svg>
      </span>
    );
  }

  if (slug === 'duolingo') {
    return (
      <span {...frameProps}>
        <img
          src="/platform-icons/duolingo.png"
          alt=""
          width={36}
          height={36}
          style={{ width: 36, height: 36, objectFit: 'contain' }}
        />
      </span>
    );
  }

  if (slug === 'ashinaga_connect') {
    return (
      <span {...frameProps}>
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: Decorative icon is hidden and followed by the platform name. */}
        <svg viewBox="0 0 24 24" width="40" height="40">
          <rect width="24" height="24" rx="5" fill="#5DBB26" />
          <path
            d="m12 4.3 6.1 15.4h-3.6l-1.2-3.4H8.7l-1.2 3.4H3.9L10 4.3h2Zm0 5.3-2.1 4h4.2l-2.1-4Z"
            fill="white"
          />
        </svg>
      </span>
    );
  }

  if (slug === 'email') {
    return (
      <span
        {...frameProps}
        style={{
          ...frameStyle,
          backgroundColor: 'hsl(var(--muted))',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        <Mail width={20} height={20} />
      </span>
    );
  }

  return null;
}
