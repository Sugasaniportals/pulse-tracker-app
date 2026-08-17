import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Flame, Check, Trash2, Camera, StickyNote, ChevronRight } from "lucide-react-native";
import { colors, colorFor } from "../theme";
import { calculateStreak, badgesEarned, nextBadge } from "../lib/streaks";
import { supabase } from "../lib/supabase";

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ActivityCard({ activity, checkpoints, completionsByDate, graceUsedByWeek, today, onCheckpointPress, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const color = colorFor(activity.color_key);
  const todayRec = completionsByDate[today] || {};
  const doneCount = checkpoints.filter((cp) => todayRec[cp.id]).length;

  const streak = calculateStreak({
    startDate: activity.start_date,
    checkpointIds: checkpoints.map((c) => c.id),
    completionsByDate,
    graceUsedByWeek,
    today,
  });
  const badges = badgesEarned(streak);
  const upcoming = nextBadge(streak);

  const remove = () => {
    Alert.alert("Delete activity?", `This removes "${activity.name}" and its history.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("activities").delete().eq("id", activity.id);
          onDeleted?.();
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { borderColor: doneCount === checkpoints.length ? color + "55" : colors.cardBorder }]}>
      <TouchableOpacity style={styles.top} onPress={() => setExpanded((e) => !e)}>
        <View style={[styles.iconWrap, { backgroundColor: color + "1A" }]}>
          <Flame size={15} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{activity.name}</Text>
          <Text style={styles.sub}>{doneCount}/{checkpoints.length} today</Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakPill}>
            <Flame size={12} color={colors.med} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
        <ChevronRight size={16} color="#4A5654" />
      </TouchableOpacity>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${checkpoints.length ? (doneCount / checkpoints.length) * 100 : 0}%`, backgroundColor: color }]} />
      </View>

      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b} style={[styles.badge, { borderColor: color }]}>
              <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{b}d</Text>
            </View>
          ))}
          {upcoming && <Text style={styles.nextBadgeText}>{upcoming - streak} days to {upcoming}d badge</Text>}
        </View>
      )}

      {expanded && (
        <View style={styles.cpList}>
          {checkpoints.map((cp) => {
            const done = !!todayRec[cp.id];
            return (
              <TouchableOpacity key={cp.id} style={[styles.cpRow, { opacity: done ? 0.6 : 1 }]} onPress={() => onCheckpointPress(cp)}>
                <View style={[styles.cpCheck, { borderColor: done ? color : "#3A4644", backgroundColor: done ? color : "transparent" }]}>
                  {done && <Check size={11} color="#0E1213" />}
                </View>
                <Text style={styles.cpLabel}>{cp.label}</Text>
                <Text style={styles.cpTime}>{fmtTime(cp.time_of_day)}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={remove} style={styles.deleteRow}>
            <Trash2 size={13} color={colors.textFaint} />
            <Text style={{ color: colors.textFaint, fontSize: 12, marginLeft: 6 }}>Delete activity</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 4 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sub: { color: colors.textFaint, fontSize: 11.5 },
  streakPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#241C12", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginRight: 6, gap: 3 },
  streakText: { color: colors.med, fontSize: 12 },
  progressTrack: { height: 3, backgroundColor: "#1E2624", borderRadius: 2, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  nextBadgeText: { color: colors.textFaint, fontSize: 10.5 },
  cpList: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 8 },
  cpRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 9 },
  cpCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  cpLabel: { color: "#C6D2D0", fontSize: 13, flex: 1 },
  cpTime: { color: colors.textFaint, fontSize: 11 },
  deleteRow: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder },
});
