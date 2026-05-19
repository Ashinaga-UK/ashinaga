import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { createElement, Fragment } from 'react';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (actual: HTMLElement) => {
  toHaveAttribute: (name: string, value: string) => void;
};
declare const require: (moduleName: string) => { default: ComponentType };
declare const jest: {
  mock: (moduleName: string, factory: () => unknown) => void;
};

jest.mock('../../../lib/auth-client', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Test Scholar',
        email: 'scholar@example.com',
        userType: 'scholar',
      },
    },
  }),
}));

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyRequests: () => ({
    data: [
      { id: 'request-1', status: 'pending' },
      { id: 'request-2', status: 'approved' },
    ],
  }),
  useMyAnnouncements: () => ({
    data: [
      {
        id: 'announcement-1',
        title: 'Welcome',
        createdAt: '2026-05-19T00:00:00.000Z',
      },
    ],
  }),
}));

jest.mock('../../../lib/api/tasks', () => ({
  getMyTasks: () =>
    Promise.resolve([
      {
        id: 'task-1',
        title: 'Pending task',
        status: 'pending',
        dueDate: '2026-05-20T00:00:00.000Z',
      },
      {
        id: 'task-2',
        title: 'Completed task',
        status: 'completed',
        dueDate: '2026-05-20T00:00:00.000Z',
      },
    ]),
}));

jest.mock('../../../lib/api/goals', () => ({
  getMyGoals: () =>
    Promise.resolve([
      {
        id: 'goal-1',
        title: 'Active goal',
        status: 'in_progress',
        completionScale: 8,
        targetDate: '2026-12-31T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
}));

jest.mock('../../../lib/api/profile', () => ({
  getMyProfile: () =>
    Promise.resolve({
      program: 'Engineering',
      university: 'University of Manchester',
      year: '2026',
    }),
}));

jest.mock('../../../components/new-request-dialog', () => ({
  NewRequestDialog: ({ trigger }: { trigger: ReactNode }) => createElement(Fragment, null, trigger),
}));

const DashboardPage = require('./page').default;

describe('DashboardPage', () => {
  it('links overview stat cards to the matching scholar pages', async () => {
    render(createElement(DashboardPage));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Pending Tasks/i })).toHaveAttribute(
        'href',
        '/tasks'
      );
    });

    expect(screen.getByRole('link', { name: /Active LDF Goals/i })).toHaveAttribute(
      'href',
      '/goals'
    );
    expect(screen.getByRole('link', { name: /Open Requests/i })).toHaveAttribute(
      'href',
      '/requests'
    );
    expect(screen.getByRole('link', { name: /New Announcements/i })).toHaveAttribute(
      'href',
      '/announcements'
    );
  });
});
