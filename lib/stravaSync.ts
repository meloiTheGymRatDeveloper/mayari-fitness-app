import type { WorkoutType } from '../types/database';

interface StravaActivity {
  id: number;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number; // metres
  average_speed: number; // m/s
  total_elevation_gain: number;
  average_heartrate?: number;
  kilojoules?: number | null;
}

interface MappedSession {
  user_id: string;
  workout_type: WorkoutType;
  started_at: string;
  ended_at: string;
  total_volume_kg: number;
  notes: string | null;
}

interface MappedMetrics {
  distance_km: number;
  duration_seconds: number;
  avg_pace_min_per_km: number | null;
  avg_speed_kmh: number | null;
  elevation_gain_m: number;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  strava_activity_id: string;
  strava_synced_at: string;
  session_subtype: 'outdoor';
}

export function mapStravaActivity(
  activity: StravaActivity,
  userId: string,
): { session: MappedSession; metrics: MappedMetrics } {
  const workoutType: WorkoutType = activity.type === 'Ride' ? 'cycling' : 'running';
  const startedAt = activity.start_date;
  const endedAt = new Date(
    new Date(startedAt).getTime() + activity.elapsed_time * 1000,
  ).toISOString();

  const distanceKm = activity.distance / 1000;
  const avgSpeedKmh = activity.average_speed * 3.6;
  const avgPaceMinPerKm =
    workoutType === 'running' && activity.average_speed > 0
      ? 1 / (activity.average_speed / 1000 * 60)
      : null;

  const caloriesBurned = activity.kilojoules
    ? Math.round(activity.kilojoules * 0.239)
    : null;

  return {
    session: {
      user_id: userId,
      workout_type: workoutType,
      started_at: startedAt,
      ended_at: endedAt,
      total_volume_kg: 0,
      notes: `Imported from Strava — ${activity.type}`,
    },
    metrics: {
      distance_km: distanceKm,
      duration_seconds: activity.elapsed_time,
      avg_pace_min_per_km: avgPaceMinPerKm,
      avg_speed_kmh: avgSpeedKmh,
      elevation_gain_m: activity.total_elevation_gain,
      calories_burned: caloriesBurned,
      avg_heart_rate: activity.average_heartrate ?? null,
      strava_activity_id: String(activity.id),
      strava_synced_at: new Date().toISOString(),
      session_subtype: 'outdoor',
    },
  };
}
