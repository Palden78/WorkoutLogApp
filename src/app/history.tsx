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
} from "react-native";

import {
  loadWorkoutHistory,
  WorkoutHistoryItem,
} from "../lib/database";

function formatHistoryDate(dateString: string) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const db = useSQLiteContext();

  const [workouts, setWorkouts] = useState<
    WorkoutHistoryItem[]
  >([]);

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadHistory() {
        try {
          setLoading(true);

          const history =
            await loadWorkoutHistory(db);

          setWorkouts(history);
        } catch (error) {
          console.error(
            "Failed to load workout history:",
            error
          );
        } finally {
          setLoading(false);
        }
      }

      loadHistory();
    }, [db])
  );

  function handleWorkoutPress(date: string) {
    router.push(`/workout/${date}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <Text style={styles.subtitle}>
        Your completed workouts
      </Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No workouts yet
          </Text>

          <Text style={styles.emptyText}>
            Complete your first workout and it will
            appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {workouts.map((workout) => (
            <Pressable
              key={workout.id}
              style={styles.workoutCard}
              onPress={() =>
                handleWorkoutPress(workout.date)
              }
            >
              <View>
                <Text style={styles.workoutDate}>
                  {formatHistoryDate(
                    workout.date
                  )}
                </Text>

                <Text
                style={styles.exerciseNames}
                numberOfLines={2}
                >
                {workout.exercise_names}
                </Text>

                <Text style={styles.exerciseCount}>
                {workout.exercise_count}{" "}
                {workout.exercise_count === 1
                    ? "exercise"
                    : "exercises"}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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

  workoutCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  workoutDate: {
    fontSize: 17,
    fontWeight: "600",
  },

  exerciseCount: {
    marginTop: 5,
    fontSize: 14,
    color: "#777777",
  },

  arrow: {
    fontSize: 28,
    color: "#888888",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "600",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
    lineHeight: 22,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNames: {
    marginTop: 6,
    fontSize: 14,
    color: "#555555",
    maxWidth: 280,
    },
});