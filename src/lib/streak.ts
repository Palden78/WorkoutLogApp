import type { SQLiteDatabase } from "expo-sqlite";

import { loadSchedule } from "./database";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + amount);

  return result;
}

export async function calculateCurrentStreak(
  db: SQLiteDatabase
): Promise<number> {
  const schedule = await loadSchedule(db);

  if (!schedule) {
    return 0;
  }

  const workouts = await db.getAllAsync<{
    date: string;
  }>(
    `
    SELECT date
    FROM workouts
    ORDER BY date DESC
    `
  );

  const workoutDates = new Set(
    workouts.map((workout) => workout.date)
  );

  if (workouts.length === 0) {
    return 0;
    }

  let streak = 0;

  let currentDate = new Date();

  while (true) {
    const dateString = formatDate(currentDate);
    const dayOfWeek = currentDate.getDay();

    const daySchedule = schedule.days.find(
      (day) => day.day_of_week === dayOfWeek
    );

    if (!daySchedule) {
      break;
    }

    if (daySchedule.day_type === "REST") {
      streak++;

      currentDate = addDays(currentDate, -1);

      continue;
    }

    if (workoutDates.has(dateString)) {
      streak++;

      currentDate = addDays(currentDate, -1);

      continue;
    }

    break;
  }

  return streak;
}