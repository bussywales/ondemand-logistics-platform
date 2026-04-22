import { describe, expect, it } from 'vitest';
import { BrowserAuthTimeoutError, withTimeout } from './auth';

describe('auth restore timeout helper', () => {
  it('resolves when the wrapped promise completes before timeout', async () => {
    await expect(
      withTimeout(Promise.resolve('ok'), {
        timeoutMs: 100,
        action: 'session restore'
      })
    ).resolves.toBe('ok');
  });

  it('rejects with a typed timeout error when the promise hangs', async () => {
    await expect(
      withTimeout(
        new Promise<string>(() => {
          // intentionally unresolved
        }),
        {
          timeoutMs: 10,
          action: 'session restore'
        }
      )
    ).rejects.toBeInstanceOf(BrowserAuthTimeoutError);
  });
});
