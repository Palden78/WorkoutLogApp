import * as XLSX from "xlsx";

import type {
  ExerciseDefinition,
  ExerciseType,
} from "../data/exercises";

export const WORKOUT_WORKSHEET_NAME = "Workout Data";

export const WORKOUT_EXPORT_HEADERS = [
  "Date",
  "Exercise",
  "Category",
  "Type",
  "Set",
  "Reps",
  "Weight (kg)",
  "Duration",
  "Distance (km)",
] as const;

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_IMPORT_ROWS = 50_000;
const RECOGNITION_MESSAGE =
  "Choose an XLSX file exported by Workout Tracker.";

type WorkoutImportErrorKind =
  | "recognition"
  | "validation";

export class WorkoutImportError extends Error {
  constructor(
    public readonly kind: WorkoutImportErrorKind,
    public readonly code: string,
    message: string,
    public readonly rowNumber?: number
  ) {
    super(message);
    this.name = "WorkoutImportError";
  }
}

export function isWorkoutImportError(
  error: unknown
): error is WorkoutImportError {
  return error instanceof WorkoutImportError;
}

export type ParsedStrengthSet = {
  setNumber: number;
  reps: number;
  weightKg: number | null;
};

export type ParsedWorkoutExercise =
  | {
      name: string;
      category: string;
      type: "strength";
      sets: ParsedStrengthSet[];
    }
  | {
      name: string;
      category: string;
      type: "cardio";
      durationSeconds: number | null;
      distanceKm: number | null;
    };

export type ParsedWorkoutDay = {
  date: string;
  exercises: ParsedWorkoutExercise[];
};

export type ParsedMonthlyWorkoutFile = {
  month: string;
  rowCount: number;
  days: ParsedWorkoutDay[];
};

export type WorkoutImportDefinitionRecord =
  ExerciseDefinition & {
    isCustom: boolean;
    isDeleted: boolean;
  };

export type WorkoutImportSnapshot = {
  definitions: WorkoutImportDefinitionRecord[];
  existingDates: string[];
  workoutVersions: {
    id: number;
    date: string;
    updatedAt: string;
  }[];
};

export type WorkoutImportExerciseWrite =
  | {
      exercise: ExerciseDefinition;
      type: "strength";
      sets: ParsedStrengthSet[];
    }
  | {
      exercise: ExerciseDefinition;
      type: "cardio";
      durationSeconds: number | null;
      distanceKm: number | null;
    };

export type WorkoutImportDayWrite = {
  date: string;
  exercises: WorkoutImportExerciseWrite[];
};

export type WorkoutImportDefinitionInsert = {
  exercise: ExerciseDefinition;
  isCustom: boolean;
};

export type WorkoutImportPlan = {
  month: string;
  rowCount: number;
  dayCount: number;
  exerciseCount: number;
  newDates: string[];
  replacementDates: string[];
  definitionsToInsert: WorkoutImportDefinitionInsert[];
  definitionsToRestore: ExerciseDefinition[];
  workouts: WorkoutImportDayWrite[];
  expectedSnapshot: WorkoutImportSnapshot;
};

type ParseOptions = {
  today?: string;
};

type PlanOptions = {
  idTimestamp?: number;
};

type RawWorkoutRow = {
  rowNumber: number;
  date: string;
  name: string;
  category: string;
  type: ExerciseType;
  setNumber: number | null;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceKm: number | null;
};

function recognitionError(code: string) {
  return new WorkoutImportError(
    "recognition",
    code,
    RECOGNITION_MESSAGE
  );
}

function validationError(
  code: string,
  message: string,
  rowNumber?: number
) {
  return new WorkoutImportError(
    "validation",
    code,
    message,
    rowNumber
  );
}

function getLocalDateString() {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}

function isBlankCell(
  cell: XLSX.CellObject | undefined
) {
  return (
    !cell ||
    cell.t === "z" ||
    cell.v === undefined ||
    cell.v === null ||
    cell.v === ""
  );
}

function isSupportedCell(
  cell: XLSX.CellObject | undefined
) {
  if (!cell || isBlankCell(cell)) {
    return true;
  }

  return (
    cell.f === undefined &&
    (cell.t === "s" || cell.t === "n")
  );
}

