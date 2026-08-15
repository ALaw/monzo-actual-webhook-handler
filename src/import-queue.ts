import type { MonzoTransaction } from './types.js';

export class ImportQueue {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly importer: (actualAccountId: string, transaction: MonzoTransaction) => Promise<void>,
    private readonly onError: (transactionId: string, error: unknown) => void,
  ) {}

  schedule(actualAccountId: string, transaction: MonzoTransaction): void {
    this.tail = this.tail.then(() => this.importer(actualAccountId, transaction)).catch((error: unknown) => {
      this.onError(transaction.id, error);
    });
  }

  async idle(): Promise<void> {
    await this.tail;
  }
}
