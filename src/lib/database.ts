import type { SQLiteDatabase } from "expo-sqlite";
import type { ExerciseDefinition } from "../data/exercises";
function getLocalDateString() {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}
export type WorkoutStats = {
  total_workouts: number;
  month_workouts: number;
  total_sets: number;
};
export type ExerciseProgressSet = {
  workout_date: string;
  set_number: number;
  reps: number;
  weight: number | null;
};

export type ExercisePersonalRecord = {
  exercise_id: string;
  exercise_name: string;
  category: string;
  heaviest_weight: number;
  reps_at_heaviest_weight: number;
  estimated_one_rep_max: number;
};

export async function loadPersonalRecords(
  db: SQLiteDatabase
): Promise<ExercisePersonalRecord[]> {
  return await db.getAllAsync<ExercisePersonalRecord>(
    `
    SELECT
      exercise_definitions.id AS exercise_id,
      exercise_definitions.name AS exercise_name,
      exercise_definitions.category,
      sets.weight AS heaviest_weight,
      sets.reps AS reps_at_heaviest_weight,
      ROUND(
        sets.weight * (1 + sets.reps / 30.0),
        1
      ) AS estimated_one_rep_max
    FROM sets
    INNER JOIN workout_exercises
      ON sets.workout_exercise_id =
         workout_exercises.id
    INNER JOIN exercise_definitions
      ON exercise_definitions.id =
         workout_exercises.exercise_definition_id
    WHERE exercise_definitions.type = 'strength'
      AND sets.id = (
        SELECT inner_sets.id
        FROM sets AS inner_sets
        INNER JOIN workout_exercises AS inner_workout_exercises
          ON inner_sets.workout_exercise_id =
             inner_workout_exercises.id
        WHERE inner_workout_exercises.exercise_definition_id =
          exercise_definitions.id
        ORDER BY
          inner_sets.weight DESC,
          inner_sets.reps DESC,
          inner_sets.id ASC
        LIMIT 1
      )
    ORDER BY exercise_definitions.name ASC
    `
  );
}


export type LoggedExercise = {
  id: string;

  exercise: ExerciseDefinition;

  sets?: {
    reps: string;
    weight: string;
  }[];

  duration?: string;
  distance?: string;
};

export type WorkoutHistoryItem = {
  id: number;
  date: string;
  exercise_count: number;
  exercise_names: string;
};

export async function loadWorkoutStats(
  db: SQLiteDatabase
): Promise<WorkoutStats> {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(
    currentDate.getMonth() + 1
  ).padStart(2, "0");

  const monthStart = `${year}-${month}-01`;

  const result = await db.getFirstAsync<WorkoutStats>(
    `
    SELECT
      (
        SELECT COUNT(*)
        FROM workouts
      ) AS total_workouts,

      (
        SELECT COUNT(*)
        FROM workouts
        WHERE date >= ?
      ) AS month_workouts,

      (
        SELECT COUNT(*)
        FROM sets
      ) AS total_sets
    `,
    monthStart
  );

  return (
    result ?? {
      total_workouts: 0,
      month_workouts: 0,
      total_sets: 0,
    }
  );
}

export async function loadExerciseProgress(
  db: SQLiteDatabase,
  exerciseDefinitionId: string
): Promise<ExerciseProgressSet[]> {
  return await db.getAllAsync<ExerciseProgressSet>(
    `
    SELECT
      workouts.date AS workout_date,
      sets.set_number,
      sets.reps,
      sets.weight
    FROM sets
    INNER JOIN workout_exercises
      ON sets.workout_exercise_id =
         workout_exercises.id
    INNER JOIN workouts
      ON workout_exercises.workout_id =
         workouts.id
    WHERE workout_exercises.exercise_definition_id = ?
    ORDER BY
      workouts.date DESC,
      sets.set_number ASC
    `,
    exerciseDefinitionId
  );
}
export type ExerciseProgressOption = {
  id: string;
  name: string;
  category: string;
};

