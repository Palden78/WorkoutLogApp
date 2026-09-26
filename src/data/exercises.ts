export type ExerciseType = "strength" | "cardio";

export type ExerciseDefinition = {
  id: string;
  name: string;
  category: string;
  type: ExerciseType;
};

export const exercises: ExerciseDefinition[] = [
  // Chest
  {
    id: "bench-press",
    name: "Bench Press",
    category: "Chest",
    type: "strength",
  },
  {
    id: "incline-bench-press",
    name: "Incline Bench Press",
    category: "Chest",
    type: "strength",
  },
  {
    id: "dumbbell-fly",
    name: "Dumbbell Fly",
    category: "Chest",
    type: "strength",
  },

  // Back
  {
    id: "pull-up",
    name: "Pull Up",
    category: "Back",
    type: "strength",
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    category: "Back",
    type: "strength",
  },
  {
    id: "barbell-row",
    name: "Barbell Row",
    category: "Back",
    type: "strength",
  },

  // Shoulders
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    category: "Shoulders",
    type: "strength",
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    category: "Shoulders",
    type: "strength",
  },

  // Legs
  {
    id: "squat",
    name: "Squat",
    category: "Legs",
    type: "strength",
  },
  {
    id: "leg-press",
    name: "Leg Press",
    category: "Legs",
    type: "strength",
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    category: "Legs",
    type: "strength",
  },

  // Arms
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    category: "Arms",
    type: "strength",
  },
  {
    id: "hammer-curl",
    name: "Hammer Curl",
    category: "Arms",
    type: "strength",
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    category: "Arms",
    type: "strength",
  },

  // Core
  {
    id: "crunch",
    name: "Crunch",
    category: "Core",
    type: "strength",
  },
  {
    id: "leg-raise",
    name: "Leg Raise",
    category: "Core",
    type: "strength",
  },
  {
    id: "plank",
    name: "Plank",
    category: "Core",
    type: "cardio",
  },

  // Cardio
  {
    id: "running",
    name: "Running",
    category: "Cardio",
    type: "cardio",
  },
  {
    id: "cycling",
    name: "Cycling",
    category: "Cardio",
    type: "cardio",
  },
  {
    id: "rowing",
    name: "Rowing",
    category: "Cardio",
    type: "cardio",
  },
  {
    id: "swimming",
    name: "Swimming",
    category: "Cardio",
    type: "cardio",
  },
];