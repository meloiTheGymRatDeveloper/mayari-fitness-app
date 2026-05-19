import type { Exercise } from '../types/database';

export const fallbackExercises: Exercise[] = [
  { id: 'bench-press', name: 'Bench Press', muscle_group: 'push', muscles_primary: ['Pectoralis major'], muscles_secondary: ['Triceps brachii', 'Anterior deltoid'], equipment: ['Barbell', 'Bench'], category: 'Chest', description: 'Compound chest press with barbell.' },
  { id: 'squat', name: 'Squat', muscle_group: 'legs', muscles_primary: ['Quadriceps femoris'], muscles_secondary: ['Gluteus maximus', 'Biceps femoris'], equipment: ['Barbell'], category: 'Legs', description: 'Compound lower body barbell squat.' },
  { id: 'deadlift', name: 'Deadlift', muscle_group: 'pull', muscles_primary: ['Gluteus maximus', 'Biceps femoris'], muscles_secondary: ['Latissimus dorsi', 'Trapezius'], equipment: ['Barbell'], category: 'Back', description: 'Hip-hinge compound pull.' },
  { id: 'overhead-press', name: 'Overhead Press', muscle_group: 'push', muscles_primary: ['Anterior deltoid'], muscles_secondary: ['Triceps brachii'], equipment: ['Barbell'], category: 'Shoulders', description: 'Standing barbell shoulder press.' },
  { id: 'barbell-row', name: 'Barbell Row', muscle_group: 'pull', muscles_primary: ['Latissimus dorsi'], muscles_secondary: ['Biceps brachii', 'Trapezius'], equipment: ['Barbell'], category: 'Back', description: 'Bent-over barbell row.' },
  { id: 'pull-up', name: 'Pull-up', muscle_group: 'pull', muscles_primary: ['Latissimus dorsi'], muscles_secondary: ['Biceps brachii'], equipment: ['Pull-up bar'], category: 'Back', description: 'Bodyweight vertical pull.' },
  { id: 'dip', name: 'Dip', muscle_group: 'push', muscles_primary: ['Pectoralis major', 'Triceps brachii'], muscles_secondary: ['Anterior deltoid'], equipment: ['Pull-up bar'], category: 'Chest', description: 'Bodyweight dip for chest and triceps.' },
  { id: 'lunge', name: 'Lunge', muscle_group: 'legs', muscles_primary: ['Quadriceps femoris'], muscles_secondary: ['Gluteus maximus'], equipment: ['none'], category: 'Legs', description: 'Unilateral leg exercise.' },
  { id: 'leg-press', name: 'Leg Press', muscle_group: 'legs', muscles_primary: ['Quadriceps femoris'], muscles_secondary: ['Gluteus maximus', 'Biceps femoris'], equipment: ['Leg press machine'], category: 'Legs', description: 'Machine compound leg press.' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle_group: 'legs', muscles_primary: ['Biceps femoris'], muscles_secondary: ['Gluteus maximus'], equipment: ['Barbell'], category: 'Legs', description: 'Hip-hinge hamstring focus.' },
  { id: 'plank', name: 'Plank', muscle_group: 'core', muscles_primary: ['Rectus abdominis'], muscles_secondary: ['Obliquus externus abdominis'], equipment: ['none'], category: 'Abs', description: 'Static core stability hold.' },
  { id: 'incline-bench', name: 'Incline Bench Press', muscle_group: 'push', muscles_primary: ['Pectoralis major'], muscles_secondary: ['Anterior deltoid', 'Triceps brachii'], equipment: ['Barbell', 'Incline bench'], category: 'Chest', description: 'Upper chest focused bench press.' },
  { id: 'cable-row', name: 'Cable Row', muscle_group: 'pull', muscles_primary: ['Latissimus dorsi'], muscles_secondary: ['Biceps brachii'], equipment: ['Cable machine'], category: 'Back', description: 'Seated cable row for mid-back.' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle_group: 'pull', muscles_primary: ['Latissimus dorsi'], muscles_secondary: ['Biceps brachii'], equipment: ['Cable machine'], category: 'Back', description: 'Cable lat pulldown.' },
  { id: 'leg-curl', name: 'Leg Curl', muscle_group: 'legs', muscles_primary: ['Biceps femoris'], muscles_secondary: [], equipment: ['Leg curl machine'], category: 'Legs', description: 'Machine hamstring curl.' },
  { id: 'calf-raise', name: 'Calf Raise', muscle_group: 'legs', muscles_primary: ['Gastrocnemius'], muscles_secondary: [], equipment: ['none'], category: 'Calves', description: 'Standing calf raise.' },
];
