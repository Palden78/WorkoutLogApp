import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { exercises } from "../data/exercises";
import {
  applyWorkoutImport,
  isStaleWorkoutImportError,
  loadWorkoutImportSnapshot,
} from "../lib/database";
import {
  buildWorkoutImportPlan,
  isWorkoutImportError,
  parseMonthlyWorkoutWorkbook,
  WorkoutImportPlan,
  XLSX_MIME_TYPE,
} from "../lib/workout-import";

type ImportStatus =
  | "idle"
  | "reading"
  | "ready"
  | "applying";

function formatMonth(month: string) {
  const [year, monthNumber] = month
    .split("-")
    .map(Number);

  return new Date(
    year,
    monthNumber - 1,
    1
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDateList(dates: string[]) {
  return dates.join(", ");
}

export default function ImportWorkoutsScreen() {
  const db = useSQLiteContext();
  const [status, setStatus] =
    useState<ImportStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [plan, setPlan] =
    useState<WorkoutImportPlan | null>(null);
  const applyingRef = useRef(false);

  const isBusy =
    status === "reading" || status === "applying";

  async function chooseFile() {
    if (isBusy) {
      return;
    }

    try {
      setStatus("reading");

      const result =
        await DocumentPicker.getDocumentAsync({
          type: XLSX_MIME_TYPE,
          multiple: false,
          copyToCacheDirectory: true,
        });

      if (result.canceled) {
        setStatus(plan ? "ready" : "idle");
        return;
      }

      const asset = result.assets[0];

      if (!asset.name.toLocaleLowerCase().endsWith(".xlsx")) {
        throw new Error("wrong-file-extension");
      }

      const bytes = asset.file
        ? await asset.file.arrayBuffer()
        : await new ExpoFile(asset.uri).arrayBuffer();
      const parsedFile =
        parseMonthlyWorkoutWorkbook(bytes);
      const snapshot =
        await loadWorkoutImportSnapshot(
          db,
          parsedFile.days.map((day) => day.date)
        );
      const nextPlan = buildWorkoutImportPlan(
        parsedFile,
        snapshot,
        exercises
      );

      setFileName(asset.name);
      setPlan(nextPlan);
      setStatus("ready");
    } catch (error) {
      console.error(
        "Failed to prepare workout import:",
        error
      );

      setFileName("");
      setPlan(null);
      setStatus("idle");

      if (
        isWorkoutImportError(error) &&
        error.kind === "validation"
      ) {
        Alert.alert(
          "File Cannot Be Imported",
          error.message
        );
        return;
      }

      Alert.alert(
        "Could Not Recognise File",
        "Choose an XLSX file exported by Workout Tracker."
      );
    }
  }

  async function applyImport() {
    if (
      !plan ||
      status !== "ready" ||
      applyingRef.current
    ) {
      return;
    }

    const confirmedPlan = plan;
    applyingRef.current = true;

    try {
      setStatus("applying");
      await applyWorkoutImport(db, confirmedPlan);

      const customExerciseCount =
        confirmedPlan.definitionsToInsert.filter(
          (definition) => definition.isCustom
        ).length;
      const restoredExerciseCount =
        confirmedPlan.definitionsToRestore.length;
      const exerciseUpdates = [
        customExerciseCount > 0
          ? `${customExerciseCount} custom exercise${
              customExerciseCount === 1 ? "" : "s"
            } added`
          : null,
        restoredExerciseCount > 0
          ? `${restoredExerciseCount} archived exercise${
              restoredExerciseCount === 1 ? "" : "s"
            } restored`
          : null,
      ].filter((message): message is string => message !== null);
      const exerciseMessage =
        exerciseUpdates.length > 0
          ? ` ${exerciseUpdates.join(" and ")}.`
          : "";

      setStatus("ready");
      Alert.alert(
        "Import Complete",
        `${formatMonth(confirmedPlan.month)} was imported. ${
          confirmedPlan.newDates.length
        } new workout${
          confirmedPlan.newDates.length === 1 ? "" : "s"
        } and ${confirmedPlan.replacementDates.length} replaced workout${
          confirmedPlan.replacementDates.length === 1 ? "" : "s"
        }.${exerciseMessage}`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to import workouts:", error);
      setStatus("ready");

      if (isStaleWorkoutImportError(error)) {
        setFileName("");
        setPlan(null);
        setStatus("idle");
        Alert.alert(
          "Review File Again",
          "Workout data changed after this file was reviewed. Choose the file again before importing."
        );
        return;
      }

      Alert.alert(
        "Import Failed",
        "No workout data was changed. Please try again."
      );
    } finally {
      applyingRef.current = false;
    }
  }

  function confirmImport() {
    if (!plan || isBusy) {
      return;
    }

    if (plan.replacementDates.length === 0) {
      void applyImport();
      return;
    }

    const visibleDates = plan.replacementDates.slice(
      0,
      5
    );
    const remainingDateCount =
      plan.replacementDates.length - visibleDates.length;
    const dateMessage = `${formatDateList(
      visibleDates
    )}${
      remainingDateCount > 0
        ? ` and ${remainingDateCount} more`
        : ""
    }`;

    Alert.alert(
      "Replace Existing Workouts?",
      `The complete workout on ${dateMessage} will be replaced. All other dates will remain unchanged.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Replace and Import",
          style: "destructive",
          onPress: () => {
            void applyImport();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        disabled={isBusy}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text
          style={[
            styles.back,
            isBusy && styles.disabledText,
          ]}
        >
          ‹ Back
        </Text>
      </Pressable>

      <Text style={styles.title}>Import Workouts</Text>
      <Text style={styles.subtitle}>
        Restore one month from an XLSX file exported by
        Workout Tracker.
      </Text>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {status === "reading" ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>
              Checking file…
            </Text>
          </View>
        ) : plan ? (
          <>
            <View style={styles.previewCard}>
              <Text style={styles.fileName}>
                {fileName}
              </Text>
              <Text style={styles.month}>
                {formatMonth(plan.month)}
              </Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {plan.dayCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    Workout days
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {plan.exerciseCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    Exercises
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {plan.rowCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    XLSX rows
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {plan.newDates.length} new workout
                {plan.newDates.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.detailText}>
                {plan.newDates.length > 0
                  ? formatDateList(plan.newDates)
                  : "No new dates"}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {plan.replacementDates.length} replacement
                {plan.replacementDates.length === 1
                  ? ""
                  : "s"}
              </Text>
              <Text style={styles.detailText}>
                {plan.replacementDates.length > 0
                  ? formatDateList(
                      plan.replacementDates
                    )
                  : "No existing workouts will be replaced"}
              </Text>
              {plan.replacementDates.length > 0 && (
                <Text style={styles.warningText}>
                  The complete workout on each date above
                  will be replaced.
                </Text>
              )}
            </View>

            {(plan.definitionsToInsert.some(
              (definition) => definition.isCustom
            ) ||
              plan.definitionsToRestore.length > 0) && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>
                  Custom exercises
                </Text>
                {plan.definitionsToInsert
                  .filter(
                    (definition) =>
                      definition.isCustom
                  )
                  .map((definition) => (
                    <Text
                      key={definition.exercise.id}
                      style={styles.detailText}
                    >
                      Add {definition.exercise.name}
                    </Text>
                  ))}
                {plan.definitionsToRestore.map(
                  (definition) => (
                    <Text
                      key={definition.id}
                      style={styles.detailText}
                    >
                      Restore {definition.name}
                    </Text>
                  )
                )}
              </View>
            )}

            <Pressable
              disabled={isBusy}
              style={[
                styles.primaryButton,
                isBusy && styles.disabledButton,
              ]}
              onPress={confirmImport}
            >
              {status === "applying" ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    Importing…
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Import Workouts
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={isBusy}
              style={styles.secondaryButton}
              onPress={chooseFile}
            >
              <Text style={styles.secondaryButtonText}>
                Choose Another File
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Choose your exported file
              </Text>
              <Text style={styles.emptyText}>
                The file will be checked before any workout
                data is changed.
              </Text>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={chooseFile}
            >
              <Text style={styles.primaryButtonText}>
                Choose XLSX File
              </Text>
            </Pressable>
          </>
        )}

        <View style={styles.bottomSpace} />
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
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  back: {
    fontSize: 17,
  },
  disabledText: {
    opacity: 0.4,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    color: "#777777",
  },
  content: {
    marginTop: 28,
  },
  loadingCard: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
  },
  previewCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
  },
  fileName: {
    fontSize: 14,
    color: "#777777",
  },
  month: {
    marginTop: 5,
    fontSize: 24,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    marginTop: 22,
    gap: 10,
  },
  summaryItem: {
    flex: 1,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#777777",
  },
  detailCard: {
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailText: {
    marginTop: 7,
    color: "#666666",
    lineHeight: 21,
  },
  warningText: {
    marginTop: 10,
    color: "#A64B00",
    lineHeight: 21,
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#777777",
  },
  primaryButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#222222",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpace: {
    height: 40,
  },
});
