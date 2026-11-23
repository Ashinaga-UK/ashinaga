import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useArchiveScholar, useDeleteScholar, useRestoreScholar } from '../use-queries';

const mockArchive = jest.fn();
const mockRestore = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../api-client', () => ({
  archiveScholar: (...args: unknown[]) => mockArchive(...args),
  restoreScholar: (...args: unknown[]) => mockRestore(...args),
  deleteScholar: (...args: unknown[]) => mockDelete(...args),
}));

const SCHOLAR_ID = 'scholar-1';

const SHARED_KEYS = [
  ['overview'],
  ['prep-year', 'report'],
  ['prep-tasks', 'cohort'],
  ['scholar-activity', 'report'],
];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const removeSpy = jest.spyOn(queryClient, 'removeQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () => invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey);
  return { queryClient, wrapper, invalidateSpy, removeSpy, invalidatedKeys };
}

describe('scholar lifecycle mutations cache invalidation (ASH-145)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['archive', useArchiveScholar, mockArchive],
    ['restore', useRestoreScholar, mockRestore],
  ])('%s invalidates the profile and shared report prefixes only', async (_name, useHook, mock) => {
    mock.mockResolvedValue({ id: SCHOLAR_ID });
    const { wrapper, removeSpy, invalidatedKeys } = setup();
    const { result } = renderHook(() => useHook(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(SCHOLAR_ID);
    });

    expect(mock).toHaveBeenCalledWith(SCHOLAR_ID);
    expect(invalidatedKeys()).toEqual([['scholar', SCHOLAR_ID, 'profile'], ...SHARED_KEYS]);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('delete removes the scholar cache and invalidates shared + extra keys', async () => {
    mockDelete.mockResolvedValue({ success: true });
    const { wrapper, removeSpy, invalidatedKeys } = setup();
    const { result } = renderHook(() => useDeleteScholar(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(SCHOLAR_ID);
    });

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['scholar', SCHOLAR_ID] });
    expect(invalidatedKeys()).toEqual([
      ...SHARED_KEYS,
      ['requests', 'stats'],
      ['proposals', 'inbox'],
      ['required-documents', 'cohort'],
      ['announcements'],
    ]);
    expect(invalidatedKeys()).not.toContainEqual(['scholar', SCHOLAR_ID, 'profile']);
  });

  it('never invalidates the scholars list key', async () => {
    mockDelete.mockResolvedValue({ success: true });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useDeleteScholar(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(SCHOLAR_ID);
    });

    expect(invalidatedKeys().some((key) => key?.[0] === 'scholars')).toBe(false);
  });

  it('does not extend isPending while invalidation refetches are in flight', async () => {
    mockArchive.mockResolvedValue({ id: SCHOLAR_ID });
    const { queryClient, wrapper } = setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(gate);
    const { result } = renderHook(() => useArchiveScholar(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(SCHOLAR_ID);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    release();
  });

  it.each([
    ['archive', useArchiveScholar, mockArchive],
    ['restore', useRestoreScholar, mockRestore],
    ['delete', useDeleteScholar, mockDelete],
  ])('%s failure invalidates and removes nothing', async (_name, useHook, mock) => {
    mock.mockRejectedValue(new Error('boom'));
    const { wrapper, invalidateSpy, removeSpy } = setup();
    const { result } = renderHook(() => useHook(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(SCHOLAR_ID)).rejects.toThrow('boom');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
  });
});
