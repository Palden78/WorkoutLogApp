import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { saveSchedule } from "../lib/database";

const days = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export default function ScheduleScreen() {
  const db = useSQLiteContext();

  const [selectedDays, setSelectedDays] = useState<number[]>(
    []
  );

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      return [...current, day];
    });
  }

  async function handleContinue() {
    if (selectedDays.length === 0) {
      alert("Please select at least one workout day.");
      return;
    }

    try {
      await saveSchedule(db, selectedDays);

      router.replace("/");
    } catch (error) {
      console.error(
        "Failed to save schedule:",
        error
      );

      alert("Something went wrong while saving your schedule.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Which days do you train?
      </Text>

      <Text style={styles.subtitle}>
        Select the days you normally plan to work out.
        Your rest days will automatically be treated as
        rest days for your streak.
      </Text>

      <View style={styles.daysContainer}>
        {days.map((day) => {
          const selected = selectedDays.includes(day.value);

          return (
            <Pressable
              key={day.value}
              style={[
                styles.dayButton,
                selected && styles.selectedDay,
              ]}
              onPress={() => toggleDay(day.value)}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.selectedDayText,
                ]}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.selectedCount}>
        {selectedDays.length} workout{" "}
        {selectedDays.length === 1
          ? "day"
          : "days"}{" "}
        per week
      </Text>

      <Pressable
        style={styles.continueButton}
        onPress={handleContinue}
      >
        <Text style={styles.continueButtonText}>
          Save Schedule
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 100,
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#777777",
  },

  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 40,
  },

  dayButton: {
    width: "30%",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
  },

  selectedDay: {
    backgroundColor: "#222222",
    borderColor: "#222222",
  },

  dayText: {
    fontSize: 16,
    fontWeight: "600",
  },

  selectedDayText: {
    color: "#FFFFFF",
  },

  selectedCount: {
    marginTop: 24,
    fontSize: 16,
    color: "#555555",
  },

  continueButton: {
    marginTop: 32,
    paddingVertical: 17,
    borderRadius: 14,
    backgroundColor: "#222222",
    alignItems: "center",
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});