export async function loadExerciseProgressOptions(
  db: SQLiteDatabase
): Promise<ExerciseProgressOption[]> {
  return await db.getAllAsync<ExerciseProgressOption>(
    `
    SELECT DISTINCT
      exercise_definitions.id,
      exercise_definitions.name,
      exercise_definitions.category
    FROM exercise_definitions
    INNER JOIN workout_exercises
      ON exercise_definitions.id =
         workout_exercises.exercise_definition_id
    ORDER BY exercise_definitions.name ASC
    `
  );
}
export async function initializeDatabase(
  db: SQLiteDatabase
) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercise_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('strength', 'cardio')),
      is_custom INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_definition_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,

      FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE,

      FOREIGN KEY (exercise_definition_id)
        REFERENCES exercise_definitions(id)
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL,

      FOREIGN KEY (workout_exercise_id)
        REFERENCES workout_exercises(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cardio_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER NOT NULL UNIQUE,
      duration_seconds INTEGER NOT NULL,
      distance_km REAL,

      FOREIGN KEY (workout_exercise_id)
        REFERENCES workout_exercises(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_days_per_week INTEGER NOT NULL,
      rest_days_per_week INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      day_type TEXT NOT NULL CHECK (day_type IN ('WORKOUT', 'REST')),

      FOREIGN KEY (schedule_id)
        REFERENCES schedule(id)
        ON DELETE CASCADE
    );
  `);

  try {
    await db.execAsync(`
      ALTER TABLE exercise_definitions
      ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
    `);
  } catch (error) {
    // Column already exists, so nothing to do.
  }
}
export async function loadCustomExercises(
  db: SQLiteDatabase
): Promise<ExerciseDefinition[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    category: string;
    type: "strength" | "cardio";
  }>(
    `
    SELECT
      id,
      name,
      category,
      type
    FROM exercise_definitions
    WHERE is_custom = 1
    AND is_deleted = 0
    ORDER BY name ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    type: row.type,
  }));
}

export async function loadWorkoutHistory(
  db: SQLiteDatabase
): Promise<WorkoutHistoryItem[]> {
  return await db.getAllAsync<WorkoutHistoryItem>(
    `
    SELECT
      workouts.id,
      workouts.date,
      COUNT(workout_exercises.id) AS exercise_count,
      GROUP_CONCAT(
        exercise_definitions.name,
        ' · '
      ) AS exercise_names
    FROM workouts
    LEFT JOIN workout_exercises
      ON workout_exercises.workout_id = workouts.id
    LEFT JOIN exercise_definitions
      ON exercise_definitions.id =
         workout_exercises.exercise_definition_id
    GROUP BY workouts.id
    ORDER BY workouts.date DESC
    `
  );
}
export async function deleteCustomExercise(
  db: SQLiteDatabase,
  exerciseId: string
) {
  await db.runAsync(
    `
    UPDATE exercise_definitions
    SET is_deleted = 1
    WHERE id = ?
    AND is_custom = 1
    `,
    exerciseId
  );
}
export async function createCustomExercise(
  db: SQLiteDatabase,
  exercise: {
    name: string;
    category: string;
    type: "strength" | "cardio";
  }
) {
  const existing = await db.getFirstAsync<{
  id: string;
    }>(
      `
      SELECT id
      FROM exercise_definitions
      WHERE LOWER(name) = LOWER(?)
      AND is_deleted = 0
      LIMIT 1
      `,
      exercise.name.trim()
    );

  if (existing) {
    throw new Error(
      "An exercise with this name already exists."
    );
  }

  const id = `custom-${Date.now()}`;

  await db.runAsync(
    `
    INSERT INTO exercise_definitions
    (id, name, category, type, is_custom, is_deleted)
    VALUES (?, ?, ?, ?, 1, 0)
    `,
    id,
    exercise.name.trim(),
    exercise.category,
    exercise.type
  );

  return {
    id,
    name: exercise.name.trim(),
    category: exercise.category,
    type: exercise.type,
  };
}



