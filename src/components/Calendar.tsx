import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

const YEAR = 2026;
const MONTH = 8; // September (0 = January)

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const firstDay = new Date(YEAR, MONTH, 1).getDay();
  const numberOfDays = new Date(YEAR, MONTH + 1, 0).getDate();

  const calendarDays = [];

  // Empty spaces before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Actual days
  for (let day = 1; day <= numberOfDays; day++) {
    calendarDays.push(day);
  }

  function handleDayPress(day: number) {
    const date = `${YEAR}-${String(MONTH + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    router.push(`/workout/${date}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekRow}>
        {daysOfWeek.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.day} />;
          }

          return (
            <Pressable
              key={day}
              style={styles.day}
              onPress={() => handleDayPress(day)}
            >
              <View style={styles.dayCircle}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  weekDay: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#777777",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  day: {
    width: "14.2857%",
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  dayText: {
    fontSize: 16,
  },
});