function getCell(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number
) {
  return worksheet[
    XLSX.utils.encode_cell({ r: row, c: column })
  ] as XLSX.CellObject | undefined;
}

function readRequiredText(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
  label: string
) {
  const rowNumber = row + 1;
  const cell = getCell(worksheet, row, column);

  if (!cell || cell.t !== "s") {
    throw validationError(
      `invalid-${label.toLowerCase()}`,
      `Row ${rowNumber} has an invalid ${label}.`,
      rowNumber
    );
  }

  const value = String(cell.v).trim();

  if (!value) {
    throw validationError(
      `missing-${label.toLowerCase()}`,
      `Row ${rowNumber} is missing ${label}.`,
      rowNumber
    );
  }

  return value;
}

function readOptionalNumber(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
  label: string
) {
  const rowNumber = row + 1;
  const cell = getCell(worksheet, row, column);

  if (isBlankCell(cell)) {
    return null;
  }

  if (
    !cell ||
    cell.t !== "n" ||
    typeof cell.v !== "number" ||
    !Number.isFinite(cell.v) ||
    cell.v < 0
  ) {
    throw validationError(
      `invalid-${label.toLowerCase()}`,
      `Row ${rowNumber} has an invalid ${label}.`,
      rowNumber
    );
  }

  return cell.v;
}

function readOptionalInteger(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
  label: string,
  allowZero: boolean
) {
  const value = readOptionalNumber(
    worksheet,
    row,
    column,
    label
  );

  if (value === null) {
    return null;
  }

  if (
    !Number.isSafeInteger(value) ||
    (allowZero ? value < 0 : value < 1)
  ) {
    const rowNumber = row + 1;

    throw validationError(
      `invalid-${label.toLowerCase()}`,
      `Row ${rowNumber} has an invalid ${label}.`,
      rowNumber
    );
  }

  return value;
}

function assertBlank(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
  label: string,
  type: string
) {
  if (!isBlankCell(getCell(worksheet, row, column))) {
    const rowNumber = row + 1;

    throw validationError(
      `unexpected-${label.toLowerCase()}`,
      `Row ${rowNumber} must leave ${label} blank for a ${type} exercise.`,
      rowNumber
    );
  }
}

function isLeapYear(year: number) {
  return (
    year % 400 === 0 ||
    (year % 4 === 0 && year % 100 !== 0)
  );
}

function isCanonicalDate(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day >= 1 && day <= daysInMonth[month - 1];
}

function parseDate(
  worksheet: XLSX.WorkSheet,
  row: number,
  today: string
) {
  const rowNumber = row + 1;
  const cell = getCell(worksheet, row, 0);

  if (
    !cell ||
    cell.t !== "s" ||
    typeof cell.v !== "string" ||
    !isCanonicalDate(cell.v)
  ) {
    throw validationError(
      "invalid-date",
      `Row ${rowNumber} has an invalid Date. Expected YYYY-MM-DD.`,
      rowNumber
    );
  }

  if (cell.v > today) {
    throw validationError(
      "future-date",
      `Row ${rowNumber} contains a future workout date.`,
      rowNumber
    );
  }

  return cell.v;
}

