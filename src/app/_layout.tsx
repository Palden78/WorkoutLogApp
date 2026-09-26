import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";

import { initializeDatabase } from "../lib/database";

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="workout-tracker.db"
      onInit={initializeDatabase}
    >
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </SQLiteProvider>
  );
}