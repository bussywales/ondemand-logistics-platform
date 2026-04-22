import { describe, expect, it } from 'vitest';
import { buildAuthRedirectTarget, isProtectedAppPath, sanitizePostAuthDestination } from './route-protection';

describe('route protection helpers', () => {
  it('recognizes protected app paths', () => {
    expect(isProtectedAppPath('/app')).toBe(true);
    expect(isProtectedAppPath('/app/jobs/123')).toBe(true);
    expect(isProtectedAppPath('/get-started')).toBe(false);
  });

  it('sanitizes post-auth destinations to app routes only', () => {
    expect(sanitizePostAuthDestination('/app/jobs/123')).toBe('/app/jobs/123');
    expect(sanitizePostAuthDestination('/contact')).toBe('/app');
    expect(sanitizePostAuthDestination(null)).toBe('/app');
  });

  it('builds onboarding redirects with encoded next paths', () => {
    expect(buildAuthRedirectTarget({ pathname: '/app/jobs/123', search: '?tab=payment' })).toBe(
      '/get-started?next=%2Fapp%2Fjobs%2F123%3Ftab%3Dpayment'
    );
  });
});