function parseDuration(
  worksheet: XLSX.WorkSheet,
  row: number
) {
  const rowNumber = row + 1;
  const cell = getCell(worksheet, row, 7);

  if (isBlankCell(cell)) {
    return null;
  }

  if (
    !cell ||
    cell.t !== "s" ||
    typeof cell.v !== "string"
  ) {
    throw validationError(
      "invalid-duration",
      `Row ${rowNumber} has an invalid Duration. Expected M:SS.`,
      rowNumber
    );
  }

  const match = /^(0|[1-9]\d*):([0-5]\d)$/.exec(
    cell.v
  );

  if (!match) {
    throw validationError(
      "invalid-duration",
      `Row ${rowNumber} has an invalid Duration. Expected M:SS.`,
      rowNumber
    );
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const totalSeconds = minutes * 60 + seconds;

  if (!Number.isSafeInteger(totalSeconds)) {
    throw validationError(
      "invalid-duration",
      `Row ${rowNumber} has an invalid Duration. Expected M:SS.`,
      rowNumber
    );
  }

  return totalSeconds;
}

function parseRow(
  worksheet: XLSX.WorkSheet,
  row: number,
  today: string
): RawWorkoutRow {
  const rowNumber = row + 1;
  const date = parseDate(worksheet, row, today);
  const name = readRequiredText(
    worksheet,
    row,
    1,
    "Exercise"
  );
  const category = readRequiredText(
    worksheet,
    row,
    2,
    "Category"
  );
  const typeCell = getCell(worksheet, row, 3);

  if (
    !typeCell ||
    typeCell.t !== "s" ||
    (typeCell.v !== "Strength" &&
      typeCell.v !== "Cardio")
  ) {
    throw validationError(
      "invalid-type",
      `Row ${rowNumber} has an invalid Type. Expected Strength or Cardio.`,
      rowNumber
    );
  }

  if (typeCell.v === "Strength") {
    const setNumber = readOptionalInteger(
      worksheet,
      row,
      4,
      "Set",
      false
    );
    const reps = readOptionalInteger(
      worksheet,
      row,
      5,
      "Reps",
      true
    );
    const weightKg = readOptionalNumber(
      worksheet,
      row,
      6,
      "Weight"
    );

    assertBlank(
      worksheet,
      row,
      7,
      "Duration",
      "Strength"
    );
    assertBlank(
      worksheet,
      row,
      8,
      "Distance",
      "Strength"
    );

    if (setNumber === null) {
      if (reps !== null || weightKg !== null) {
        throw validationError(
          "incomplete-strength-set",
          `Row ${rowNumber} must include Set when Reps or Weight is present.`,
          rowNumber
        );
      }
    } else if (reps === null) {
      throw validationError(
        "missing-reps",
        `Row ${rowNumber} must include Reps for a Strength set.`,
        rowNumber
      );
    }

    return {
      rowNumber,
      date,
      name,
      category,
      type: "strength",
      setNumber,
      reps,
      weightKg,
      durationSeconds: null,
      distanceKm: null,
    };
  }

  assertBlank(
    worksheet,
    row,
    4,
    "Set",
    "Cardio"
  );
  assertBlank(
    worksheet,
    row,
    5,
    "Reps",
    "Cardio"
  );
  assertBlank(
    worksheet,
    row,
    6,
    "Weight",
    "Cardio"
  );

  const durationSeconds = parseDuration(
    worksheet,
    row
  );
  const distanceKm = readOptionalNumber(
    worksheet,
    row,
    8,
    "Distance"
  );

  if (durationSeconds === null && distanceKm !== null) {
    throw validationError(
      "distance-without-duration",
      `Row ${rowNumber} must include Duration when Distance is present.`,
      rowNumber
    );
  }

  return {
    rowNumber,
    date,
    name,
    category,
    type: "cardio",
    setNumber: null,
    reps: null,
    weightKg: null,
    durationSeconds,
    distanceKm,
  };
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function hasSameMetadata(
  exercise: ParsedWorkoutExercise,
  row: RawWorkoutRow
) {
  return (
    normalizeName(exercise.name) ===
      normalizeName(row.name) &&
    exercise.category === row.category &&
    exercise.type === row.type
  );
}

function copySnapshot(
  snapshot: WorkoutImportSnapshot
): WorkoutImportSnapshot {
  return {
    definitions: snapshot.definitions
      .map((definition) => ({ ...definition }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    existingDates: [...snapshot.existingDates].sort(),
    workoutVersions: snapshot.workoutVersions
      .map((workout) => ({ ...workout }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function parseMonthlyWorkoutWorkbook(
  data: ArrayBuffer | Uint8Array,
  options: ParseOptions = {}
): ParsedMonthlyWorkoutFile {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(data, {
      type: "array",
      cellDates: false,
      cellFormula: true,
    });
  } catch {
    throw recognitionError("unreadable-workbook");
  }

  if (
    workbook.SheetNames.length !== 1 ||
    workbook.SheetNames[0] !== WORKOUT_WORKSHEET_NAME
  ) {
    throw recognitionError("wrong-worksheet");
  }

  const worksheet =
    workbook.Sheets[WORKOUT_WORKSHEET_NAME];

  if (!worksheet) {
    throw recognitionError("missing-worksheet");
  }

  let lastPopulatedRow = 0;

  for (const address of Object.keys(worksheet)) {
    if (address.startsWith("!")) {
      continue;
    }

    let position: XLSX.CellAddress;

    try {
      position = XLSX.utils.decode_cell(address);
    } catch {
      throw recognitionError("invalid-cell-address");
    }

    const cell = worksheet[address] as
      | XLSX.CellObject
      | undefined;

    if (!isSupportedCell(cell)) {
      throw recognitionError("unsupported-cell");
    }

    if (isBlankCell(cell)) {
      continue;
    }

    if (position.c >= WORKOUT_EXPORT_HEADERS.length) {
      throw recognitionError("extra-column");
    }

    if (position.r > MAX_IMPORT_ROWS) {
      throw validationError(
        "too-many-rows",
        `This file has more than ${MAX_IMPORT_ROWS.toLocaleString()} workout rows.`
      );
    }

    lastPopulatedRow = Math.max(
      lastPopulatedRow,
      position.r
    );
  }

  for (
    let column = 0;
    column < WORKOUT_EXPORT_HEADERS.length;
    column++
  ) {
    const cell = getCell(worksheet, 0, column);

    if (
      !cell ||
      cell.t !== "s" ||
      cell.v !== WORKOUT_EXPORT_HEADERS[column]
    ) {
      throw recognitionError("wrong-headers");
    }
  }

  if (lastPopulatedRow === 0) {
    throw validationError(
      "no-workout-data",
      "This file does not contain any workout data."
    );
  }

  const today = options.today ?? getLocalDateString();

  if (!isCanonicalDate(today)) {
    throw new Error("The supplied current date is invalid.");
  }

  const rows: RawWorkoutRow[] = [];

  for (let row = 1; row <= lastPopulatedRow; row++) {
    const isBlankRow = WORKOUT_EXPORT_HEADERS.every(
      (_, column) =>
        isBlankCell(getCell(worksheet, row, column))
    );

    if (isBlankRow) {
      const rowNumber = row + 1;

      throw validationError(
        "blank-row",
        `Row ${rowNumber} is blank. Remove blank rows and try again.`,
        rowNumber
      );
    }

    rows.push(parseRow(worksheet, row, today));
  }

  const month = rows[0].date.slice(0, 7);
  const metadataByName = new Map<
    string,
    Pick<RawWorkoutRow, "name" | "category" | "type">
  >();

  let previousDate = rows[0].date;

  for (const row of rows) {
    if (row.date.slice(0, 7) !== month) {
      throw validationError(
        "multiple-months",
        "This file contains workouts from more than one month.",
        row.rowNumber
      );
    }

    if (row.date < previousDate) {
      throw validationError(
        "out-of-order-dates",
        `Row ${row.rowNumber} is out of date order.`,
        row.rowNumber
      );
    }

    previousDate = row.date;

    const normalizedName = normalizeName(row.name);
    const previousMetadata =
      metadataByName.get(normalizedName);

    if (
      previousMetadata &&
      (previousMetadata.category !== row.category ||
        previousMetadata.type !== row.type)
    ) {
      throw validationError(
        "inconsistent-exercise",
        `${row.name} uses inconsistent Category or Type values in this file.`,
        row.rowNumber
      );
    }

    metadataByName.set(normalizedName, {
      name: previousMetadata?.name ?? row.name,
      category: row.category,
      type: row.type,
    });
  }

  const days: ParsedWorkoutDay[] = [];

  for (const row of rows) {
    let day = days[days.length - 1];

    if (!day || day.date !== row.date) {
      day = {
        date: row.date,
        exercises: [],
      };
      days.push(day);
    }

    if (row.type === "cardio") {
      day.exercises.push({
        name: row.name,
        category: row.category,
        type: "cardio",
        durationSeconds: row.durationSeconds,
        distanceKm: row.distanceKm,
      });
      continue;
    }

    if (row.setNumber === null) {
      day.exercises.push({
        name: row.name,
        category: row.category,
        type: "strength",
        sets: [],
      });
      continue;
    }

    if (row.setNumber === 1) {
      day.exercises.push({
        name: row.name,
        category: row.category,
        type: "strength",
        sets: [
          {
            setNumber: row.setNumber,
            reps: row.reps!,
            weightKg: row.weightKg,
          },
        ],
      });
      continue;
    }

    const previousExercise =
      day.exercises[day.exercises.length - 1];

    if (
      !previousExercise ||
      previousExercise.type !== "strength" ||
      !hasSameMetadata(previousExercise, row) ||
      previousExercise.sets.length !== row.setNumber - 1
    ) {
      throw validationError(
        "invalid-set-order",
        `Row ${row.rowNumber} has an unexpected Set number. Each Strength exercise must use 1, 2, 3, and so on.`,
        row.rowNumber
      );
    }

    previousExercise.sets.push({
      setNumber: row.setNumber,
      reps: row.reps!,
      weightKg: row.weightKg,
    });
  }

  return {
    month,
    rowCount: rows.length,
    days,
  };
}

function metadataMatches(
  exercise: ExerciseDefinition,
  metadata: Pick<
    ParsedWorkoutExercise,
    "category" | "type"
  >
) {
  return (
    exercise.category === metadata.category &&
    exercise.type === metadata.type
  );
}

function definitionConflict(name: string) {
  return validationError(
    "exercise-definition-conflict",
    `${name} does not match the Category and Type already used by this app.`
  );
}

export function buildWorkoutImportPlan(
  parsedFile: ParsedMonthlyWorkoutFile,
  snapshot: WorkoutImportSnapshot,
  builtInExercises: ExerciseDefinition[],
  options: PlanOptions = {}
): WorkoutImportPlan {
  const normalizedSnapshot = copySnapshot(snapshot);
  const databaseById = new Map(
    normalizedSnapshot.definitions.map((definition) => [
      definition.id,
      definition,
    ])
  );
  const builtInById = new Map(
    builtInExercises.map((definition) => [
      definition.id,
      definition,
    ])
  );

  for (const definition of normalizedSnapshot.definitions) {
    const builtIn = builtInById.get(definition.id);

    if (
      builtIn &&
      (builtIn.name !== definition.name ||
        !metadataMatches(builtIn, definition))
    ) {
      throw definitionConflict(definition.name);
    }
  }

  const importedMetadata: ParsedWorkoutExercise[] = [];
  const importedNames = new Set<string>();

  for (const day of parsedFile.days) {
    for (const exercise of day.exercises) {
      const normalizedName = normalizeName(exercise.name);

      if (!importedNames.has(normalizedName)) {
        importedNames.add(normalizedName);
        importedMetadata.push(exercise);
      }
    }
  }

  const definitionsToInsert: WorkoutImportDefinitionInsert[] = [];
  const definitionsToRestore: ExerciseDefinition[] = [];
  const resolvedByName = new Map<
    string,
    ExerciseDefinition
  >();
  const usedIds = new Set([
    ...builtInExercises.map((exercise) => exercise.id),
    ...normalizedSnapshot.definitions.map(
      (definition) => definition.id
    ),
  ]);
  const idTimestamp =
    options.idTimestamp ?? Date.now();
  let customIdCounter = 1;

  for (const metadata of importedMetadata) {
    const normalizedName = normalizeName(metadata.name);
    const matchingBuiltIns = builtInExercises.filter(
      (exercise) =>
        normalizeName(exercise.name) === normalizedName
    );
    const matchingDatabase =
      normalizedSnapshot.definitions.filter(
        (definition) =>
          normalizeName(definition.name) ===
          normalizedName
      );
    const activeCandidates = new Map<
      string,
      ExerciseDefinition
    >();

    for (const exercise of matchingBuiltIns) {
      activeCandidates.set(exercise.id, exercise);
    }

    for (const definition of matchingDatabase) {
      if (!definition.isDeleted) {
        activeCandidates.set(
          definition.id,
          definition
        );
      }
    }

    const activeDefinitions = [
      ...activeCandidates.values(),
    ];
    const activeExactMatches = activeDefinitions.filter(
      (definition) =>
        metadataMatches(definition, metadata)
    );

    if (activeExactMatches.length !== activeDefinitions.length) {
      throw definitionConflict(metadata.name);
    }

    if (activeExactMatches.length > 1) {
      throw validationError(
        "ambiguous-exercise-definition",
        `${metadata.name} matches more than one exercise in this app.`
      );
    }

    if (activeExactMatches.length === 1) {
      const resolved = activeExactMatches[0];
      const databaseDefinition =
        databaseById.get(resolved.id);

      if (!databaseDefinition) {
        definitionsToInsert.push({
          exercise: resolved,
          isCustom: false,
        });
      } else if (databaseDefinition.isDeleted) {
        if (!databaseDefinition.isCustom) {
          throw definitionConflict(metadata.name);
        }

        definitionsToRestore.push(resolved);
      }

      resolvedByName.set(normalizedName, resolved);
      continue;
    }

    const activeDatabaseConflicts = matchingDatabase.filter(
      (definition) =>
        !definition.isDeleted &&
        !metadataMatches(definition, metadata)
    );

    if (activeDatabaseConflicts.length > 0) {
      throw definitionConflict(metadata.name);
    }

    const deletedExactMatches =
      matchingDatabase.filter(
        (definition) =>
          definition.isDeleted &&
          definition.isCustom &&
          metadataMatches(definition, metadata)
      );

    if (deletedExactMatches.length > 1) {
      throw validationError(
        "ambiguous-deleted-exercise",
        `${metadata.name} matches more than one archived exercise in this app.`
      );
    }

    if (deletedExactMatches.length === 1) {
      const resolved = deletedExactMatches[0];

      definitionsToRestore.push(resolved);
      resolvedByName.set(normalizedName, resolved);
      continue;
    }

    let id =
      `custom-import-${idTimestamp}-${customIdCounter}`;

    while (usedIds.has(id)) {
      customIdCounter++;
      id =
        `custom-import-${idTimestamp}-${customIdCounter}`;
    }

    customIdCounter++;
    usedIds.add(id);

    const resolved: ExerciseDefinition = {
      id,
      name: metadata.name,
      category: metadata.category,
      type: metadata.type,
    };

    definitionsToInsert.push({
      exercise: resolved,
      isCustom: true,
    });
    resolvedByName.set(normalizedName, resolved);
  }

  const workouts = parsedFile.days.map((day) => ({
    date: day.date,
    exercises: day.exercises.map(
      (exercise): WorkoutImportExerciseWrite => {
        const resolved = resolvedByName.get(
          normalizeName(exercise.name)
        );

        if (!resolved) {
          throw new Error(
            `Exercise resolution failed for ${exercise.name}.`
          );
        }

        if (exercise.type === "strength") {
          return {
            exercise: resolved,
            type: "strength",
            sets: exercise.sets.map((set) => ({
              ...set,
            })),
          };
        }

        return {
          exercise: resolved,
          type: "cardio",
          durationSeconds: exercise.durationSeconds,
          distanceKm: exercise.distanceKm,
        };
      }
    ),
  }));
  const existingDates = new Set(
    normalizedSnapshot.existingDates
  );
  const replacementDates = parsedFile.days
    .map((day) => day.date)
    .filter((date) => existingDates.has(date));
  const newDates = parsedFile.days
    .map((day) => day.date)
    .filter((date) => !existingDates.has(date));

  return {
    month: parsedFile.month,
    rowCount: parsedFile.rowCount,
    dayCount: parsedFile.days.length,
    exerciseCount: parsedFile.days.reduce(
      (total, day) => total + day.exercises.length,
      0
    ),
    newDates,
    replacementDates,
    definitionsToInsert,
    definitionsToRestore,
    workouts,
    expectedSnapshot: normalizedSnapshot,
  };
}
