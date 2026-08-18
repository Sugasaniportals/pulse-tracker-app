import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      Alert.alert("Push setup", "Not a physical device — push tokens require a real phone.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Push setup", `Permission not granted (status: ${finalStatus}). Enable notifications for Pulse in your phone's Settings > Apps.`);
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Pulse reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6FFFB0",
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      Alert.alert("Push setup", "No EAS projectId found in app config.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const { error } = await supabase.from("push_tokens").upsert({ token }, { onConflict: "token" });

    if (error) {
      Alert.alert("Push setup", `Got token but Supabase save failed: ${error.message}`);
      return null;
    }

    Alert.alert("Push setup", "Success — token registered and saved.");
    return token;
  } catch (error) {
    Alert.alert("Push setup", `Unexpected error: ${error.message}`);
    return null;
  }
}