import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ExerciseForm from "../../components/ExerciseForm";
import ExerciseSelector from "../../components/ExerciseSelector";

import { ExerciseDefinition } from "../../data/exercises";

import {
  loadWorkout,
  LoggedExercise,
  saveWorkout,
} from "../../lib/database";



function isFutureDate(dateString: string) {
  const today = new Date();

  const todayString = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(
    2,
    "0"
  )}`;

  return dateString > todayString;
}


export default function WorkoutScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();

  const [showExerciseSelector, setShowExerciseSelector] =
    useState(false);

  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseDefinition | null>(null);

  const [loggedExercises, setLoggedExercises] = useState<
    LoggedExercise[]
  >([]);
  useEffect(() => {
  if (!date) {
    return;
  }

  async function loadSavedWorkout() {
    try {
      console.log("Opening workout screen for:", date);

      const exercises = await loadWorkout(
        db,
        date
      );

      console.log(
        "Exercises returned to screen:",
        exercises
      );

      setLoggedExercises(exercises);
    } catch (error) {
      console.error(
        "FAILED TO LOAD WORKOUT:",
        error
      );
    }
  }

  loadSavedWorkout();
}, [db, date]);

  function handleExerciseSelect(
    exercise: ExerciseDefinition
  ) {
    setShowExerciseSelector(false);
    setSelectedExercise(exercise);
  }

  function handleExerciseSave(exerciseData: {
    exercise: ExerciseDefinition;
    sets?: {
      reps: string;
      weight: string;
    }[];
    duration?: string;
    distance?: string;
  }) {
    const newExercise: LoggedExercise = {
      id: `${exerciseData.exercise.id}-${Date.now()}`,
      ...exerciseData,
    };

    setLoggedExercises((current) => [
      ...current,
      newExercise,
    ]);

    setSelectedExercise(null);
  }

  if (showExerciseSelector) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={() => setShowExerciseSelector(false)}
          style={styles.backButton}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <ExerciseSelector
          onSelect={handleExerciseSelect}
          onCustom={() => {
            // We'll implement custom exercises next.
          }}
        />
      </View>
    );
  }

  if (selectedExercise) {
    return (
      <View style={styles.container}>
        <ExerciseForm
          exercise={selectedExercise}
          onSave={handleExerciseSave}
          onCancel={() => setSelectedExercise(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Workout</Text>

      <Text style={styles.date}>{date}</Text>

      <ScrollView
        style={styles.workoutList}
        showsVerticalScrollIndicator={false}
      >
        {loggedExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No exercises yet
            </Text>

            <Text style={styles.emptyText}>
              Add exercises to record today's workout.
            </Text>
          </View>
        ) : (
          loggedExercises.map((item, index) => (
            <View
              key={item.id}
              style={styles.exerciseCard}
            >
              <Text style={styles.exerciseNumber}>
                Exercise {index + 1}
              </Text>

              <Text style={styles.exerciseName}>
                {item.exercise.name}
              </Text>

              <Text style={styles.exerciseType}>
                {item.exercise.type === "cardio"
                  ? "Cardio"
                  : `${item.sets?.length ?? 0} sets`}
              </Text>

              {item.exercise.type === "strength" &&
                item.sets?.map((set, setIndex) => (
                  <Text
                    key={setIndex}
                    style={styles.setSummary}
                  >
                    Set {setIndex + 1}: {set.reps} reps
                    {set.weight
                      ? ` · ${set.weight} kg`
                      : ""}
                  </Text>
                ))}

              {item.exercise.type === "cardio" && (
                <>
                  {item.duration && (
                    <Text style={styles.setSummary}>
                      Duration: {item.duration} min
                    </Text>
                  )}

                  {item.distance && (
                    <Text style={styles.setSummary}>
                      Distance: {item.distance} km
                    </Text>
                  )}
                </>
              )}
            </View>
          ))
        )}

        <Pressable
          style={styles.addButton}
          onPress={() => setShowExerciseSelector(true)}
        >
          <Text style={styles.addButtonText}>
            ＋ Add Exercise
          </Text>
        </Pressable>

        {loggedExercises.length > 0 && (
          <Pressable
            style={styles.finishButton}
            onPress={async () => {
                try {
                await saveWorkout(
                    db,
                    date!,
                    loggedExercises
                );

                alert("Workout saved!");
                router.back();
                } catch (error) {
                console.error("Failed to save workout:", error);
                alert("Something went wrong while saving.");
                }
            }}
            >
            <Text style={styles.finishButtonText}>
                Finish Workout
            </Text>
            </Pressable>
        )}

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

  backButton: {
    marginBottom: 24,
  },

  back: {
    fontSize: 17,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  date: {
    marginTop: 6,
    fontSize: 16,
    color: "#777777",
  },

  workoutList: {
    marginTop: 32,
  },

  emptyState: {
    paddingVertical: 50,
    alignItems: "center",
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
  },

  exerciseCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
  },

  exerciseNumber: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 5,
  },

  exerciseName: {
    fontSize: 19,
    fontWeight: "700",
  },

  exerciseType: {
    marginTop: 5,
    color: "#777777",
  },

  setSummary: {
    marginTop: 6,
    fontSize: 14,
    color: "#555555",
  },

  addButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#222222",
    alignItems: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  finishButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
  },

  finishButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});