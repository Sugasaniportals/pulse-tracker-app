import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Activity, BookOpen, BarChart3 } from "lucide-react-native";
import HomeScreen from "./src/screens/HomeScreen";
import DiaryScreen from "./src/screens/DiaryScreen";
import WeeklyReviewScreen from "./src/screens/WeeklyReviewScreen";
import { registerForPushNotifications } from "./src/lib/notifications";
import { colors } from "./src/theme";

const TABS = [
  { key: "home", label: "Today", icon: Activity, Component: HomeScreen },
  { key: "diary", label: "Diary", icon: BookOpen, Component: DiaryScreen },
  { key: "review", label: "Review", icon: BarChart3, Component: WeeklyReviewScreen },
];

export default function App() {
  const [tab, setTab] = useState("home");

  useEffect(() => {
    registerForPushNotifications().catch((e) => console.warn("Push registration failed", e));
  }, []);

  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Active />
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => setTab(t.key)}>
              <Icon size={20} color={active ? colors.exercise : colors.textFaint} />
              <Text style={[styles.tabLabel, { color: active ? colors.exercise : colors.textFaint }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1E2624", paddingBottom: 22, paddingTop: 10, backgroundColor: "#0E1213" },
  tabBtn: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 10.5 },
});
