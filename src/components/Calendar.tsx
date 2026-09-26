import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

const YEAR = 2026;
const MONTH = 8; // September (0 = January)

const daysOfWeek = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export default function Calendar() {
  const db = useSQLiteContext();

   const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [completedDates, setCompletedDates] = useState<
    string[]
  >([]);

  const firstDay = new Date(year, month, 1).getDay();

    const numberOfDays = new Date(
    year,
    month + 1,
    0
    ).getDate();

  useEffect(() => {
  async function loadCompletedDates() {
    try {
      const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(numberOfDays).padStart(2, "0")}`;

      const workouts = await db.getAllAsync<{
        date: string;
      }>(
        `
        SELECT date
        FROM workouts
        WHERE date >= ?
        AND date <= ?
        `,
        monthStart,
        monthEnd
      );

      setCompletedDates(
        workouts.map((workout) => workout.date)
      );
    } catch (error) {
      console.error(
        "Failed to load completed workout dates:",
        error
      );
    }
  }

  loadCompletedDates();
}, [db, year, month, numberOfDays]);

  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= numberOfDays; day++) {
    calendarDays.push(day);
  }

  function handleDayPress(day: number) {
    const date = `${year}-${String(month + 1).padStart(
        2,
        "0"
        )}-${String(day).padStart(2, "0")}`;

    router.push(`/workout/${date}`);
  }
  function goToPreviousMonth() {
  setMonth((currentMonth) => {
    if (currentMonth === 0) {
      setYear((currentYear) => currentYear - 1);
      return 11;
    }

    return currentMonth - 1;
  });
}

function goToNextMonth() {
  setMonth((currentMonth) => {
    if (currentMonth === 11) {
      setYear((currentYear) => currentYear + 1);
      return 0;
    }

    return currentMonth + 1;
  });
}

  function isCompleted(day: number) {
  const date = `${year}-${String(month + 1).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;

  return completedDates.includes(date);
}

  return (
    <View style={styles.container}>
        <View style={styles.monthHeader}>
  <Pressable onPress={goToPreviousMonth}>
    <Text style={styles.monthButton}>‹</Text>
  </Pressable>

  <Text style={styles.monthTitle}>
    {new Date(year, month, 1).toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    )}
  </Text>

  <Pressable onPress={goToNextMonth}>
    <Text style={styles.monthButton}>›</Text>
  </Pressable>
</View>
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
            return (
              <View
                key={`empty-${index}`}
                style={styles.day}
              />
            );
          }

          const completed = isCompleted(day);

          return (
            <Pressable
              key={day}
              style={styles.day}
              onPress={() => handleDayPress(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  completed && styles.completedDay,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    completed && styles.completedDayText,
                  ]}
                >
                  {day}
                </Text>
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
  monthHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
},

monthTitle: {
  fontSize: 24,
  fontWeight: "700",
},

monthButton: {
  fontSize: 32,
  paddingHorizontal: 12,
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

  completedDay: {
    backgroundColor: "#4CAF50",
  },

  dayText: {
    fontSize: 16,
  },

  completedDayText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});