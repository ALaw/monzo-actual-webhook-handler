import { z } from 'zod';

const configSchema = z.object({
  WEBHOOK_SECRET: z.string().min(32),
  ACCOUNT_MAPPINGS: z.string().min(1),
  ACTUAL_SERVER_URL: z.url(),
  ACTUAL_PASSWORD: z.string().min(1),
  ACTUAL_SYNC_ID: z.string().min(1),
  ACTUAL_ENCRYPTION_PASSWORD: z.string().optional(),
});

type RawConfig = z.infer<typeof configSchema>;

export type Config = Omit<RawConfig, 'ACCOUNT_MAPPINGS'> & {
  accountMappings: ReadonlyMap<string, string>;
};

export function parseAccountMappings(value: string): ReadonlyMap<string, string> {
  const mappings = new Map<string, string>();
  for (const pair of value.split(',')) {
    const parts = pair.split('=');
    if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) {
      throw new Error('ACCOUNT_MAPPINGS must contain comma-separated monzo-account-id=actual-account-id pairs');
    }

    const monzoAccountId = parts[0].trim();
    const actualAccountId = parts[1].trim();
    if (mappings.has(monzoAccountId)) {
      throw new Error(`ACCOUNT_MAPPINGS contains duplicate Monzo account ID: ${monzoAccountId}`);
    }
    mappings.set(monzoAccountId, actualAccountId);
  }
  return mappings;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const { ACCOUNT_MAPPINGS, ...config } = configSchema.parse(environment);
  return { ...config, accountMappings: parseAccountMappings(ACCOUNT_MAPPINGS) };
}
