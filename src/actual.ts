import * as actual from '@actual-app/api';
import type { Config } from './config.js';
import { mapTransaction } from './mapper.js';
import type { MonzoTransaction } from './types.js';

export async function initializeActual(config: Config): Promise<void> {
  await actual.init({
    dataDir: './data/actual-cache',
    serverURL: config.ACTUAL_SERVER_URL,
    password: config.ACTUAL_PASSWORD,
  });
  await actual.downloadBudget(config.ACTUAL_SYNC_ID, {
    password: config.ACTUAL_ENCRYPTION_PASSWORD,
  });
}

export async function importTransaction(accountId: string, transaction: MonzoTransaction): Promise<void> {
  const result = await actual.importTransactions(accountId, [{
    ...mapTransaction(transaction),
    account: accountId,
  }]);
  if (result.errors.length > 0) {
    throw new Error(`Actual rejected ${result.errors.length} transaction import error(s)`);
  }
  console.info(
    `Actual import completed for transaction …${transaction.id.slice(-6)}: ` +
    `${result.added.length} added, ${result.updated.length} updated`,
  );
}

export async function shutdownActual(): Promise<void> {
  await actual.shutdown();
}
