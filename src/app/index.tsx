import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Calendar from "../components/Calendar";
import { loadSchedule, clearAllWorkouts } from "../lib/database";
import { calculateCurrentStreak } from "../lib/streak";

export default function HomeScreen() {
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function checkSchedule() {
      try {
        const schedule = await loadSchedule(db);

        setHasSchedule(schedule !== null);

        if (schedule) {
          const currentStreak =
            await calculateCurrentStreak(db);

          setStreak(currentStreak);
        }
      } catch (error) {
        console.error(
          "Failed to load schedule:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    checkSchedule();
  }, [db]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasSchedule) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.setupTitle}>
          Welcome to Workout Tracker
        </Text>

        <Text style={styles.setupText}>
          Let's set up your workout schedule before
          you start tracking your progress.
        </Text>

        <Text
          style={styles.setupButton}
          onPress={() => router.push("/schedule")}
        >
          Set Up Schedule
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.streak}>
      🔥 {streak} day streak
    </Text>

      <Text style={styles.subtitle}>
        Your workouts
      </Text>

      <Calendar />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  setupContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  setupTitle: {
    fontSize: 32,
    fontWeight: "700",
  },

  setupText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#777777",
  },

  setupButton: {
    marginTop: 32,
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#222222",
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  streak: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 16,
    color: "#666666",
  },
});