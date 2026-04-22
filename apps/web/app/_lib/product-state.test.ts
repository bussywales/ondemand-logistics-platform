import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBusinessSession, readBusinessSession, saveBusinessSession } from './product-state';

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    })
  };
}

describe('business session storage', () => {
  beforeEach(() => {
    const localStorage = makeStorage();
    vi.stubGlobal('window', { localStorage });
  });

  it('persists and reads the business session', () => {
    const session = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 123,
      userId: 'user-1',
      email: 'ops@example.com',
      context: {
        userId: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops',
        onboarded: true,
        currentOrg: {
          id: 'org-1',
          name: 'Org',
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          city: null,
          createdByUserId: 'user-1',
          createdAt: new Date().toISOString()
        },
        memberships: []
      }
    };

    saveBusinessSession(session);
    expect(readBusinessSession()).toEqual(session);
  });

  it('clears the stored business session on logout', () => {
    saveBusinessSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 123,
      userId: 'user-1',
      email: 'ops@example.com',
      context: {
        userId: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops',
        onboarded: false,
        currentOrg: null,
        memberships: []
      }
    });

    clearBusinessSession();
    expect(readBusinessSession()).toBeNull();
  });
});
