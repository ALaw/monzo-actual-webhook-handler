import { describe, expect, it } from 'vitest';
import { mapTransaction, toLondonDate } from '../src/mapper.js';
import { transaction } from './fixtures.js';

describe('Monzo transaction mapping', () => {
  it('maps identifiers, amount, merchant, notes, date and clearance', () => {
    expect(mapTransaction(transaction({ settled: '2026-07-02T01:00:00Z' }))).toEqual({
      date: '2026-07-02',
      amount: -425,
      payee_name: 'Sanitized Merchant',
      notes: 'SANITIZED SHOP',
      imported_id: 'monzo:tx_sanitized123',
      cleared: true,
    });
  });

  it('uses the description if merchant is null', () => {
    expect(mapTransaction(transaction({ merchant: null })).payee_name).toBe('SANITIZED SHOP');
  });

  it('uses the Europe/London calendar day during BST', () => {
    expect(toLondonDate('2026-07-01T23:30:00Z')).toBe('2026-07-02');
  });
});
