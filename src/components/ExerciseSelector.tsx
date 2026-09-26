import { useSQLiteContext } from "expo-sqlite";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  exercises,
  ExerciseDefinition,
} from "../data/exercises";

import {
  deleteCustomExercise,
  loadCustomExercises,
} from "../lib/database";

type Props = {
  onSelect: (exercise: ExerciseDefinition) => void;
  onCustom: () => void;
};

export default function ExerciseSelector({
  onSelect,
  onCustom,
}: Props) {
  const db = useSQLiteContext();

  const [customExercises, setCustomExercises] =
    useState<ExerciseDefinition[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function loadExercises() {
        try {
          const custom =
            await loadCustomExercises(db);

          setCustomExercises(custom);
        } catch (error) {
          console.error(
            "Failed to load custom exercises:",
            error
          );
        }
      }

      loadExercises();
    }, [db])
  );

  const allExercises = [
    ...exercises,
    ...customExercises,
  ];

  const categories = [
    ...new Set(
      allExercises.map(
        (exercise) => exercise.category
      )
    ),
  ];

  function handleDelete(
  exercise: ExerciseDefinition
) {
  Alert.alert(
    "Delete Exercise",
    `Are you sure you want to delete "${exercise.name}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCustomExercise(
              db,
              exercise.id
            );

            setCustomExercises((current) =>
              current.filter(
                (item) =>
                  item.id !== exercise.id
              )
            );
          } catch (error) {
            console.error(
              "Failed to delete custom exercise:",
              error
            );
          }
        },
      },
    ]
  );
}

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Select Exercise
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
          const categoryExercises =
            allExercises.filter(
              (exercise) =>
                exercise.category === category
            );

          return (
            <View
              key={category}
              style={styles.category}
            >
              <Text style={styles.categoryTitle}>
                {category}
              </Text>

              {categoryExercises.map(
                (exercise) => {
                  const isCustom =
                    exercise.id.startsWith(
                      "custom-"
                    );

                  return (
                    <View
                      key={exercise.id}
                      style={styles.exerciseWrapper}
                    >
                      <Pressable
                        style={styles.exercise}
                        onPress={() =>
                          onSelect(exercise)
                        }
                      >
                        <View
                          style={styles.exerciseInfo}
                        >
                          <Text
                            style={
                              styles.exerciseName
                            }
                          >
                            {exercise.name}
                          </Text>

                          <Text
                            style={
                              styles.exerciseType
                            }
                          >
                            {exercise.type ===
                            "cardio"
                              ? "Cardio"
                              : "Strength"}

                            {isCustom
                              ? " · Custom"
                              : ""}
                          </Text>
                        </View>

                        {isCustom && (
                          <Pressable
                            onPress={() =>
                              handleDelete(
                                exercise
                              )
                            }
                            hitSlop={10}
                          >
                            <Text
                              style={
                                styles.deleteText
                              }
                            >
                              Delete
                            </Text>
                          </Pressable>
                        )}
                      </Pressable>
                    </View>
                  );
                }
              )}
            </View>
          );
        })}

        <Pressable
          style={styles.customButton}
          onPress={onCustom}
        >
          <Text style={styles.customText}>
            ＋ Create Custom Exercise
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
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },

  category: {
    marginBottom: 24,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  exerciseWrapper: {
    marginBottom: 8,
  },

  exercise: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
  },

  exerciseType: {
    marginTop: 3,
    color: "#888888",
    fontSize: 13,
  },

  deleteText: {
    marginLeft: 12,
    color: "#CC4444",
    fontSize: 13,
    fontWeight: "600",
  },

  customButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#222222",
    alignItems: "center",
  },

  customText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});