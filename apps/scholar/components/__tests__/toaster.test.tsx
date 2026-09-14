/**
 * The scholar app shipped a <Toaster /> component that was never rendered, and a
 * duplicate copy of the toast store, so every toast() call in the portal was
 * silent — including the upload and validation errors the UI relies on to explain
 * a failure.
 *
 * Two things have to hold for a toast to be visible, and each is easy to break
 * independently: the Toaster has to be mounted, and the module the feature
 * components import from has to be the same store the Toaster reads.
 */
import { act, render, screen } from '@testing-library/react';
import { isValidElement, type ReactNode } from 'react';

// The root layout pulls in the Geist font packages, which ship untransformed ESM.
jest.mock('geist/font/mono', () => ({
  GeistMono: { variable: '--font-mono', style: { fontFamily: 'mono' } },
}));
jest.mock('geist/font/sans', () => ({
  GeistSans: { variable: '--font-sans', style: { fontFamily: 'sans' } },
}));

import RootLayout from '../../app/layout';
import { Toaster } from '../ui/toaster';
// Deliberately imported by the path the feature components use, not the hook
// directly — that is the half that silently broke.
import { toast, useToast } from '../ui/use-toast';

/** Walks a React element tree looking for a given component type. */
function treeContains(node: ReactNode, target: unknown): boolean {
  if (Array.isArray(node)) return node.some((child) => treeContains(child, target));
  if (!isValidElement(node)) return false;
  if (node.type === target) return true;
  return treeContains((node.props as { children?: ReactNode }).children, target);
}

describe('Toaster wiring', () => {
  it('renders a toast dispatched through components/ui/use-toast', () => {
    render(<Toaster />);

    let handle: { dismiss: () => void } | undefined;
    act(() => {
      handle = toast({ title: 'Upload failed', description: 'That file is over 10MB.' });
    });

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('That file is over 10MB.')).toBeInTheDocument();

    act(() => handle?.dismiss());
  });

  it('shares one store with the hooks/use-toast module the Toaster reads', async () => {
    const hookModule = await import('../../hooks/use-toast');

    expect(hookModule.toast).toBe(toast);
    expect(hookModule.useToast).toBe(useToast);
  });

  it('mounts the Toaster in the root layout', () => {
    // Rendering the root layout into jsdom would nest <html> inside <body>, so
    // inspect the element tree it returns instead.
    expect(treeContains(RootLayout({ children: null }), Toaster)).toBe(true);
  });
});