export async function saveWorkout(
  db: SQLiteDatabase,
  date: string,
  exercises: LoggedExercise[]
) {
  if (date > getLocalDateString()) {
  throw new Error(
    "Cannot save a workout for a future date."
  );
}
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    // Remove an existing workout for this date.
    // This allows the user to edit/re-save a workout later.
    await txn.runAsync(
      "DELETE FROM workouts WHERE date = ?",
      date
    );

    // Make sure every exercise exists in the database.
    for (const item of exercises) {
      await txn.runAsync(
        `
        INSERT OR IGNORE INTO exercise_definitions
        (id, name, category, type, is_custom)
        VALUES (?, ?, ?, ?, ?)
        `,
        item.exercise.id,
        item.exercise.name,
        item.exercise.category,
        item.exercise.type,
        0
      );
    }

    // Create the workout.
    const workoutResult = await txn.runAsync(
      `
      INSERT INTO workouts
      (date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      `,
      date,
      null,
      now,
      now
    );

    const workoutId = workoutResult.lastInsertRowId;

    // Save every exercise.
    for (let index = 0; index < exercises.length; index++) {
      const item = exercises[index];

      const exerciseResult = await txn.runAsync(
        `
        INSERT INTO workout_exercises
        (workout_id, exercise_definition_id, order_index)
        VALUES (?, ?, ?)
        `,
        workoutId,
        item.exercise.id,
        index
      );

      const workoutExerciseId =
        exerciseResult.lastInsertRowId;

      // Strength exercise
      if (
        item.exercise.type === "strength" &&
        item.sets
      ) {
        for (
          let setIndex = 0;
          setIndex < item.sets.length;
          setIndex++
        ) {
          const set = item.sets[setIndex];

          await txn.runAsync(
            `
            INSERT INTO sets
            (workout_exercise_id, set_number, reps, weight)
            VALUES (?, ?, ?, ?)
            `,
            workoutExerciseId,
            setIndex + 1,
            Number(set.reps),
            set.weight
              ? Number(set.weight)
              : null
          );
        }
      }

      // Cardio exercise
      if (
        item.exercise.type === "cardio" &&
        item.duration
      ) {
        const durationSeconds =
          Number(item.duration) * 60;

        const distanceKm = item.distance
          ? Number(item.distance)
          : null;

        await txn.runAsync(
          `
          INSERT INTO cardio_details
          (workout_exercise_id, duration_seconds, distance_km)
          VALUES (?, ?, ?)
          `,
          workoutExerciseId,
          durationSeconds,
          distanceKm
        );
      }
    }
  });
}

export async function deleteWorkout(
  db: SQLiteDatabase,
  date: string
) {
  await db.runAsync(
    `
    DELETE FROM workouts
    WHERE date = ?
    `,
    date
  );
}

export async function saveSchedule(
  db: SQLiteDatabase,
  workoutDays: number[]
) {
  const workoutDaysPerWeek = workoutDays.length;
  const restDaysPerWeek = 7 - workoutDaysPerWeek;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM schedule");

    const scheduleResult = await txn.runAsync(
      `
      INSERT INTO schedule
      (workout_days_per_week, rest_days_per_week)
      VALUES (?, ?)
      `,
      workoutDaysPerWeek,
      restDaysPerWeek
    );

    const scheduleId = scheduleResult.lastInsertRowId;

    for (let day = 0; day < 7; day++) {
      const dayType = workoutDays.includes(day)
        ? "WORKOUT"
        : "REST";

      await txn.runAsync(
        `
        INSERT INTO schedule_days
        (schedule_id, day_of_week, day_type)
        VALUES (?, ?, ?)
        `,
        scheduleId,
        day,
        dayType
      );
    }
  });
}

