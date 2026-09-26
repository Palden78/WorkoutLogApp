import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { exercises, ExerciseDefinition } from "../data/exercises";

type Props = {
  onSelect: (exercise: ExerciseDefinition) => void;
  onCustom: () => void;
};

export default function ExerciseSelector({
  onSelect,
  onCustom,
}: Props) {
  const categories = [...new Set(exercises.map((exercise) => exercise.category))];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Exercise</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {categories.map((category) => {
          const categoryExercises = exercises.filter(
            (exercise) => exercise.category === category
          );

          return (
            <View key={category} style={styles.category}>
              <Text style={styles.categoryTitle}>{category}</Text>

              {categoryExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  style={styles.exercise}
                  onPress={() => onSelect(exercise)}
                >
                  <Text style={styles.exerciseName}>{exercise.name}</Text>

                  <Text style={styles.exerciseType}>
                    {exercise.type === "cardio"
                      ? "Cardio"
                      : "Strength"}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}

        <Pressable style={styles.customButton} onPress={onCustom}>
          <Text style={styles.customText}>＋ Create Custom Exercise</Text>
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

  exercise: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    marginBottom: 8,
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