import { extractStravaCode } from '../../lib/stravaCallbackHelpers';

describe('extractStravaCode', () => {
  it('returns the code param when present', () => {
    expect(extractStravaCode('mayari://strava/callback?code=abc123&scope=read')).toBe('abc123');
  });

  it('returns null when code param is missing', () => {
    expect(extractStravaCode('mayari://strava/callback?error=access_denied')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractStravaCode('')).toBeNull();
  });
});
