import type { RunSessionType } from '../types/database';

export interface RunSession {
  session: number;
  type: RunSessionType;
  distanceKm: number;
  description: string;
  targetPaceMinPerKm?: number;
}

export interface RunningWeek {
  week: number;
  sessions: RunSession[];
}

export interface RunningPlan {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  isOpenEnded?: boolean;
  weeks: RunningWeek[];
}

export const runningPlans: RunningPlan[] = [
  {
    id: 'c25k',
    name: 'Couch to 5K',
    description: 'Go from zero to running 5 km in 8 weeks. 3 sessions per week.',
    totalWeeks: 8,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', distanceKm: 2.5, description: 'Alternate 60s run / 90s walk × 8', targetPaceMinPerKm: 8 },
        { session: 2, type: 'easy', distanceKm: 2.5, description: 'Alternate 60s run / 90s walk × 8', targetPaceMinPerKm: 8 },
        { session: 3, type: 'easy', distanceKm: 2.5, description: 'Alternate 60s run / 90s walk × 8', targetPaceMinPerKm: 8 },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', distanceKm: 3, description: 'Alternate 90s run / 2 min walk × 6', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'easy', distanceKm: 3, description: 'Alternate 90s run / 2 min walk × 6', targetPaceMinPerKm: 7.5 },
        { session: 3, type: 'easy', distanceKm: 3, description: 'Alternate 90s run / 2 min walk × 6', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', distanceKm: 3, description: '2× (90s run, 90s walk, 3 min run, 3 min walk)', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 3, description: '2× (90s run, 90s walk, 3 min run, 3 min walk)', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 3.5, description: '2× (90s run, 90s walk, 3 min run, 3 min walk)', targetPaceMinPerKm: 7 },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'easy', distanceKm: 3.5, description: '3 min run, 90s walk, 5 min run, 2.5 min walk, 3 min run, 90s walk, 5 min run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 3.5, description: '3 min run, 90s walk, 5 min run, 2.5 min walk, 3 min run, 90s walk, 5 min run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 4, description: '3 min run, 90s walk, 5 min run, 2.5 min walk, 3 min run, 90s walk, 5 min run', targetPaceMinPerKm: 7 },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: '5 min run, 3 min walk × 3', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 4, description: '8 min run, 5 min walk, 8 min run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 4.5, description: '20 min non-stop run — conversational pace', targetPaceMinPerKm: 7 },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: '5 min run, 3 min walk × 3', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 4.5, description: '10 min run, 3 min walk, 10 min run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 5, description: '22 min non-stop run', targetPaceMinPerKm: 7 },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: '25 min non-stop run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 5, description: '25 min non-stop run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 5, description: '25 min non-stop run', targetPaceMinPerKm: 7 },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: '28 min non-stop run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 5, description: '28 min non-stop run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 5, description: '30 min non-stop run — you made it!', targetPaceMinPerKm: 7 },
      ]},
    ],
  },
  {
    id: '5k_intermediate',
    name: '5K Intermediate',
    description: 'Improve your 5K time with tempo and interval work. 3 sessions per week, 6 weeks.',
    totalWeeks: 6,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run at conversational pace', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 4, description: '4 × 400m at hard effort with 90s rest', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy long run', targetPaceMinPerKm: 7 },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 5, description: '20 min tempo run — comfortably hard', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 7, description: 'Easy long run', targetPaceMinPerKm: 7 },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 5, description: '5 × 400m at hard effort with 90s rest', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 8, description: 'Long easy run', targetPaceMinPerKm: 7 },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 6, description: '25 min tempo run', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 8, description: 'Long easy run', targetPaceMinPerKm: 7 },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Recovery run', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'interval', distanceKm: 5, description: '6 × 400m fast', targetPaceMinPerKm: 5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Easy shakeout', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 3, description: 'Short easy run + strides', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 5, description: 'Race day — run your 5K!', targetPaceMinPerKm: 5.5 },
      ]},
    ],
  },
  {
    id: '10k_beginner',
    name: '10K Beginner',
    description: 'Build to 10 km from a 5 km base. 3-4 sessions per week, 10 weeks.',
    totalWeeks: 10,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 4, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'long', distanceKm: 6, description: 'Slow long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 5, description: '15 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 7, description: 'Slow long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 5, description: '5 × 400m', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 8, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Recovery', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'long', distanceKm: 7, description: 'Reduced long run — recovery week', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 6, description: '20 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 9, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 6, description: '6 × 400m', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 10, description: 'First 10 km long run!', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 6, description: '25 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 9, description: 'Recovery long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 7, description: '4 × 800m', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 11, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 9, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 7, description: '30 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 10, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 10, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Easy shakeout', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 3, description: 'Short run + strides', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 10, description: '10K race day — go!', targetPaceMinPerKm: 6 },
      ]},
    ],
  },
  {
    id: 'half_marathon',
    name: 'Half Marathon Prep',
    description: 'Train for 21.1 km from a 10 km base. 4 sessions per week, 12 weeks.',
    totalWeeks: 12,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 6, description: '4 × 800m at 10K effort', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 5, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 12, description: 'Long slow run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 8, description: '30 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 13, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 8, description: '5 × 1km at 10K pace', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 14, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Recovery easy', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'easy', distanceKm: 6, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 3, type: 'easy', distanceKm: 5, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 11, description: 'Recovery long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', distanceKm: 7, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 9, description: '35 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 15, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', distanceKm: 7, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 9, description: '6 × 1km at race pace', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 7, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 16, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Easy', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'tempo', distanceKm: 8, description: '30 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 13, description: 'Recovery long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'easy', distanceKm: 8, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 10, description: '4 × 2km at half marathon pace', targetPaceMinPerKm: 6 },
        { session: 3, type: 'easy', distanceKm: 7, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 18, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 9, sessions: [
        { session: 1, type: 'easy', distanceKm: 8, description: 'Easy run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 10, description: '40 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 7, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 19, description: 'Longest long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 10, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Recovery easy', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'interval', distanceKm: 8, description: '4 × 1km race pace', targetPaceMinPerKm: 6 },
        { session: 3, type: 'easy', distanceKm: 6, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 14, description: 'Taper long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 11, sessions: [
        { session: 1, type: 'easy', distanceKm: 6, description: 'Easy taper', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 6, description: '20 min tempo — feel strong', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'easy', distanceKm: 5, description: 'Easy', targetPaceMinPerKm: 7 },
        { session: 4, type: 'long', distanceKm: 10, description: 'Short long run — save the legs', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 12, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Easy shakeout', targetPaceMinPerKm: 7 },
        { session: 2, type: 'easy', distanceKm: 3, description: 'Short strides', targetPaceMinPerKm: 7 },
        { session: 3, type: 'rest', distanceKm: 0, description: 'Rest day — hydrate and sleep' },
        { session: 4, type: 'easy', distanceKm: 21.1, description: 'Half marathon race day!', targetPaceMinPerKm: 6.5 },
      ]},
    ],
  },
  {
    id: 'general_fitness',
    name: 'General Fitness Running',
    description: 'Maintain and improve aerobic fitness with a flexible 3-session-per-week rotation. Open-ended.',
    totalWeeks: 4,
    isOpenEnded: true,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Easy zone 2 run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 5, description: '20 min tempo effort', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 7, description: 'Long easy run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy zone 2 run', targetPaceMinPerKm: 7 },
        { session: 2, type: 'interval', distanceKm: 5, description: '4 × 400m fast with 90s rest', targetPaceMinPerKm: 5 },
        { session: 3, type: 'long', distanceKm: 8, description: 'Long easy run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', distanceKm: 5, description: 'Easy zone 2', targetPaceMinPerKm: 7 },
        { session: 2, type: 'tempo', distanceKm: 6, description: '25 min tempo', targetPaceMinPerKm: 5.5 },
        { session: 3, type: 'long', distanceKm: 9, description: 'Long run', targetPaceMinPerKm: 7.5 },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'easy', distanceKm: 4, description: 'Recovery easy', targetPaceMinPerKm: 7.5 },
        { session: 2, type: 'interval', distanceKm: 5, description: '5 × 400m', targetPaceMinPerKm: 5 },
        { session: 3, type: 'long', distanceKm: 8, description: 'Long easy run — repeat cycle', targetPaceMinPerKm: 7.5 },
      ]},
    ],
  },
];

export function getRunningPlan(id: string): RunningPlan | undefined {
  return runningPlans.find(p => p.id === id);
}

export function getRunningWeek(plan: RunningPlan, week: number): RunningWeek | undefined {
  if (plan.isOpenEnded) {
    const cycleWeek = ((week - 1) % plan.totalWeeks) + 1;
    return plan.weeks.find(w => w.week === cycleWeek);
  }
  return plan.weeks.find(w => w.week === week);
}
