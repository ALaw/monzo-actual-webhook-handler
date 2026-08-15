import { describe, expect, it } from 'vitest';
import { parseAccountMappings } from '../src/config.js';

describe('account mapping configuration', () => {
  it('parses Current and Flex mappings', () => {
    expect([...parseAccountMappings('acc_current=actual-current, acc_flex=actual-flex')]).toEqual([
      ['acc_current', 'actual-current'],
      ['acc_flex', 'actual-flex'],
    ]);
  });

  it.each(['', 'acc_current', '=actual-current', 'acc_current=', 'acc_current=actual=extra'])('rejects malformed mapping %j', value => {
    expect(() => parseAccountMappings(value)).toThrow(/ACCOUNT_MAPPINGS/);
  });

  it('rejects duplicate Monzo account IDs', () => {
    expect(() => parseAccountMappings('acc_current=actual-one,acc_current=actual-two')).toThrow(/duplicate Monzo account ID/);
  });
});
