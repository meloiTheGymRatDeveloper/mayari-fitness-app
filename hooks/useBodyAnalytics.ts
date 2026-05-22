import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { subDays, toDateStr, shortDate } from '../lib/analyticsHelpers';

function rollingAvg(
  data: { date: string; weight: number }[],
  window: number,
): { value: number }[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p.weight, 0) / slice.length;
    return { value: parseFloat(avg.toFixed(1)) };
  });
}

export interface BodyAnalytics {
  weightLineData: { value: number; label?: string }[];
  weightAvgData: { value: number }[];
  weightChange30: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  hasData: boolean;
}

export function useBodyAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<BodyAnalytics>({
    queryKey: ['body_analytics', userId],
    queryFn: async (): Promise<BodyAnalytics> => {
      if (!userId) return { weightLineData: [], weightAvgData: [], weightChange30: null, currentWeight: null, targetWeight: profile?.target_weight_kg ?? null, hasData: false };
      const now = new Date();
      const d90 = subDays(now, 90);
      const d30 = subDays(now, 30);

      const { data, error } = await supabase
        .from('body_measurements')
        .select('measured_at, weight_kg')
        .eq('user_id', userId!)
        .gte('measured_at', toDateStr(d90))
        .not('weight_kg', 'is', null)
        .order('measured_at', { ascending: true });

      if (error) throw error;

      const rawBody = (data ?? []).map((b) => ({
        date: b.measured_at,
        weight: b.weight_kg as number,
      }));

      if (rawBody.length < 2) {
        return {
          weightLineData: [],
          weightAvgData: [],
          weightChange30: null,
          currentWeight: rawBody.length === 1 ? rawBody[0].weight : null,
          targetWeight: profile?.target_weight_kg ?? null,
          hasData: false,
        };
      }

      const stride = Math.max(1, Math.ceil((rawBody.length - 1) / 11));
      const sampled = rawBody.filter(
        (_, i) => i % stride === 0 || i === rawBody.length - 1,
      );

      const weightLineData = sampled.map((p, i) => ({
        value: p.weight,
        label: i % 3 === 0 ? shortDate(p.date) : '',
      }));

      const weightAvgData = rollingAvg(sampled, 7);

      const last30Body = rawBody.filter((b) => b.date >= toDateStr(d30));
      const weightChange30 =
        last30Body.length >= 2
          ? parseFloat(
              (
                last30Body[last30Body.length - 1].weight - last30Body[0].weight
              ).toFixed(1),
            )
          : null;

      return {
        weightLineData,
        weightAvgData,
        weightChange30,
        currentWeight: rawBody[rawBody.length - 1].weight,
        targetWeight: profile?.target_weight_kg ?? null,
        hasData: true,
      };
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}
