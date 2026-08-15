import { describe, expect, it, vi } from 'vitest';
import { ImportQueue } from '../src/import-queue.js';
import { transaction } from './fixtures.js';

describe('ImportQueue', () => {
  it('serializes imports', async () => {
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const importer = vi.fn(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise<void>(resolve => releases.push(resolve));
      active -= 1;
    });
    const queue = new ImportQueue(importer, vi.fn());
    queue.schedule('actual_current', transaction({ id: 'tx_one' }));
    queue.schedule('actual_flex', transaction({ id: 'tx_two' }));
    await vi.waitFor(() => expect(releases).toHaveLength(1));
    releases.shift()?.();
    await vi.waitFor(() => expect(releases).toHaveLength(1));
    releases.shift()?.();
    await queue.idle();
    expect(maximumActive).toBe(1);
  });

  it('continues after a failed import', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(undefined);
    const onError = vi.fn();
    const queue = new ImportQueue(importer, onError);
    queue.schedule('actual_current', transaction({ id: 'tx_one' }));
    queue.schedule('actual_flex', transaction({ id: 'tx_two' }));
    await queue.idle();
    expect(importer).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
  });
});
