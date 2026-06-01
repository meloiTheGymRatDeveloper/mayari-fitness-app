import type { CycleSessionType, CardioSessionSubtype } from '../types/database';

export interface IndoorInterval {
  durationMin: number;
  effort: 'easy' | 'hard' | 'all_out';
  repetitions: number;
  restMin: number;
}

export interface CycleSession {
  session: number;
  type: CycleSessionType;
  preferredSubtype: CardioSessionSubtype | 'either';
  distanceKm?: number;
  durationMin?: number;
  description: string;
  intervals?: IndoorInterval[];
}

export interface CyclingWeek {
  week: number;
  sessions: CycleSession[];
}

export interface CyclingPlan {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  weeks: CyclingWeek[];
}

export const cyclingPlans: CyclingPlan[] = [
  {
    id: 'endurance_base',
    name: 'Endurance Base',
    description: 'Build aerobic base with steady Zone 2 rides. 3 sessions/week, 8 weeks.',
    totalWeeks: 8,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy Zone 2 ride — conversational pace' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 45, description: 'Steady indoor ride', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 25, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Longer outdoor ride at easy pace' },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Easy Zone 2' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 50, description: 'Steady indoor', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 30, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Long outdoor ride' },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Easy Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 50, description: '3 × 5 min hard efforts with 3 min easy', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'hard', repetitions: 3, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Long outdoor ride' },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 15, durationMin: 40, description: 'Recovery — very easy spin' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 40, description: 'Easy recovery ride', intervals: [
          { durationMin: 40, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Shorter long ride — recovery week' },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Easy Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 55, description: '4 × 5 min hard with 3 min easy', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'hard', repetitions: 4, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 45, durationMin: 100, description: 'Long outdoor ride' },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 28, durationMin: 65, description: 'Easy Zone 2' },
        { session: 2, type: 'tempo', preferredSubtype: 'indoor', durationMin: 60, description: '20 min sustained tempo effort', intervals: [
          { durationMin: 15, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 20, effort: 'hard', repetitions: 1, restMin: 0 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 5 },
          { durationMin: 10, effort: 'hard', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 50, durationMin: 110, description: 'Longest outdoor ride so far' },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Easy Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 60, description: '5 × 5 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'hard', repetitions: 5, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 55, durationMin: 120, description: 'Peak long ride' },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 20, durationMin: 45, description: 'Easy taper spin' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 40, description: 'Easy ride', intervals: [
          { durationMin: 40, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Final long ride — you built your base!' },
      ]},
    ],
  },
  {
    id: 'interval_training',
    name: 'Interval Training',
    description: 'Boost power and speed with structured intervals. 3 sessions/week, 6 weeks.',
    totalWeeks: 6,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy warm-up ride' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 45, description: '4 × 3 min hard, 3 min easy', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 4, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Recovery outdoor ride' },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy ride' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 50, description: '5 × 3 min hard, 3 min easy', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 5, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy outdoor' },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 55, description: '4 × 4 min hard, 3 min easy', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 4, effort: 'hard', repetitions: 4, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Longer recovery ride' },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 15, durationMin: 40, description: 'Recovery spin' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 40, description: '3 × 3 min — recovery week lighter load', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 3, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Easy outdoor' },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Easy' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 60, description: '5 × 4 min hard, 2 min easy — peak load', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 4, effort: 'hard', repetitions: 5, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Longer recovery ride' },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy taper' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 45, description: '3 × 3 min all-out — test your fitness', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'all_out', repetitions: 3, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Final easy ride' },
      ]},
    ],
  },
  {
    id: 'weight_loss_cycling',
    name: 'Weight Loss Cycling',
    description: 'Maximize calorie burn with longer moderate rides and fat-burning intervals. 3-4 sessions/week, 8 weeks.',
    totalWeeks: 8,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Fat-burning Zone 2 — keeps you in fat-burn zone' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 40, description: '3 × 2 min hard intervals to boost metabolism', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 2, effort: 'hard', repetitions: 3, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Longer Zone 2 outdoor ride' },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 45, description: '4 × 2 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 2, effort: 'hard', repetitions: 4, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Long outdoor ride' },
        { session: 4, type: 'easy', preferredSubtype: 'either', distanceKm: 18, durationMin: 45, description: 'Bonus easy spin' },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 50, description: '4 × 3 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 4, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Long outdoor ride' },
        { session: 4, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy spin' },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 15, durationMin: 40, description: 'Recovery week — easy spin' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 40, description: 'Easy indoor', intervals: [
          { durationMin: 40, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Shorter long ride' },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 55, description: '5 × 3 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 5, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 45, durationMin: 100, description: 'Long ride' },
        { session: 4, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Easy spin' },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 55, description: '5 × 3 min all-out with 2 min rest', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'all_out', repetitions: 5, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 50, durationMin: 110, description: 'Long outdoor ride' },
        { session: 4, type: 'easy', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Zone 2 spin' },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Zone 2' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 60, description: '6 × 3 min hard — peak load week', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 6, restMin: 2 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 55, durationMin: 120, description: 'Peak long ride' },
        { session: 4, type: 'easy', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Easy spin' },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Zone 2 taper' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 40, description: 'Easy indoor', intervals: [
          { durationMin: 40, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Final long ride — track your progress!' },
      ]},
    ],
  },
  {
    id: 'sportive_prep',
    name: 'Sportive Prep',
    description: 'Prepare for a 80-100 km sportive event. 4 sessions/week, 12 weeks.',
    totalWeeks: 12,
    weeks: [
      { week: 1, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Easy base ride' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 50, description: '4 × 3 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 3, effort: 'hard', repetitions: 4, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Recovery ride' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Long ride' },
      ]},
      { week: 2, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 28, durationMin: 65, description: 'Easy ride' },
        { session: 2, type: 'tempo', preferredSubtype: 'indoor', durationMin: 55, description: '20 min tempo block', intervals: [
          { durationMin: 15, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 20, effort: 'hard', repetitions: 1, restMin: 0 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 5 },
          { durationMin: 5, effort: 'hard', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 28, durationMin: 65, description: 'Easy recovery' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 50, durationMin: 110, description: 'Long outdoor ride' },
      ]},
      { week: 3, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy ride' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 60, description: '5 × 4 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 4, effort: 'hard', repetitions: 5, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 55, durationMin: 120, description: 'Long ride' },
      ]},
      { week: 4, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 20, durationMin: 50, description: 'Recovery easy — rest week' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 45, description: 'Easy spin', intervals: [
          { durationMin: 45, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Easy outdoor' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Shorter long ride' },
      ]},
      { week: 5, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 65, description: '6 × 4 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 4, effort: 'hard', repetitions: 6, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 60, durationMin: 130, description: 'Long ride' },
      ]},
      { week: 6, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 2, type: 'tempo', preferredSubtype: 'indoor', durationMin: 65, description: '2 × 15 min tempo blocks', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 15, effort: 'hard', repetitions: 2, restMin: 5 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 65, durationMin: 140, description: 'Long ride' },
      ]},
      { week: 7, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 22, durationMin: 55, description: 'Recovery week — easy spin' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 50, description: 'Easy indoor', intervals: [
          { durationMin: 50, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 28, durationMin: 65, description: 'Easy outdoor' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 45, durationMin: 100, description: 'Shortened long ride' },
      ]},
      { week: 8, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 65, description: '3 × 8 min hard', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 8, effort: 'hard', repetitions: 3, restMin: 4 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 70, durationMin: 150, description: 'Peak long ride' },
      ]},
      { week: 9, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 2, type: 'tempo', preferredSubtype: 'indoor', durationMin: 70, description: '2 × 20 min hard — race simulation', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 20, effort: 'hard', repetitions: 2, restMin: 5 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 35, durationMin: 80, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 75, durationMin: 160, description: 'Near-race-distance long ride' },
      ]},
      { week: 10, sessions: [
        { session: 1, type: 'recovery', preferredSubtype: 'either', distanceKm: 25, durationMin: 60, description: 'Recovery easy' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 50, description: 'Easy spin', intervals: [
          { durationMin: 50, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy outdoor' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 50, durationMin: 110, description: 'Taper long ride' },
      ]},
      { week: 11, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 30, durationMin: 70, description: 'Easy taper' },
        { session: 2, type: 'interval', preferredSubtype: 'indoor', durationMin: 45, description: '3 × 5 min hard — stay sharp', intervals: [
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'hard', repetitions: 3, restMin: 3 },
          { durationMin: 10, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 25, durationMin: 60, description: 'Easy' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 40, durationMin: 90, description: 'Short long ride' },
      ]},
      { week: 12, sessions: [
        { session: 1, type: 'easy', preferredSubtype: 'outdoor', distanceKm: 20, durationMin: 50, description: 'Easy shakeout' },
        { session: 2, type: 'easy', preferredSubtype: 'indoor', durationMin: 30, description: 'Short activation ride', intervals: [
          { durationMin: 20, effort: 'easy', repetitions: 1, restMin: 0 },
          { durationMin: 5, effort: 'hard', repetitions: 2, restMin: 3 },
          { durationMin: 5, effort: 'easy', repetitions: 1, restMin: 0 },
        ]},
        { session: 3, type: 'recovery', preferredSubtype: 'either', distanceKm: 0, durationMin: 0, description: 'Rest — eat well, sleep early' },
        { session: 4, type: 'endurance', preferredSubtype: 'outdoor', distanceKm: 90, durationMin: 210, description: 'Sportive event day — enjoy the ride!' },
      ]},
    ],
  },
];

export function getCyclingPlan(id: string): CyclingPlan | undefined {
  return cyclingPlans.find(p => p.id === id);
}

export function getCyclingWeek(plan: CyclingPlan, week: number): CyclingWeek | undefined {
  return plan.weeks.find(w => w.week === week);
}
