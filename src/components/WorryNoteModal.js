import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { colors } from "../theme";
import { supabase } from "../lib/supabase";

export default function WorryNoteModal({ onClose }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await supabase.from("worry_notes").insert({ text: text.trim() });
    setSaving(false);
    onClose?.();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What's on your mind</Text>
          <Text style={styles.subtitle}>
            This is separate from your daily checklist — it won't affect any streak. It's just here so you can
            look back and see what kept coming up, or notice when it stopped.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="A worry, a pattern you've noticed, something you want to work on…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            autoFocus
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
              <Text style={{ color: colors.textDim }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={styles.primaryBtn} disabled={saving || !text.trim()}>
              <Text style={{ color: "#0E1213", fontWeight: "700" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#141918", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  handle: { width: 36, height: 4, backgroundColor: "#2A3634", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  title: { color: colors.text, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.textFaint, fontSize: 12, marginTop: 6, marginBottom: 12, lineHeight: 17 },
  input: { backgroundColor: "#191F1E", borderWidth: 1, borderColor: "#2A2333", borderRadius: 10, padding: 12, color: colors.text, minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8, marginTop: 14 },
  secondaryBtn: { flex: 1, backgroundColor: "#1A2120", borderWidth: 1, borderColor: "#2A3634", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryBtn: { flex: 1.4, backgroundColor: colors.other, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
