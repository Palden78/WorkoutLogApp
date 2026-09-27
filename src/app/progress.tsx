import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { exportMonthlyWorkoutData } from "../lib/export";
import {
  loadWorkoutStats,
  WorkoutStats,
} from "../lib/database";

import { calculateCurrentStreak } from "../lib/streak";

export default function ProgressScreen() {
  const db = useSQLiteContext();

async function handleExportMonth() {
  try {
    const now = new Date();

    await exportMonthlyWorkoutData(
      db,
      now.getFullYear(),
      now.getMonth() + 1
    );
  } catch (error) {
    console.error(
      "Failed to export workout data:",
      error
    );

    Alert.alert(
      "Export Failed",
      "Something went wrong while exporting your workout data."
    );
  }
}

  const [stats, setStats] =
    useState<WorkoutStats | null>(null);

  const [streak, setStreak] = useState(0);

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadProgress() {
        try {
          setLoading(true);

          const workoutStats =
            await loadWorkoutStats(db);

          const currentStreak =
            await calculateCurrentStreak(db);

          setStats(workoutStats);
          setStreak(currentStreak);
        } catch (error) {
          console.error(
            "Failed to load progress:",
            error
          );
        } finally {
          setLoading(false);
        }
      }

      loadProgress();
    }, [db])
  );

  if (loading || !stats) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>
        Progress
      </Text>

      <Text style={styles.subtitle}>
        Your workout journey so far
      </Text>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.streakCard}>
          <Text style={styles.emoji}>🔥</Text>

          <View>
            <Text style={styles.cardLabel}>
              Current Streak
            </Text>

            <Text style={styles.bigNumber}>
              {streak}
            </Text>

            <Text style={styles.cardDescription}>
              {streak === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.total_workouts}
            </Text>

            <Text style={styles.statLabel}>
              Total Workouts
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.month_workouts}
            </Text>

            <Text style={styles.statLabel}>
              This Month
            </Text>
          </View>
        </View>

        <View style={styles.statCardLarge}>
  <Text style={styles.statNumber}>
    {stats.total_sets}
  </Text>

  <Text style={styles.statLabel}>
    Total Sets
  </Text>
        </View>

        <Pressable
        style={styles.historyButton}
        onPress={() => router.push("/progression")}
        >
        <Text style={styles.historyButtonText}>
            Exercise Progress
        </Text>
        </Pressable>

        <Pressable
        style={styles.historyButton}
        onPress={() => router.push("/records")}
        >
        <Text style={styles.historyButtonText}>
            Personal Records
        </Text>
        </Pressable>

        <Pressable
          style={styles.exportButton}
          onPress={handleExportMonth}
        >
          <Text style={styles.exportButtonText}>
            Export This Month
          </Text>
        </Pressable>

        <Pressable
          style={styles.importButton}
          onPress={() => router.push("/import-workouts")}
        >
          <Text style={styles.importButtonText}>
            Import Monthly XLSX
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />

       
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 65,
    paddingHorizontal: 24,
  },

  loading: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  backButton: {
    marginBottom: 20,
  },

  back: {
    fontSize: 17,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#777777",
  },

  list: {
    marginTop: 28,
  },

  streakCard: {
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  emoji: {
    fontSize: 40,
  },

  cardLabel: {
    fontSize: 14,
    color: "#777777",
  },

  bigNumber: {
    marginTop: 2,
    fontSize: 32,
    fontWeight: "700",
  },

  cardDescription: {
    marginTop: -3,
    color: "#777777",
  },

  historyButton: {
  marginTop: 12,
  padding: 18,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#E5E5E5",
  alignItems: "center",
},

historyButtonText: {
  fontSize: 16,
  fontWeight: "600",
},

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  statCardLarge: {
    marginTop: 12,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },

  statLabel: {
    marginTop: 5,
    fontSize: 14,
    color: "#777777",
  },

  exportButton: {
  marginTop: 24,
  backgroundColor: "#222",
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: "center",
},

exportButtonText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},

importButton: {
  marginTop: 12,
  paddingVertical: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#222222",
  alignItems: "center",
},

importButtonText: {
  fontSize: 16,
  fontWeight: "600",
},
});