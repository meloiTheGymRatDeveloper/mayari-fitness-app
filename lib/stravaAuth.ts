export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix seconds
  athlete: { id: number };
}

export interface StravaConnectionRow {
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  token_expires_at: string; // ISO 8601
}

export function mapStravaTokenResponse(res: StravaTokenResponse): StravaConnectionRow {
  return {
    strava_athlete_id: res.athlete.id,
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    token_expires_at: new Date(res.expires_at * 1000).toISOString(),
  };
}
