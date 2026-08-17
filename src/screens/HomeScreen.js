import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { Flame, Plus } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";
import ActivityCard from "../components/ActivityCard";
import AddActivityModal from "../components/AddActivityModal";
import CheckpointModal from "../components/CheckpointModal";
import WorryNoteModal from "../components/WorryNoteModal";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HomeScreen() {
  const [activities, setActivities] = useState([]);
  const [checkpointsByActivity, setCheckpointsByActivity] = useState({});
  const [completionsByActivity, setCompletionsByActivity] = useState({});
  const [graceByActivity, setGraceByActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showWorry, setShowWorry] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);

  const today = todayStr();

  const loadAll = useCallback(async () => {
    const { data: acts } = await supabase.from("activities").select("*").order("created_at");
    const { data: cps } = await supabase.from("checkpoints").select("*").order("sort_order");
    const { data: comps } = await supabase.from("completions").select("*");
    const { data: grace } = await supabase.from("grace_days_used").select("*").eq("used", true);

    const cpMap = {};
    (cps || []).forEach((cp) => {
      cpMap[cp.activity_id] = cpMap[cp.activity_id] || [];
      cpMap[cp.activity_id].push(cp);
    });

    const compMap = {};
    (comps || []).forEach((c) => {
      compMap[c.activity_id] = compMap[c.activity_id] || {};
      compMap[c.activity_id][c.date] = compMap[c.activity_id][c.date] || {};
      compMap[c.activity_id][c.date][c.checkpoint_id] = c.done;
    });

    const graceMap = {};
    (grace || []).forEach((g) => {
      graceMap[g.activity_id] = graceMap[g.activity_id] || {};
      graceMap[g.activity_id][g.week_start] = true;
    });

    setActivities(acts || []);
    setCheckpointsByActivity(cpMap);
    setCompletionsByActivity(compMap);
    setGraceByActivity(graceMap);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const todaysActivities = activities.filter((a) => today >= a.start_date);
  const upcoming = activities.filter((a) => today < a.start_date);

  return (
    <View style={styles.app}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.exercise} />}
      >
        <Text style={styles.title}>Pulse</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </Text>

        <TouchableOpacity style={styles.worryBtn} onPress={() => setShowWorry(true)}>
          <Text style={styles.worryBtnText}>+ Note a worry / something to improve</Text>
        </TouchableOpacity>

        {loading && <Text style={styles.dim}>Loading…</Text>}

        {!loading && todaysActivities.length === 0 && upcoming.length === 0 && (
          <Text style={styles.dim}>No activities yet. Tap + to add water, medicine, or a workout.</Text>
        )}

        {todaysActivities.map((act) => (
          <ActivityCard
            key={act.id}
            activity={act}
            checkpoints={checkpointsByActivity[act.id] || []}
            completionsByDate={completionsByActivity[act.id] || {}}
            graceUsedByWeek={graceByActivity[act.id] || {}}
            today={today}
            onCheckpointPress={(cp) => setActiveCheckpoint({ activity: act, checkpoint: cp })}
            onDeleted={loadAll}
          />
        ))}

        {upcoming.length > 0 && <Text style={styles.upcomingLabel}>Starting soon</Text>}
        {upcoming.map((act) => (
          <View key={act.id} style={styles.upcomingRow}>
            <Text style={{ color: colors.text }}>{act.name}</Text>
            <Text style={styles.dimSmall}>starts {act.start_date}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Plus size={22} color="#0E1213" />
      </TouchableOpacity>

      {showAdd && (
        <AddActivityModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            loadAll();
          }}
          today={today}
        />
      )}

      {showWorry && <WorryNoteModal onClose={() => setShowWorry(false)} />}

      {activeCheckpoint && (
        <CheckpointModal
          activity={activeCheckpoint.activity}
          checkpoint={activeCheckpoint.checkpoint}
          date={today}
          existing={completionsByActivity[activeCheckpoint.activity.id]?.[today]}
          onClose={() => setActiveCheckpoint(null)}
          onSaved={() => {
            setActiveCheckpoint(null);
            loadAll();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textFaint, marginTop: 2, marginBottom: 14 },
  dim: { color: colors.textFaint, fontSize: 13, textAlign: "center", marginTop: 30, lineHeight: 20 },
  dimSmall: { color: colors.textFaint, fontSize: 11 },
  worryBtn: { backgroundColor: "#241C2A", borderRadius: 12, borderWidth: 1, borderColor: "#3A2C42", padding: 12, marginBottom: 14 },
  worryBtnText: { color: colors.other, fontSize: 13, fontWeight: "500" },
  upcomingLabel: { color: colors.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 8, marginBottom: 6 },
  upcomingRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#121716", borderRadius: 12, borderWidth: 1, borderColor: "#22302D", borderStyle: "dashed", padding: 12, marginBottom: 8 },
  fab: { position: "absolute", bottom: 24, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.exercise, alignItems: "center", justifyContent: "center", elevation: 6 },
});
