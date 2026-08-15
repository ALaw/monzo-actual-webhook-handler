import type { ActualTransaction, MonzoTransaction } from './types.js';

const londonDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toLondonDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid created timestamp');
  const parts = Object.fromEntries(londonDate.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function mapTransaction(transaction: MonzoTransaction): ActualTransaction {
  const merchantName =
    transaction.merchant && typeof transaction.merchant === 'object'
      ? transaction.merchant.name?.trim()
      : undefined;

  return {
    date: toLondonDate(transaction.created),
    amount: transaction.amount,
    payee_name: merchantName || transaction.description,
    notes: transaction.description,
    imported_id: `monzo:${transaction.id}`,
    cleared: transaction.settled.length > 0,
  };
}
