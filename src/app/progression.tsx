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
  ExerciseProgressOption,
  ExerciseProgressSet,
  loadExerciseProgress,
  loadExerciseProgressOptions,
} from "../lib/database";

function getBestWeightByDate(
  sets: ExerciseProgressSet[]
) {
  const grouped = new Map<string, number>();

  for (const set of sets) {
    if (set.weight === null) {
      continue;
    }

    const current = grouped.get(set.workout_date);

    if (current === undefined || set.weight > current) {
      grouped.set(set.workout_date, set.weight);
    }
  }

  return Array.from(grouped.entries())
    .sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    )
    .map(([date, weight]) => ({
      date,
      weight,
    }));
}

export default function ProgressionScreen() {
  const db = useSQLiteContext();

  const [exercises, setExercises] = useState<
    ExerciseProgressOption[]
  >([]);

  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseProgressOption | null>(null);

  const [sets, setSets] = useState<
    ExerciseProgressSet[]
  >([]);

  const [loading, setLoading] = useState(true);
  const bestWeights = getBestWeightByDate(sets);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        try {
          setLoading(true);

          const options =
            await loadExerciseProgressOptions(db);

          setExercises(options);

          if (selectedExercise) {
            const progress =
              await loadExerciseProgress(
                db,
                selectedExercise.id
              );

            setSets(progress);
          }
        } catch (error) {
          console.error(
            "Failed to load exercise progression:",
            error
          );
        } finally {
          setLoading(false);
        }
      }

      loadData();
    }, [db, selectedExercise])
  );

  async function handleSelectExercise(
    exercise: ExerciseProgressOption
  ) {
    try {
      setSelectedExercise(exercise);

      const progress =
        await loadExerciseProgress(
          db,
          exercise.id
        );

      setSets(progress);
    } catch (error) {
      console.error(
        "Failed to load exercise progress:",
        error
      );
    }
  }

  if (loading) {
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
        Exercise Progress
      </Text>

      <Text style={styles.subtitle}>
        Track your strength over time
      </Text>

      {!selectedExercise ? (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
        >
            
          <Text style={styles.sectionTitle}>
            Select an exercise
          </Text>

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No exercise history yet
              </Text>

              <Text style={styles.emptyText}>
                Complete a strength workout first.
              </Text>
            </View>
          ) : (
            exercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() =>
                  handleSelectExercise(
                    exercise
                  )
                }
              >
                <View>
                  <Text style={styles.exerciseName}>
                    {exercise.name}
                  </Text>

                  <Text style={styles.category}>
                    {exercise.category}
                  </Text>
                </View>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </Pressable>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() =>
              setSelectedExercise(null)
            }
            style={styles.changeButton}
          >
            <Text style={styles.changeText}>
              ‹ Choose another exercise
            </Text>
          </Pressable>

          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseTitle}>
              {selectedExercise.name}
            </Text>

            <Text style={styles.category}>
              {selectedExercise.category}
            </Text>
          </View>

          {bestWeights.length > 0 && (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>
      Best Weight Over Time
    </Text>

    <View style={styles.chart}>
      {bestWeights.map((point) => (
        <View
          key={point.date}
          style={styles.chartColumn}
        >
          <Text style={styles.chartWeight}>
            {point.weight}
          </Text>

          <View
            style={[
              styles.chartBar,
              {
                height: Math.max(
                  20,
                  point.weight * 2
                ),
              },
            ]}
          />

          <Text style={styles.chartDate}>
            {formatShortDate(point.date)}
          </Text>
        </View>
      ))}
    </View>
  </View>
)}

          {sets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No sets recorded
              </Text>
            </View>
          ) : (
            sets.map((set, index) => (
              <View
                key={`${set.workout_date}-${set.set_number}-${index}`}
                style={styles.setCard}
              >
                <View>
                  <Text style={styles.date}>
                    {formatDate(
                      set.workout_date
                    )}
                  </Text>

                  <Text style={styles.setNumber}>
                    Set {set.set_number}
                  </Text>
                </View>

                <View style={styles.setValues}>
                  <Text style={styles.reps}>
                    {set.reps} reps
                  </Text>

                  {set.weight !== null && (
                    <Text style={styles.weight}>
                      {set.weight} kg
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString: string) {
  const [, month, day] = dateString
    .split("-")
    .map(Number);

  return `${month}/${day}`;
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

  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "600",
  },

  exerciseCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  exerciseName: {
    fontSize: 17,
    fontWeight: "600",
  },

  category: {
    marginTop: 5,
    fontSize: 14,
    color: "#777777",
  },

  arrow: {
    fontSize: 28,
    color: "#888888",
  },

  changeButton: {
    marginBottom: 20,
  },

  changeText: {
    fontSize: 15,
  },

  exerciseHeader: {
    marginBottom: 18,
  },

  exerciseTitle: {
    fontSize: 26,
    fontWeight: "700",
  },

  setCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  date: {
    fontSize: 16,
    fontWeight: "600",
  },

  setNumber: {
    marginTop: 5,
    fontSize: 13,
    color: "#777777",
  },

  setValues: {
    alignItems: "flex-end",
  },

  reps: {
    fontSize: 16,
    fontWeight: "600",
  },

  weight: {
    marginTop: 4,
    fontSize: 14,
    color: "#777777",
  },

  emptyState: {
    paddingVertical: 50,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },

  emptyText: {
    marginTop: 8,
    color: "#777777",
  },

  chartCard: {
  padding: 20,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#E5E5E5",
  marginBottom: 20,
},

chartTitle: {
  fontSize: 17,
  fontWeight: "600",
},

chart: {
  height: 220,
  marginTop: 24,
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 12,
  overflow: "hidden",
},

chartColumn: {
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "flex-end",
},

chartWeight: {
  fontSize: 12,
  marginBottom: 5,
},

chartBar: {
  width: 24,
  borderRadius: 8,
  backgroundColor: "#222222",
},

chartDate: {
  marginTop: 6,
  fontSize: 11,
  color: "#777777",
},
});