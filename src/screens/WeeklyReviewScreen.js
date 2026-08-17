import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { colors, colorFor } from "../theme";
import { supabase } from "../lib/supabase";

function startOfWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyReviewScreen() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date().toISOString().slice(0, 10)));
  const [rows, setRows] = useState([]);
  const [worries, setWorries] = useState([]);

  const load = useCallback(async () => {
    const weekEnd = addDays(weekStart, 6);

    const { data: activities } = await supabase.from("activities").select("*, checkpoints(*)").lte("start_date", weekEnd);
    const { data: completions } = await supabase
      .from("completions")
      .select("*")
      .gte("date", weekStart)
      .lte("date", weekEnd);

    const summary = (activities || []).map((act) => {
      const cpIds = (act.checkpoints || []).map((c) => c.id);
      const totalPossible = cpIds.length * 7;
      const done = (completions || []).filter((c) => cpIds.includes(c.checkpoint_id) && c.done).length;
      const rate = totalPossible ? Math.round((done / totalPossible) * 100) : 0;
      return { id: act.id, name: act.name, colorKey: act.color_key, rate, done, totalPossible };
    });
    setRows(summary);

    const { data: w } = await supabase
      .from("worry_notes")
      .select("*")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date");
    setWorries(w || []);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleResolved = async (note) => {
    await supabase.from("worry_notes").update({ resolved: !note.resolved }).eq("id", note.id);
    load();
  };

  return (
    <ScrollView style={styles.app} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.title}>Weekly review</Text>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))}>
          <Text style={styles.navBtn}>‹ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekStart} — {addDays(weekStart, 6)}</Text>
        <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))}>
          <Text style={styles.navBtn}>Next ›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Completion</Text>
      {rows.length === 0 && <Text style={styles.dim}>No activities this week.</Text>}
      {rows.map((r) => (
        <View key={r.id} style={styles.rateRow}>
          <Text style={styles.rateName}>{r.name}</Text>
          <View style={styles.rateTrack}>
            <View style={[styles.rateFill, { width: `${r.rate}%`, backgroundColor: colorFor(r.colorKey) }]} />
          </View>
          <Text style={styles.ratePct}>{r.rate}%</Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>This week's worries & notes</Text>
      {worries.length === 0 && <Text style={styles.dim}>Nothing logged this week.</Text>}
      {worries.map((w) => (
        <TouchableOpacity key={w.id} style={styles.worryCard} onPress={() => toggleResolved(w)}>
          <Text style={{ color: w.resolved ? colors.exercise : colors.textFaint, fontSize: 10.5, marginBottom: 3 }}>
            {w.date} · {w.resolved ? "resolved — tap to reopen" : "tap if this resolved"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 13.5, textDecorationLine: w.resolved ? "line-through" : "none" }}>
            {w.text}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 12 },
  weekNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  navBtn: { color: colors.exercise, fontSize: 13 },
  weekLabel: { color: colors.textDim, fontSize: 12 },
  sectionLabel: { color: colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 10 },
  dim: { color: colors.textFaint, fontSize: 13 },
  rateRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  rateName: { color: colors.text, fontSize: 13, width: 80 },
  rateTrack: { flex: 1, height: 6, backgroundColor: "#1E2624", borderRadius: 3, overflow: "hidden" },
  rateFill: { height: "100%", borderRadius: 3 },
  ratePct: { color: colors.textFaint, fontSize: 11, width: 34, textAlign: "right" },
  worryCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, marginBottom: 8 },
});
