import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/theme';
import { subDays, toDateStr, shortDate, getMonday } from '../lib/analyticsHelpers';

function buildWeeklySessions(
  sessions: { started_at: string; total_volume_kg: number }[],
  numWeeks: number,
  plannedPerWeek: number,
  now: Date,
): {
  volData: { value: number; label: string; frontColor: string }[];
  freqData: { value: number; label: string; frontColor: string }[];
} {
  const volumeMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  const labels: string[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const key = toDateStr(getMonday(subDays(now, i * 7)));
    volumeMap[key] = 0;
    countMap[key] = 0;
    labels.push(shortDate(key));
  }

  sessions.forEach(s => {
    const key = toDateStr(getMonday(new Date(s.started_at)));
    if (key in volumeMap) {
      volumeMap[key] += s.total_volume_kg;
      countMap[key]++;
    }
  });

  const volData = Object.keys(volumeMap).map((key, i) => ({
    value: Math.round(volumeMap[key]),
    label: labels[i],
    frontColor: colors.brand.primary,
  }));

  const freqData = Object.keys(countMap).map((key, i) => ({
    value: countMap[key],
    label: labels[i],
    frontColor: countMap[key] >= plannedPerWeek ? colors.success : colors.error,
  }));

  return { volData, freqData };
}

export interface WorkoutAnalytics {
  weeklyVolData: { value: number; label: string; frontColor: string }[];
  weeklyFreqData: { value: number; label: string; frontColor: string }[];
  muscleData: { value: number; color: string; text: string }[];
  prCards: { exercise: string; weight_kg: number; reps: number; date: string }[];
  plannedDaysPerWeek: number;
  hasData: boolean;
  uniqueWorkoutDays: number;
}

export function useWorkoutAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<WorkoutAnalytics>({
    queryKey: ['workout_analytics', userId],
    queryFn: async (): Promise<WorkoutAnalytics> => {
      if (!userId)
        return {
          weeklyVolData: [],
          weeklyFreqData: [],
          muscleData: [],
          prCards: [],
          plannedDaysPerWeek: 3,
          hasData: false,
          uniqueWorkoutDays: 0,
        };

      const now = new Date();
      const d30 = subDays(now, 30);
      const d84 = subDays(now, 84);
      const wDays = profile?.workout_days?.length ?? 3;

      const [sessionRes, prRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id, started_at, total_volume_kg')
          .eq('user_id', userId)
          .gte('started_at', d84.toISOString())
          .order('started_at', { ascending: true }),
        supabase
          .from('personal_records')
          .select('exercise_name, weight_kg, reps, achieved_at')
          .eq('user_id', userId),
      ]);

      if (sessionRes.error) throw sessionRes.error;
      if (prRes.error) throw prRes.error;

      const sessions = sessionRes.data ?? [];
      const { volData, freqData } = buildWeeklySessions(sessions, 12, wDays, now);

      const last30Sessions = sessions.filter(
        (s) => s.started_at >= d30.toISOString(),
      );
      const uniqueWorkoutDays = new Set(
        last30Sessions.map((s) => s.started_at.split('T')[0]),
      ).size;

      // Phase 2: muscle group breakdown — only if sessions exist in last 30 days
      let muscleData: { value: number; color: string; text: string }[] = [];

      const last30SessionIds = last30Sessions.map((s) => s.id);
      if (last30SessionIds.length > 0) {
        const setsRes = await supabase
          .from('workout_sets')
          .select('weight_kg, reps, exercise_id')
          .in('session_id', last30SessionIds);

        if (setsRes.error) throw setsRes.error;

        const exerciseIds = [
          ...new Set((setsRes.data ?? []).map((s) => s.exercise_id)),
        ];
        let muscleMap: Record<string, string> = {};

        if (exerciseIds.length > 0) {
          const exRes = await supabase
            .from('exercises')
            .select('id, muscle_group')
            .in('id', exerciseIds);
          if (exRes.error) throw exRes.error;
          muscleMap = Object.fromEntries(
            (exRes.data ?? []).map((e) => [e.id, e.muscle_group]),
          );
        }

        const mgVolume: Record<string, number> = {
          push: 0,
          pull: 0,
          legs: 0,
          core: 0,
        };
        (setsRes.data ?? []).forEach((s) => {
          const mg = muscleMap[s.exercise_id] ?? 'push';
          mgVolume[mg] = (mgVolume[mg] ?? 0) + s.weight_kg * s.reps;
        });

        const totalVol = Object.values(mgVolume).reduce((a, b) => a + b, 0);
        if (totalVol > 0) {
          muscleData = (
            [
              {
                value: Math.round((mgVolume.push / totalVol) * 100),
                color: colors.brand.primary,
                text: 'Push',
              },
              {
                value: Math.round((mgVolume.pull / totalVol) * 100),
                color: colors.brand.secondary,
                text: 'Pull',
              },
              {
                value: Math.round((mgVolume.legs / totalVol) * 100),
                color: colors.brand.accent,
                text: 'Legs',
              },
              {
                value: Math.round((mgVolume.core / totalVol) * 100),
                color: colors.success,
                text: 'Core',
              },
            ] as { value: number; color: string; text: string }[]
          ).filter((d) => d.value > 0);
        }
      }

      // PR cards — top 5 key lifts only
      const keyLifts = [
        'Bench Press',
        'Squat',
        'Deadlift',
        'Overhead Press',
        'Barbell Row',
      ];
      const prMap: Record<
        string,
        { weight_kg: number; reps: number; achieved_at: string }
      > = {};
      (prRes.data ?? []).forEach((pr) => {
        if (keyLifts.includes(pr.exercise_name)) prMap[pr.exercise_name] = pr;
      });
      const prCards = keyLifts
        .filter((name) => prMap[name])
        .map((name) => ({
          exercise: name,
          ...prMap[name]!,
          date: shortDate(prMap[name]!.achieved_at),
        }));

      return {
        weeklyVolData: volData,
        weeklyFreqData: freqData,
        muscleData,
        prCards,
        plannedDaysPerWeek: wDays,
        hasData: sessions.length > 0,
        uniqueWorkoutDays,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
