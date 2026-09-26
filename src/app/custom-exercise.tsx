import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createCustomExercise } from "../lib/database";

const categories = [
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Arms",
  "Core",
  "Cardio",
];

export default function CustomExerciseScreen() {
  const db = useSQLiteContext();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"strength" | "cardio">(
    "strength"
  );

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Please enter an exercise name.");
      return;
    }

    if (!category) {
      alert("Please select a category.");
      return;
    }

    try {
      setSaving(true);

      await createCustomExercise(db, {
        name: trimmedName,
        category,
        type,
      });

      alert("Custom exercise created!");

      router.back();
    } catch (error) {
      console.error(
        "Failed to create custom exercise:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Create Custom Exercise
        </Text>

        <Text style={styles.subtitle}>
          Add an exercise that isn't already in your exercise
          library.
        </Text>

        <Text style={styles.label}>
          Exercise Name
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cable Fly"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.sectionTitle}>
          Category
        </Text>

        <View style={styles.optionsContainer}>
          {categories.map((item) => {
            const selected = category === item;

            return (
              <Pressable
                key={item}
                style={[
                  styles.option,
                  selected && styles.selectedOption,
                ]}
                onPress={() => setCategory(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected &&
                      styles.selectedOptionText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          Exercise Type
        </Text>

        <View style={styles.typeContainer}>
          <Pressable
            style={[
              styles.typeOption,
              type === "strength" &&
                styles.selectedOption,
            ]}
            onPress={() => setType("strength")}
          >
            <Text
              style={[
                styles.optionText,
                type === "strength" &&
                  styles.selectedOptionText,
              ]}
            >
              Strength
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeOption,
              type === "cardio" &&
                styles.selectedOption,
            ]}
            onPress={() => setType("cardio")}
          >
            <Text
              style={[
                styles.optionText,
                type === "cardio" &&
                  styles.selectedOptionText,
              ]}
            >
              Cardio
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            saving && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? "Creating..."
              : "Create Exercise"}
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

  backButton: {
    marginBottom: 24,
  },

  back: {
    fontSize: 17,
  },

  content: {
    paddingBottom: 30,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#777777",
  },

  label: {
    marginTop: 32,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "600",
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "700",
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },

  selectedOption: {
    backgroundColor: "#222222",
    borderColor: "#222222",
  },

  optionText: {
    fontSize: 15,
    fontWeight: "600",
  },

  selectedOptionText: {
    color: "#FFFFFF",
  },

  typeContainer: {
    flexDirection: "row",
    gap: 10,
  },

  typeOption: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
  },

  saveButton: {
    marginTop: 32,
    paddingVertical: 17,
    borderRadius: 14,
    backgroundColor: "#222222",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});