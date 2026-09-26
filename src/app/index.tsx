import { StyleSheet, Text, View } from "react-native";
import Calendar from "../components/Calendar";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.streak}>🔥 0 day streak</Text>

      

      <Calendar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  streak: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 16,
    marginTop: 8,
    color: "#666666",
  },
});