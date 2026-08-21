import express, { type Express } from 'express';
import { z } from 'zod';
import type { MonzoTransaction } from './types.js';

const transactionSchema = z.object({
  id: z.string().min(1),
  account_id: z.string().min(1),
  created: z.iso.datetime({ offset: true }),
  updated: z.iso.datetime({ offset: true }),
  amount: z.number().int(),
  description: z.string(),
  settled: z.string(),
  decline_reason: z.string().optional(),
  include_in_spending: z.boolean().optional(),
  merchant: z.union([z.object({ name: z.string().nullable().optional() }).passthrough(), z.string(), z.null()]).optional(),
}).passthrough();

const webhookSchema = z.object({
  type: z.enum(['transaction.created', 'transaction.updated']),
  data: transactionSchema,
});

export function isNewerSnapshot(incoming: MonzoTransaction, stored: MonzoTransaction): boolean {
  const incomingTime = Date.parse(incoming.updated);
  const storedTime = Date.parse(stored.updated);
  return incomingTime > storedTime ||
    (incomingTime === storedTime && incoming.settled.length > 0 && stored.settled.length === 0);
}

export interface WebhookOptions {
  secret: string;
  accountMappings: ReadonlyMap<string, string>;
  scheduleImport: (actualAccountId: string, transaction: MonzoTransaction) => void;
  log?: (message: string) => void;
}

export function createApp(options: WebhookOptions): Express {
  const app = express();
  const snapshots = new Map<string, MonzoTransaction>();
  const path = `/monzo/${options.secret}`;

  app.post(path, express.json({ limit: '128kb', strict: true }), (request, response) => {
    const parsed = webhookSchema.safeParse(request.body);
    if (!parsed.success) {
      options.log?.('Rejected malformed webhook payload');
      response.sendStatus(400);
      return;
    }

    const transaction = parsed.data.data;
    const actualAccountId = options.accountMappings.get(transaction.account_id);
    if (!actualAccountId) {
      options.log?.('Rejected webhook for unexpected account');
      response.sendStatus(400);
      return;
    }

    if (transaction.decline_reason) {
      options.log?.(`Ignored declined transaction …${transaction.id.slice(-6)}`);
      response.sendStatus(204);
      return;
    }

    if (transaction.include_in_spending === false) {
      options.log?.(`Ignored transaction …${transaction.id.slice(-6)} because include_in_spending=false`);
      response.sendStatus(204);
      return;
    }

    const snapshotKey = `${transaction.account_id}:${transaction.id}`;
    const stored = snapshots.get(snapshotKey);
    if (!stored || isNewerSnapshot(transaction, stored)) {
      snapshots.set(snapshotKey, transaction);
      options.scheduleImport(actualAccountId, transaction);
      options.log?.(`Accepted ${parsed.data.type} transaction …${transaction.id.slice(-6)}`);
    }

    response.sendStatus(204);
  });

  app.use((_request, response) => response.sendStatus(404));
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    options.log?.('Rejected malformed webhook request');
    response.sendStatus(error ? 400 : 500);
  });
  return app;
}
