import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Switch } from "react-native";
import { Plus, Droplet, Pill, Dumbbell } from "lucide-react-native";
import { colors, colorFor } from "../theme";
import { supabase } from "../lib/supabase";

const PRESETS = [
  { name: "Water", icon: "droplet", colorKey: "water", checkpoints: [
    { label: "Half by midday", time: "13:00" },
    { label: "Rest by night", time: "21:00" },
  ]},
  { name: "Medicine", icon: "pill", colorKey: "med", checkpoints: [
    { label: "Morning dose", time: "08:00" },
    { label: "Afternoon dose", time: "14:00" },
    { label: "Night dose", time: "21:00" },
  ]},
  { name: "Exercise", icon: "dumbbell", colorKey: "exercise", checkpoints: [
    { label: "Workout", time: "18:00" },
  ]},
];

const ICONS = { droplet: Droplet, pill: Pill, dumbbell: Dumbbell };

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function AddActivityModal({ onClose, onAdded, today }) {
  const [customName, setCustomName] = useState("");
  const [startTomorrow, setStartTomorrow] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = async (preset, name) => {
    setSaving(true);
    const startDate = startTomorrow ? addDays(today, 1) : today;
    const { data: activity, error } = await supabase
      .from("activities")
      .insert({
        name: preset ? preset.name : name,
        icon: preset ? preset.icon : "sparkles",
        color_key: preset ? preset.colorKey : "other",
        start_date: startDate,
        require_photo: requirePhoto,
      })
      .select()
      .single();

    if (!error && activity) {
      const cps = (preset ? preset.checkpoints : [{ label: "Done", time: "20:00" }]).map((cp, i) => ({
        activity_id: activity.id,
        label: cp.label,
        time_of_day: cp.time,
        sort_order: i,
      }));
      await supabase.from("checkpoints").insert(cps);
    }
    setSaving(false);
    onAdded?.();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add activity</Text>

          {PRESETS.map((p) => {
            const Icon = ICONS[p.icon];
            const color = colorFor(p.colorKey);
            return (
              <TouchableOpacity key={p.name} style={styles.presetRow} onPress={() => create(p, null)} disabled={saving}>
                <View style={[styles.iconWrap, { backgroundColor: color + "1A" }]}>
                  <Icon size={16} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{p.name}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: 11.5 }}>{p.checkpoints.length} checkpoint{p.checkpoints.length > 1 ? "s" : ""}</Text>
                </View>
                <Plus size={15} color={colors.textFaint} />
              </TouchableOpacity>
            );
          })}

          <View style={styles.row}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Custom activity name"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.smallAddBtn}
              onPress={() => customName.trim() && create(null, customName.trim())}
              disabled={saving}
            >
              <Plus size={15} color="#0E1213" />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Start from tomorrow instead of today</Text>
            <Switch value={startTomorrow} onValueChange={setStartTomorrow} trackColor={{ true: colors.exercise }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Require photo proof</Text>
            <Switch value={requirePhoto} onValueChange={setRequirePhoto} trackColor={{ true: colors.exercise }} />
          </View>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: colors.textFaint, fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#141918", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "85%" },
  handle: { width: 36, height: 4, backgroundColor: "#2A3634", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  title: { color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: 12 },
  presetRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#191F1E", borderWidth: 1, borderColor: "#202826", borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  input: { flex: 1, backgroundColor: "#191F1E", borderWidth: 1, borderColor: "#202826", borderRadius: 10, padding: 10, color: colors.text },
  smallAddBtn: { width: 40, borderRadius: 10, backgroundColor: colors.exercise, alignItems: "center", justifyContent: "center" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  toggleLabel: { color: colors.textDim, fontSize: 12.5, flex: 1, marginRight: 10 },
});