export async function loadSchedule(
  db: SQLiteDatabase
) {
  const schedule = await db.getFirstAsync<{
    id: number;
    workout_days_per_week: number;
    rest_days_per_week: number;
  }>(
    `
    SELECT
      id,
      workout_days_per_week,
      rest_days_per_week
    FROM schedule
    ORDER BY id DESC
    LIMIT 1
    `
  );

  if (!schedule) {
    return null;
  }

  const days = await db.getAllAsync<{
    day_of_week: number;
    day_type: "WORKOUT" | "REST";
  }>(
    `
    SELECT
      day_of_week,
      day_type
    FROM schedule_days
    WHERE schedule_id = ?
    ORDER BY day_of_week ASC
    `,
    schedule.id
  );

  return {
    workoutDaysPerWeek: schedule.workout_days_per_week,
    restDaysPerWeek: schedule.rest_days_per_week,
    days,
  };
}

export async function loadWorkout(
  db: SQLiteDatabase,
  date: string
): Promise<LoggedExercise[]> {
  console.log("Loading workout for:", date);

  const workout = await db.getFirstAsync<{
    id: number;
    date: string;
    notes: string | null;
  }>(
    `
    SELECT id, date, notes
    FROM workouts
    WHERE date = ?
    LIMIT 1
    `,
    date
  );

  console.log("Workout found:", workout);

  if (!workout) {
    return [];
  }

  const exerciseRows = await db.getAllAsync<{
    workout_exercise_id: number;
    exercise_definition_id: string;
    name: string;
    category: string;
    type: "strength" | "cardio";
    order_index: number;
  }>(
    `
    SELECT
      we.id AS workout_exercise_id,
      ed.id AS exercise_definition_id,
      ed.name,
      ed.category,
      ed.type,
      we.order_index
    FROM workout_exercises AS we
    INNER JOIN exercise_definitions AS ed
      ON ed.id = we.exercise_definition_id
    WHERE we.workout_id = ?
    ORDER BY we.order_index ASC
    `,
    workout.id
  );

  console.log(
    "Exercises found:",
    exerciseRows
  );

  const loadedExercises: LoggedExercise[] = [];

  for (const row of exerciseRows) {
    const exercise: ExerciseDefinition = {
      id: row.exercise_definition_id,
      name: row.name,
      category: row.category,
      type: row.type,
    };

    if (row.type === "strength") {
      const setRows = await db.getAllAsync<{
        set_number: number;
        reps: number;
        weight: number | null;
      }>(
        `
        SELECT
          set_number,
          reps,
          weight
        FROM sets
        WHERE workout_exercise_id = ?
        ORDER BY set_number ASC
        `,
        row.workout_exercise_id
      );

      console.log(
        `Sets for ${row.name}:`,
        setRows
      );

      loadedExercises.push({
        id: `${row.exercise_definition_id}-${row.workout_exercise_id}`,
        exercise,
        sets: setRows.map((set) => ({
          reps: String(set.reps),
          weight:
            set.weight === null
              ? ""
              : String(set.weight),
        })),
      });
    } else {
      const cardio = await db.getFirstAsync<{
        duration_seconds: number;
        distance_km: number | null;
      }>(
        `
        SELECT
          duration_seconds,
          distance_km
        FROM cardio_details
        WHERE workout_exercise_id = ?
        LIMIT 1
        `,
        row.workout_exercise_id
      );

      loadedExercises.push({
        id: `${row.exercise_definition_id}-${row.workout_exercise_id}`,
        exercise,
        duration: cardio
          ? String(cardio.duration_seconds / 60)
          : "",
        distance:
          cardio?.distance_km == null
            ? ""
            : String(cardio.distance_km),
      });
    }
  }

  console.log(
    "Final loaded exercises:",
    loadedExercises
  );

  return loadedExercises;
}

export async function clearAllWorkouts(
  db: SQLiteDatabase
) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM workouts");
  });
}


