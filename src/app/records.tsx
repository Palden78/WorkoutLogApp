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
  ExercisePersonalRecord,
  loadPersonalRecords,
} from "../lib/database";

export default function RecordsScreen() {
  const db = useSQLiteContext();

  const [records, setRecords] = useState<
    ExercisePersonalRecord[]
  >([]);

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadRecords() {
        try {
          setLoading(true);

          const personalRecords =
            await loadPersonalRecords(db);

          setRecords(personalRecords);
        } catch (error) {
          console.error(
            "Failed to load personal records:",
            error
          );
        } finally {
          setLoading(false);
        }
      }

      loadRecords();
    }, [db])
  );

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
        Personal Records
      </Text>

      <Text style={styles.subtitle}>
        Your strongest recorded sets
      </Text>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No records yet
            </Text>

            <Text style={styles.emptyText}>
              Complete a strength workout first.
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <View
              key={record.exercise_id}
              style={styles.recordCard}
            >
              <View style={styles.recordHeader}>
                <View>
                  <Text style={styles.exerciseName}>
                    {record.exercise_name}
                  </Text>

                  <Text style={styles.category}>
                    {record.category}
                  </Text>
                </View>

                <Text style={styles.trophy}>
                  🏆
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {record.heaviest_weight} kg
                  </Text>

                  <Text style={styles.statLabel}>
                    Heaviest Weight
                  </Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {record.reps_at_heaviest_weight}
                  </Text>

                  <Text style={styles.statLabel}>
                    Reps
                  </Text>
                </View>

                <View style={styles.stat}>
                <Text style={styles.statNumber}>
                    {record.estimated_one_rep_max} kg
                </Text>

                <Text style={styles.statLabel}>
                    Estimated 1RM
                </Text>
                </View>
              </View>
            </View>
          ))
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

  recordCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
  },

  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  exerciseName: {
    fontSize: 19,
    fontWeight: "600",
  },

  category: {
    marginTop: 5,
    fontSize: 14,
    color: "#777777",
  },

  trophy: {
    fontSize: 28,
  },

  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
    },

  stat: {
    flex: 1,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },

  statLabel: {
    marginTop: 5,
    fontSize: 13,
    color: "#777777",
  },

  emptyState: {
    paddingVertical: 60,
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
});