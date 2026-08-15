import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, isNewerSnapshot } from '../src/webhook.js';
import { transaction } from './fixtures.js';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(() => servers.splice(0).forEach(server => server.close()));

async function post(type: string, data = transaction(), secret = 'test-secret') {
  const scheduleImport = vi.fn();
  const server = createServer(createApp({
    secret: 'test-secret',
    accountMappings: new Map([
      ['acc_sanitized', 'actual_current'],
      ['acc_flex', 'actual_flex'],
    ]),
    scheduleImport,
  }));
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}/monzo/${secret}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, data }),
  });
  return { response, scheduleImport };
}

describe('webhook receiver', () => {
  for (const type of ['transaction.created', 'transaction.updated']) {
    it(`accepts ${type}`, async () => {
      const { response, scheduleImport } = await post(type);
      expect(response.status).toBe(204);
      expect(scheduleImport).toHaveBeenCalledWith('actual_current', expect.objectContaining({ id: 'tx_sanitized123' }));
    });
  }

  it('returns 404 for a wrong secret', async () => expect((await post('transaction.created', transaction(), 'wrong')).response.status).toBe(404));
  it('rejects a wrong account', async () => expect((await post('transaction.created', transaction({ account_id: 'acc_wrong' }))).response.status).toBe(400));

  it('routes Current and Flex transactions to different Actual accounts', async () => {
    const current = await post('transaction.created', transaction());
    const flex = await post('transaction.created', transaction({ account_id: 'acc_flex', id: 'tx_flex' }));
    expect(current.scheduleImport).toHaveBeenCalledWith('actual_current', expect.anything());
    expect(flex.scheduleImport).toHaveBeenCalledWith('actual_flex', expect.objectContaining({ id: 'tx_flex' }));
  });

  it('tracks identical transaction IDs independently per Monzo account', async () => {
    const scheduleImport = vi.fn();
    const server = createServer(createApp({
      secret: 'test-secret',
      accountMappings: new Map([
        ['acc_sanitized', 'actual_current'],
        ['acc_flex', 'actual_flex'],
      ]),
      scheduleImport,
    }));
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const send = (account_id: string) => fetch(`http://127.0.0.1:${port}/monzo/test-secret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'transaction.created', data: transaction({ account_id }) }),
    });

    await send('acc_sanitized');
    await send('acc_flex');

    expect(scheduleImport).toHaveBeenCalledTimes(2);
    expect(scheduleImport).toHaveBeenNthCalledWith(1, 'actual_current', expect.anything());
    expect(scheduleImport).toHaveBeenNthCalledWith(2, 'actual_flex', expect.anything());
  });

  it('does not allow an older snapshot to replace a newer one', () => {
    expect(isNewerSnapshot(transaction({ updated: '2026-01-01T00:00:00Z' }), transaction({ updated: '2026-01-02T00:00:00Z' }))).toBe(false);
  });

  it('does not allow pending to replace settled at the same timestamp', () => {
    expect(isNewerSnapshot(transaction({ settled: '' }), transaction({ settled: '2026-01-02T00:00:00Z' }))).toBe(false);
  });
});
