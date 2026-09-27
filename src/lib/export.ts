import {
  File,
  Paths,
} from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import {
  loadMonthlyWorkoutData,
  MonthlyWorkoutExportRow,
} from "./database";

import type { SQLiteDatabase } from "expo-sqlite";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export async function exportMonthlyWorkoutData(
  db: SQLiteDatabase,
  year: number,
  month: number
) {
  const rows =
    await loadMonthlyWorkoutData(
      db,
      year,
      month
    );

  const spreadsheetRows = rows.map(
    (row: MonthlyWorkoutExportRow) => ({
      Date: row.date,
      Exercise: row.exercise_name,
      Category: row.category,
      Type:
        row.type === "strength"
          ? "Strength"
          : "Cardio",
      Set: row.set_number ?? "",
      Reps: row.reps ?? "",
      "Weight (kg)": row.weight ?? "",
      Duration:
        row.duration_seconds !== null
          ? formatDuration(row.duration_seconds)
          : "",
      "Distance (km)": row.distance_km ?? "",
    })
  );

  const worksheet =
    XLSX.utils.json_to_sheet(
      spreadsheetRows
    );

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Workout Data"
  );

  const excelData =
    XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

  const monthString =
    String(month).padStart(2, "0");

  const fileName =
    `workout-${year}-${monthString}.xlsx`;

  const file = new File(
    Paths.cache,
    fileName
  );

  file.create({
    overwrite: true,
  });

  file.write(
    excelData,
    {
      encoding: "base64",
    }
  );

  const canShare =
    await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error(
      "File sharing is not available on this device."
    );
  }

  await Sharing.shareAsync(
    file.uri,
    {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle:
        "Export Workout Data",
      UTI:
        "com.microsoft.excel.xlsx",
    }
  );

  return file.uri;
}