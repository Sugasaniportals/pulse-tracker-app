import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme";
import { supabase } from "../lib/supabase";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DiaryScreen() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef(null);
  const today = todayStr();

  const load = useCallback(async () => {
    const { data: todayRow } = await supabase.from("diary_entries").select("*").eq("date", today).maybeSingle();
    setText(todayRow?.text || "");
    const { data: past } = await supabase
      .from("diary_entries")
      .select("*")
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(30);
    setHistory(past || []);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("diary_entries").upsert({ date: today, text, updated_at: new Date().toISOString() });
      setSaved(true);
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [text]);

  return (
    <ScrollView style={styles.app} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.title}>Diary</Text>
      <Text style={styles.subtitle}>{saved ? "saved" : "saving…"}</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Anything on your mind today — how you felt, what got in the way, small wins…"
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
      />

      {history.length > 0 && <Text style={styles.historyLabel}>Past entries</Text>}
      {history.map((h) => (
        <View key={h.date} style={styles.historyCard}>
          <Text style={styles.historyDate}>{h.date}</Text>
          <Text style={styles.historyText}>{h.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 11, color: colors.other, marginTop: 2, marginBottom: 12 },
  textarea: { backgroundColor: "#191720", borderWidth: 1, borderColor: "#2A2333", borderRadius: 12, padding: 14, color: colors.text, minHeight: 140, textAlignVertical: "top", lineHeight: 20 },
  historyLabel: { color: colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 22, marginBottom: 8 },
  historyCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, marginBottom: 8 },
  historyDate: { color: colors.textFaint, fontSize: 11, marginBottom: 4 },
  historyText: { color: "#C6D2D0", fontSize: 13, lineHeight: 19 },
});
