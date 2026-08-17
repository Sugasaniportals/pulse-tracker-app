import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
    registerForPushNotifications().catch((e) =>
      console.warn("Push registration failed", e)
    );
  }, []);

  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />

        {/* Top safe area + screen content */}
        <SafeAreaView
          style={styles.content}
          edges={["top"]}
        >
          <View style={styles.screen}>
            <Active />
          </View>
        </SafeAreaView>

        {/* Bottom navigation */}
        <SafeAreaView
          style={styles.bottomSafeArea}
          edges={["bottom"]}
        >
          <View style={styles.tabBar}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;

              return (
                <TouchableOpacity
                  key={t.key}
                  style={styles.tabBtn}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={20}
                    color={
                      active ? colors.exercise : colors.textFaint
                    }
                  />

                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: active
                          ? colors.exercise
                          : colors.textFaint,
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  screen: {
    flex: 1,
  },

  bottomSafeArea: {
    backgroundColor: "#0E1213",
  },

  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1E2624",
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#0E1213",
  },

  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 44,
  },

  tabLabel: {
    fontSize: 10.5,
  },
});