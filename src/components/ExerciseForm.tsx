import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ExerciseDefinition } from "../data/exercises";

type StrengthSet = {
  reps: string;
  weight: string;
};

type WorkoutExercise = {
  exercise: ExerciseDefinition;
  sets?: StrengthSet[];
  duration?: string;
  distance?: string;
};

type Props = {
  exercise: ExerciseDefinition;
  initialData?: {
    sets?: StrengthSet[];
    duration?: string;
    distance?: string;
  };
  onSave: (exercise: WorkoutExercise) => void;
  onCancel: () => void;
};

export default function ExerciseForm({
  exercise,
  onSave,
  onCancel,
  initialData
}: Props) {
  const [sets, setSets] = useState<StrengthSet[]>(
    initialData?.sets ?? []
    );

    const [duration, setDuration] = useState(
    initialData?.duration ?? ""
    );

    const [distance, setDistance] = useState(
    initialData?.distance ?? ""
    );

  function addSet() {
    setSets((currentSets) => [
      ...currentSets,
      {
        reps: "",
        weight: "",
      },
    ]);
  }

  function updateSet(
    index: number,
    field: keyof StrengthSet,
    value: string
  ) {
    setSets((currentSets) =>
      currentSets.map((set, setIndex) =>
        setIndex === index
          ? {
              ...set,
              [field]: value,
            }
          : set
      )
    );
  }

  function removeSet(index: number) {
    setSets((currentSets) =>
      currentSets.filter((_, setIndex) => setIndex !== index)
    );
  }

  function handleSave() {
    if (exercise.type === "cardio") {
      onSave({
        exercise,
        duration,
        distance,
      });

      return;
    }

    onSave({
      exercise,
      sets,
    });
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onCancel}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{exercise.name}</Text>

        <Text style={styles.category}>
          {exercise.category} · {exercise.type}
        </Text>

        {exercise.type === "strength" ? (
          <>
            {sets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  No sets recorded yet
                </Text>

                <Text style={styles.emptyText}>
                  Complete your first set, then add it here.
                </Text>
              </View>
            ) : (
              <>
                {sets.map((set, index) => (
                  <View key={index} style={styles.setCard}>
                    <View style={styles.setHeader}>
                      <Text style={styles.setTitle}>
                        Set {index + 1}
                      </Text>

                      <Pressable
                        onPress={() => removeSet(index)}
                      >
                        <Text style={styles.removeText}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                          Reps
                        </Text>

                        <TextInput
                          value={set.reps}
                          onChangeText={(value) =>
                            updateSet(index, "reps", value)
                          }
                          keyboardType="number-pad"
                          style={styles.input}
                          placeholder="10"
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                          Weight (kg)
                        </Text>

                        <TextInput
                          value={set.weight}
                          onChangeText={(value) =>
                            updateSet(index, "weight", value)
                          }
                          keyboardType="decimal-pad"
                          style={styles.input}
                          placeholder="60"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Pressable
              style={styles.addSetButton}
              onPress={addSet}
            >
              <Text style={styles.addSetButtonText}>
                ＋ Add Set
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Duration
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Minutes
              </Text>

              <TextInput
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                style={styles.input}
                placeholder="30"
              />
            </View>

            <Text style={styles.sectionTitle}>
              Distance (optional)
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Kilometres
              </Text>

              <TextInput
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="5.0"
              />
            </View>
          </>
        )}

        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>
            {initialData ? "Save Changes" : "Add Exercise"}
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
  },

  content: {
    paddingBottom: 30,
  },

  back: {
    fontSize: 17,
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
  },

  category: {
    marginTop: 6,
    fontSize: 15,
    color: "#777777",
    textTransform: "capitalize",
  },

  emptyState: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
  },

  setCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
  },

  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  setTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  removeText: {
    fontSize: 14,
    color: "#CC4444",
  },

  inputRow: {
    flexDirection: "row",
    gap: 12,
  },

  inputContainer: {
    flex: 1,
  },

  inputLabel: {
    fontSize: 13,
    color: "#777777",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },

  addSetButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
  },

  addSetButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 14,
  },

  saveButton: {
    marginTop: 32,
    paddingVertical: 17,
    borderRadius: 14,
    backgroundColor: "#222222",
    alignItems: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});