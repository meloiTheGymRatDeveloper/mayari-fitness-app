import { mapStravaActivity } from '../../lib/stravaSync';

describe('mapStravaActivity', () => {
  const userId = 'user-uuid-123';

  it('maps a Strava Run activity to session + metrics shape', () => {
    const activity = {
      id: 12345678,
      type: 'Run',
      start_date: '2026-06-01T06:00:00Z',
      elapsed_time: 1800,
      distance: 5000,
      average_speed: 2.78,
      total_elevation_gain: 45,
      average_heartrate: 155,
      kilojoules: null,
    };
    const result = mapStravaActivity(activity, userId);
    expect(result.session.workout_type).toBe('running');
    expect(result.session.user_id).toBe(userId);
    expect(result.metrics.distance_km).toBeCloseTo(5.0, 1);
    expect(result.metrics.duration_seconds).toBe(1800);
    expect(result.metrics.strava_activity_id).toBe('12345678');
    expect(result.metrics.avg_pace_min_per_km).toBeCloseTo(6.0, 0);
  });

  it('maps a Strava Ride activity to session + metrics shape', () => {
    const activity = {
      id: 99999,
      type: 'Ride',
      start_date: '2026-06-01T07:00:00Z',
      elapsed_time: 3600,
      distance: 30000,
      average_speed: 8.33,
      total_elevation_gain: 200,
      average_heartrate: 140,
      kilojoules: 900,
    };
    const result = mapStravaActivity(activity, userId);
    expect(result.session.workout_type).toBe('cycling');
    expect(result.metrics.distance_km).toBeCloseTo(30.0, 1);
    expect(result.metrics.avg_speed_kmh).toBeCloseTo(30.0, 0);
    expect(result.metrics.calories_burned).toBeCloseTo(215, -1);
  });
});
