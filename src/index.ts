import { initializeActual, importTransaction, shutdownActual } from './actual.js';
import { loadConfig } from './config.js';
import { ImportQueue } from './import-queue.js';
import { createApp } from './webhook.js';

const PORT = 8787;
// Docker publishes this only on host loopback; the process must listen on the
// container interface for Docker's port forwarding to reach it.
const HOST = '0.0.0.0';

async function main(): Promise<void> {
  const config = loadConfig();
  await initializeActual(config);
  console.info('Actual initialized successfully');

  const queue = new ImportQueue(
    (actualAccountId, transaction) => importTransaction(actualAccountId, transaction),
    (id, error) => console.error(`Actual import failed for transaction …${id.slice(-6)}`, error),
  );
  const app = createApp({
    secret: config.WEBHOOK_SECRET,
    accountMappings: config.accountMappings,
    scheduleImport: (actualAccountId, transaction) => queue.schedule(actualAccountId, transaction),
    log: message => console.info(message),
  });
  const server = app.listen(PORT, HOST, () => console.info(`Webhook receiver listening on ${HOST}:${PORT}`));

  const shutdown = async () => {
    server.close(async () => {
      await queue.idle();
      await shutdownActual();
      process.exit(0);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch(error => {
  console.error('Startup failed', error);
  process.exitCode = 1;
});
