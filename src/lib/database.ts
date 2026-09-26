import type { SQLiteDatabase } from "expo-sqlite";
import type { ExerciseDefinition } from "../data/exercises";

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
      is_custom INTEGER NOT NULL DEFAULT 0
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
  `);
}



export async function saveWorkout(
  db: SQLiteDatabase,
  date: string,
  exercises: LoggedExercise[]
) {
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