import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Camera, Check, X } from "lucide-react-native";
import { colors, colorFor } from "../theme";
import { supabase } from "../lib/supabase";

export default function CheckpointModal({ activity, checkpoint, date, existing, onClose, onSaved }) {
  const [note, setNote] = useState(existing?.note || "");
  const [photoUri, setPhotoUri] = useState(existing?.photo_url || null);
  const [saving, setSaving] = useState(false);
  const color = colorFor(activity.color_key);
  const blocked = activity.require_photo && !photoUri;

  const capture = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (result.canceled) return;
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 400 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPhotoUri(manipulated.uri);
  };

  const save = async (markDone) => {
    if (markDone && blocked) return;
    setSaving(true);

    let photoUrl = photoUri;
    // Upload to Supabase Storage if it's a local file (not already a remote URL)
    if (photoUri && photoUri.startsWith("file")) {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const path = `${activity.id}/${date}-${checkpoint.id}.jpg`;
      const { error } = await supabase.storage.from("proof-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (!error) {
        const { data } = supabase.storage.from("proof-photos").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
    }

    await supabase.from("completions").upsert(
      {
        checkpoint_id: checkpoint.id,
        activity_id: activity.id,
        date,
        done: markDone,
        note,
        photo_url: photoUrl,
        completed_at: markDone ? new Date().toISOString() : null,
      },
      { onConflict: "checkpoint_id,date" }
    );

    setSaving(false);
    onSaved?.();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{activity.name}</Text>
          <Text style={[styles.subtitle, { color }]}>{checkpoint.label}</Text>

          {activity.require_photo && (
            <View style={{ marginVertical: 12 }}>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                  <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
                    <X size={12} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={capture} style={[styles.photoBtn, { borderColor: color + "66" }]}>
                  <Camera size={16} color={color} />
                  <Text style={{ color: colors.text, marginLeft: 8 }}>Capture proof photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
          />

          {blocked && <Text style={styles.warn}>A photo is required to mark this done.</Text>}

          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => save(false)} disabled={saving}>
              <Text style={{ color: colors.textDim }}>Save note only</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: color, opacity: blocked ? 0.4 : 1 }]}
              onPress={() => save(true)}
              disabled={saving || blocked}
            >
              <Check size={14} color="#0E1213" />
              <Text style={{ color: "#0E1213", fontWeight: "700", marginLeft: 6 }}>Mark done</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 10, alignItems: "center" }}>
            <Text style={{ color: colors.textFaint, fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
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
  subtitle: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  photo: { width: 96, height: 96, borderRadius: 10 },
  removePhoto: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#0E1213", borderWidth: 1, borderColor: "#2A3634", alignItems: "center", justifyContent: "center" },
  photoBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#191F1E", borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 12 },
  input: { backgroundColor: "#191F1E", borderWidth: 1, borderColor: "#202826", borderRadius: 10, padding: 10, color: colors.text, minHeight: 44, textAlignVertical: "top" },
  warn: { color: colors.danger, fontSize: 11.5, marginTop: 6 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, backgroundColor: "#1A2120", borderWidth: 1, borderColor: "#2A3634", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryBtn: { flex: 1.4, borderRadius: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
