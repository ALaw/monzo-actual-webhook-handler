import type { MonzoTransaction } from '../src/types.js';

export function transaction(overrides: Partial<MonzoTransaction> = {}): MonzoTransaction {
  return {
    id: 'tx_sanitized123',
    account_id: 'acc_sanitized',
    created: '2026-07-01T23:30:00Z',
    updated: '2026-07-02T00:00:00Z',
    amount: -425,
    description: 'SANITIZED SHOP',
    settled: '',
    include_in_spending: true,
    merchant: { name: 'Sanitized Merchant' },
    ...overrides,
  };
}
