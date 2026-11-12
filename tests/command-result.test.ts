import { expect, it, vi } from 'vitest';
import { runCommandWithRefresh } from '../src/lib/command-result';

it('retains the successful mutation result when refresh fails without repeating the mutation', async () => {
  const mutate = vi.fn(async () => ({ id: 'created-request' }));
  const refresh = vi.fn(async () => { throw new Error('offline'); });
  await expect(runCommandWithRefresh(mutate, refresh)).resolves.toEqual({ result: { id: 'created-request' }, refreshed: false });
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('propagates mutation failure and does not refresh', async () => {
  const failure = new Error('mutation failed');
  const mutate = vi.fn(async (): Promise<{ id: string }> => { throw failure; });
  const refresh = vi.fn(async () => {});
  await expect(runCommandWithRefresh(mutate, refresh)).rejects.toBe(failure);
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
});

it('reports a successful refresh with the mutation result', async () => {
  await expect(runCommandWithRefresh(async () => ({ id: 'created' }), async () => {})).resolves.toEqual({ result: { id: 'created' }, refreshed: true });
});
