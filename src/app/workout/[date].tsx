import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ExerciseSelector from "../../components/ExerciseSelector";
import { ExerciseDefinition } from "../../data/exercises";

type LoggedExercise = {
  id: string;
  exercise: ExerciseDefinition;
  sets?: {
    reps: number;
    weight?: number;
  }[];
  duration?: number;
};

export default function WorkoutScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const [loggedExercises, setLoggedExercises] = useState<
    LoggedExercise[]
  >([]);

  function handleExerciseSelect(exercise: ExerciseDefinition) {
    setShowExerciseSelector(false);

    const newExercise: LoggedExercise = {
      id: `${exercise.id}-${Date.now()}`,
      exercise,
    };

    setLoggedExercises((current) => [...current, newExercise]);
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
            // We'll implement this next.
          }}
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
            <Text style={styles.emptyTitle}>No exercises yet</Text>

            <Text style={styles.emptyText}>
              Add exercises to record today's workout.
            </Text>
          </View>
        ) : (
          loggedExercises.map((item, index) => (
            <View key={item.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseNumber}>
                Exercise {index + 1}
              </Text>

              <Text style={styles.exerciseName}>
                {item.exercise.name}
              </Text>

              <Text style={styles.exerciseType}>
                {item.exercise.type === "cardio"
                  ? "Cardio"
                  : "Strength"}
              </Text>
            </View>
          ))
        )}

        <Pressable
          style={styles.addButton}
          onPress={() => setShowExerciseSelector(true)}
        >
          <Text style={styles.addButtonText}>＋ Add Exercise</Text>
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
});