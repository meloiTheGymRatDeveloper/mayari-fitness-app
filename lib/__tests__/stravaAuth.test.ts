import { mapStravaTokenResponse } from '../stravaAuth';

describe('mapStravaTokenResponse', () => {
  it('maps Strava token response to DB row shape', () => {
    const now = Math.floor(Date.now() / 1000);
    const stravaRes = {
      access_token: 'at123',
      refresh_token: 'rt456',
      expires_at: now + 21600,
      athlete: { id: 98765 },
    };
    const result = mapStravaTokenResponse(stravaRes);
    expect(result.access_token).toBe('at123');
    expect(result.refresh_token).toBe('rt456');
    expect(result.strava_athlete_id).toBe(98765);
    expect(result.token_expires_at).toBe(new Date((now + 21600) * 1000).toISOString());
  });
});
