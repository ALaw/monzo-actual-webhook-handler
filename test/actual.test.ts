import * as actual from '@actual-app/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importTransaction } from '../src/actual.js';
import { transaction } from './fixtures.js';

vi.mock('@actual-app/api', () => ({
  importTransactions: vi.fn(),
  init: vi.fn(),
  downloadBudget: vi.fn(),
  shutdown: vi.fn(),
}));

const importTransactions = vi.mocked(actual.importTransactions);

describe('Actual import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects when Actual resolves with transaction errors', async () => {
    importTransactions.mockResolvedValue({
      errors: [{ message: 'sensitive detail' }],
      added: [],
      updated: [],
      updatedPreview: [],
    });

    await expect(importTransaction('actual_current', transaction())).rejects.toThrow(
      'Actual rejected 1 transaction import error(s)',
    );
  });

  it('resolves when Actual reports no transaction errors', async () => {
    importTransactions.mockResolvedValue({
      errors: [],
      added: ['transaction-id'],
      updated: [],
      updatedPreview: [],
    });

    await expect(importTransaction('actual_current', transaction())).resolves.toBeUndefined();
  });
});
