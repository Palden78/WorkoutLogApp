# Workout Tracker

Workout Tracker is a mobile app for planning, logging, and reviewing gym workouts. It stores workout data locally on the device and provides a calendar-based way to see completed sessions, revisit previous workouts, and monitor progress over time.

## Why I Built It

I wanted a simple way to log my workouts at the gym. At first, I recorded everything in the iPhone Notes app, but I found that experience inconvenient and poorly suited to structured workout tracking. I therefore decided to create a dedicated mobile app for my own personal use.

## Features

- View completed workouts on a monthly calendar
- Log strength exercises with sets, repetitions, and weight
- Log cardio exercises with duration and distance
- Edit or delete previously logged workouts
- Create and manage custom exercises
- Review workout history
- Track workout statistics and current streaks
- View exercise progression and personal records
- Configure weekly workout and rest days
- Export the current month's workout data as an XLSX spreadsheet
- Import a previously exported monthly XLSX file
  - Validates the workbook before changing any data
  - Restores workouts to the month and dates recorded in the file
  - Shows a preview before importing
  - Requests confirmation before replacing existing workouts
  - Recreates missing exercises as custom exercises
  - Rejects corrupt, unrelated, invalid, or multi-month workbooks
  - Applies the complete import atomically, preventing partially imported data

## Technology

- [Expo](https://expo.dev/) and React Native
- TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local persistence
- [SheetJS](https://sheetjs.com/) for XLSX creation and parsing
- Expo DocumentPicker, FileSystem, and Sharing for spreadsheet import and export

## Data and Privacy

Workout information is stored locally in a SQLite database on the device. The app does not require a remote account or backend service.

Exporting creates an XLSX file that can be saved or shared using the device's native share interface. Importing reads a file selected through the system document picker and validates it before writing to the local database.

## Project Structure

```text
src/
├── app/          # Expo Router screens
├── components/   # Reusable interface components
├── data/         # Built-in exercise definitions
├── hooks/        # Shared React hooks
└── lib/          # Database, import/export, and business logic
```

Important files include:

- `src/components/Calendar.tsx` — monthly workout calendar
- `src/app/workout/[date].tsx` — workout logging and editing screen
- `src/app/progress.tsx` — statistics and spreadsheet actions
- `src/app/import-workouts.tsx` — XLSX selection, validation, preview, and confirmation
- `src/lib/database.ts` — SQLite schema, queries, and transactional persistence
- `src/lib/export.ts` — monthly XLSX export
- `src/lib/workout-import.ts` — XLSX recognition, parsing, and validation

## Requirements

- Node.js
- npm
- An iOS Simulator, Android Emulator, or compatible physical device
- Xcode for local iOS builds or Android Studio for local Android builds

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the Expo development server

```bash
npm start
```

### 3. Run the app

For iOS:

```bash
npm run ios
```

For Android:

```bash
npm run android
```

For the web development target:

```bash
npm run web
```

The app uses native modules such as SQLite and DocumentPicker. After adding or changing native dependencies, rebuild the development app rather than relying only on Expo Go.

## XLSX Backup and Restore

Monthly exports use a worksheet named `Workout Data` with the following columns:

1. Date
2. Exercise
3. Category
4. Type
5. Set
6. Reps
7. Weight (kg)
8. Duration
9. Distance (km)

To restore data:

1. Open the **Progress** screen.
2. Select **Import Monthly XLSX**.
3. Choose a file previously exported by Workout Tracker.
4. Review its month, workout dates, exercise count, and any dates that will be replaced.
5. Confirm the import.

The dates inside the spreadsheet determine where workouts appear in the calendar. Existing workouts are replaced only on dates included in the selected file; all other workout dates remain unchanged.

## Development Checks

Run the TypeScript checker before completing changes:

```bash
npx tsc --noEmit
```

Check the Expo project and installed dependencies with:

```bash
npx expo-doctor
```

Linting can be initialized and run with:

```bash
npx expo lint
```

## Current Scope

This project was created primarily as a personal workout tracker. It currently focuses on local, single-user tracking rather than accounts, cloud synchronization, social features, or coaching services.


npx expo run:ios --device --configuration Release