export async function loadLastExerciseData(
  db: SQLiteDatabase,
  exerciseDefinitionId: string
): Promise<LoggedExercise | null> {
  const exercise = await db.getFirstAsync<{
    id: string;
    name: string;
    category: string;
    type: "strength" | "cardio";
  }>(
    `
    SELECT
      id,
      name,
      category,
      type
    FROM exercise_definitions
    WHERE id = ?
    `,
    exerciseDefinitionId
  );

  if (!exercise) {
    return null;
  }

  const workoutExercise =
    await db.getFirstAsync<{
      id: number;
    }>(
      `
      SELECT workout_exercises.id
      FROM workout_exercises
      INNER JOIN workouts
        ON workout_exercises.workout_id = workouts.id
      WHERE workout_exercises.exercise_definition_id = ?
      ORDER BY workouts.date DESC
      LIMIT 1
      `,
      exerciseDefinitionId
    );

  if (!workoutExercise) {
    return null;
  }

  if (exercise.type === "strength") {
    const sets = await db.getAllAsync<{
      reps: number;
      weight: number | null;
    }>(
      `
      SELECT reps, weight
      FROM sets
      WHERE workout_exercise_id = ?
      ORDER BY set_number ASC
      `,
      workoutExercise.id
    );

    return {
      id: exercise.id,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        type: exercise.type,
      },
      sets: sets.map((set) => ({
        reps: String(set.reps),
        weight:
          set.weight === null
            ? ""
            : String(set.weight),
      })),
    };
  }

  const cardio =
    await db.getFirstAsync<{
      duration_seconds: number;
      distance_km: number | null;
    }>(
      `
      SELECT
        duration_seconds,
        distance_km
      FROM cardio_details
      WHERE workout_exercise_id = ?
      `,
      workoutExercise.id
    );

  if (!cardio) {
    return null;
  }

  return {
    id: exercise.id,
    exercise: {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      type: exercise.type,
    },
    duration: String(
      Math.floor(cardio.duration_seconds / 60)
    ),
    distance:
      cardio.distance_km === null
        ? ""
        : String(cardio.distance_km),
  };
}


export type MonthlyWorkoutExportRow = {
  date: string;
  exercise_name: string;
  category: string;
  type: "strength" | "cardio";
  set_number: number | null;
  reps: number | null;
  weight: number | null;
  duration_seconds: number | null;
  distance_km: number | null;
};

export async function loadMonthlyWorkoutData(
  db: SQLiteDatabase,
  year: number,
  month: number
): Promise<MonthlyWorkoutExportRow[]> {
  const monthString = String(month).padStart(2, "0");
  const startDate = `${year}-${monthString}-01`;

  const nextMonth = new Date(year, month, 1);
  const nextYear = nextMonth.getFullYear();
  const nextMonthNumber = String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0");

  const endDate = `${nextYear}-${nextMonthNumber}-01`;

  return await db.getAllAsync<MonthlyWorkoutExportRow>(
    `
    SELECT
      workouts.date AS date,
      exercise_definitions.name AS exercise_name,
      exercise_definitions.category AS category,
      exercise_definitions.type AS type,
      sets.set_number AS set_number,
      sets.reps AS reps,
      sets.weight AS weight,
      cardio_details.duration_seconds AS duration_seconds,
      cardio_details.distance_km AS distance_km

    FROM workouts

    INNER JOIN workout_exercises
      ON workout_exercises.workout_id = workouts.id

    INNER JOIN exercise_definitions
      ON exercise_definitions.id =
         workout_exercises.exercise_definition_id

    LEFT JOIN sets
      ON sets.workout_exercise_id =
         workout_exercises.id

    LEFT JOIN cardio_details
      ON cardio_details.workout_exercise_id =
         workout_exercises.id

    WHERE workouts.date >= ?
      AND workouts.date < ?

    ORDER BY
      workouts.date ASC,
      workout_exercises.order_index ASC,
      sets.set_number ASC
    `,
    startDate,
    endDate
  );
}

export async function clearAllWorkoutData(
  db: SQLiteDatabase
) {
  await db.withExclusiveTransactionAsync(
    async (txn) => {
      await txn.runAsync(`DELETE FROM workouts`);
    }
  );
}