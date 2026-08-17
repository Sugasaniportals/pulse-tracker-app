import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Plus,
  Droplet,
  Pill,
  Dumbbell,
  Clock,
  ChevronLeft,
  Trash2,
} from "lucide-react-native";
import { colors, colorFor } from "../theme";
import { supabase } from "../lib/supabase";

const PRESETS = [
  {
    name: "Water",
    icon: "droplet",
    colorKey: "water",
    checkpoints: [
      { label: "Half by midday", time: "13:00" },
      { label: "Rest by night", time: "21:00" },
    ],
  },
  {
    name: "Medicine",
    icon: "pill",
    colorKey: "med",
    checkpoints: [
      { label: "Morning dose", time: "08:00" },
      { label: "Afternoon dose", time: "14:00" },
      { label: "Night dose", time: "21:00" },
    ],
  },
  {
    name: "Exercise",
    icon: "dumbbell",
    colorKey: "exercise",
    checkpoints: [{ label: "Workout", time: "18:00" }],
  },
];

const ICONS = {
  droplet: Droplet,
  pill: Pill,
  dumbbell: Dumbbell,
};

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function timeToDate(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function dateToTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export default function AddActivityModal({ onClose, onAdded, today }) {
  const [customName, setCustomName] = useState("");
  const [startTomorrow, setStartTomorrow] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customCheckpoints, setCustomCheckpoints] = useState([]);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingCheckpointIndex, setEditingCheckpointIndex] =
    useState(null);

  const isEditing = customCheckpoints.length > 0;

  const selectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomName("");

    setCustomCheckpoints(
      preset.checkpoints.map((cp) => ({
        label: cp.label,
        time: cp.time,
      }))
    );
  };

  const selectCustomActivity = () => {
    const name = customName.trim();

    if (!name) return;

    setSelectedPreset(null);

    setCustomCheckpoints([
      {
        label: "",
        time: "20:00",
      },
    ]);
  };

  const openTimePicker = (index) => {
    setEditingCheckpointIndex(index);
    setTimePickerVisible(true);
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setTimePickerVisible(false);
    }

    if (!selectedDate || editingCheckpointIndex === null) {
      return;
    }

    const newTime = dateToTime(selectedDate);

    setCustomCheckpoints((current) =>
      current.map((cp, index) =>
        index === editingCheckpointIndex
          ? { ...cp, time: newTime }
          : cp
      )
    );

    if (Platform.OS === "ios") {
      setTimePickerVisible(false);
    }
  };

  const updateCheckpointLabel = (index, label) => {
    setCustomCheckpoints((current) =>
      current.map((cp, i) =>
        i === index ? { ...cp, label } : cp
      )
    );
  };

  const addCheckpoint = () => {
    setCustomCheckpoints((current) => [
      ...current,
      {
        label: "",
        time: "20:00",
      },
    ]);
  };

  const removeCheckpoint = (index) => {
    if (customCheckpoints.length <= 1) {
      return;
    }

    setCustomCheckpoints((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const create = async () => {
    if (saving) return;

    const activityName = selectedPreset
      ? selectedPreset.name
      : customName.trim();

    if (!activityName) return;

    const invalidCheckpoint = customCheckpoints.some(
      (cp) => !cp.label.trim()
    );

    if (invalidCheckpoint) return;

    setSaving(true);

    try {
      const startDate = startTomorrow
        ? addDays(today, 1)
        : today;

      const { data: activity, error } = await supabase
        .from("activities")
        .insert({
          name: activityName,
          icon: selectedPreset
            ? selectedPreset.icon
            : "sparkles",
          color_key: selectedPreset
            ? selectedPreset.colorKey
            : "other",
          start_date: startDate,
          require_photo: requirePhoto,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Failed to create activity:",
          error
        );
        return;
      }

      const checkpoints = customCheckpoints.map(
        (cp, index) => ({
          activity_id: activity.id,
          label: cp.label.trim(),
          time_of_day: cp.time,
          sort_order: index,
        })
      );

      const { error: checkpointError } =
        await supabase
          .from("checkpoints")
          .insert(checkpoints);

      if (checkpointError) {
        console.error(
          "Failed to create checkpoints:",
          checkpointError
        );

        await supabase
          .from("activities")
          .delete()
          .eq("id", activity.id);

        return;
      }

      onAdded?.();
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setSelectedPreset(null);
    setCustomCheckpoints([]);
  };

  return (
    <Modal
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {!isEditing ? (
            <>
              <Text style={styles.title}>
                Add activity
              </Text>

              {PRESETS.map((preset) => {
                const Icon = ICONS[preset.icon];
                const color = colorFor(
                  preset.colorKey
                );

                return (
                  <TouchableOpacity
                    key={preset.name}
                    style={styles.presetRow}
                    onPress={() =>
                      selectPreset(preset)
                    }
                    disabled={saving}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor:
                            color + "1A",
                        },
                      ]}
                    >
                      <Icon
                        size={16}
                        color={color}
                      />
                    </View>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.presetName
                        }
                      >
                        {preset.name}
                      </Text>

                      <Text
                        style={
                          styles.presetSub
                        }
                      >
                        {
                          preset.checkpoints
                            .length
                        }{" "}
                        checkpoint
                        {preset.checkpoints
                          .length > 1
                          ? "s"
                          : ""}
                      </Text>
                    </View>

                    <Plus
                      size={15}
                      color={
                        colors.textFaint
                      }
                    />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.row}>
                <TextInput
                  value={customName}
                  onChangeText={
                    setCustomName
                  }
                  placeholder="Custom activity name"
                  placeholderTextColor={
                    colors.textFaint
                  }
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[
                    styles.smallAddBtn,
                    {
                      opacity:
                        customName.trim()
                          ? 1
                          : 0.4,
                    },
                  ]}
                  onPress={
                    selectCustomActivity
                  }
                  disabled={
                    saving ||
                    !customName.trim()
                  }
                >
                  <Plus
                    size={15}
                    color="#0E1213"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text
                  style={
                    styles.toggleLabel
                  }
                >
                  Start from tomorrow
                  instead of today
                </Text>

                <Switch
                  value={startTomorrow}
                  onValueChange={
                    setStartTomorrow
                  }
                  trackColor={{
                    true: colors.exercise,
                  }}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text
                  style={
                    styles.toggleLabel
                  }
                >
                  Require photo proof
                </Text>

                <Switch
                  value={requirePhoto}
                  onValueChange={
                    setRequirePhoto
                  }
                  trackColor={{
                    true: colors.exercise,
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={goBack}
                  style={styles.backButton}
                >
                  <ChevronLeft
                    size={20}
                    color={colors.text}
                  />
                </TouchableOpacity>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={styles.title}
                  >
                    Customize activity
                  </Text>

                  <Text
                    style={styles.subtitle}
                  >
                    {selectedPreset
                      ? selectedPreset.name
                      : customName.trim()}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.sectionText}
              >
                Set what you need to do
                and when it should be
                completed.
              </Text>

              <View
                style={
                  styles.checkpointList
                }
              >
                {customCheckpoints.map(
                  (checkpoint, index) => (
                    <View
                      key={index}
                      style={
                        styles.checkpointEditor
                      }
                    >
                      <View
                        style={
                          styles.checkpointHeader
                        }
                      >
                        <Text
                          style={
                            styles.checkpointNumber
                          }
                        >
                          Checkpoint{" "}
                          {index + 1}
                        </Text>

                        {customCheckpoints.length >
                          1 && (
                          <TouchableOpacity
                            onPress={() =>
                              removeCheckpoint(
                                index
                              )
                            }
                            style={
                              styles.removeButton
                            }
                          >
                            <Trash2
                              size={14}
                              color={
                                colors.textFaint
                              }
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <TextInput
                        value={
                          checkpoint.label
                        }
                        onChangeText={(text) =>
                          updateCheckpointLabel(
                            index,
                            text
                          )
                        }
                        placeholder="Checkpoint name"
                        placeholderTextColor={
                          colors.textFaint
                        }
                        style={
                          styles.checkpointInput
                        }
                      />

                      <TouchableOpacity
                        style={
                          styles.timeButton
                        }
                        onPress={() =>
                          openTimePicker(
                            index
                          )
                        }
                      >
                        <Clock
                          size={15}
                          color={
                            colors.exercise
                          }
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.timeCaption
                            }
                          >
                            Completion time
                          </Text>

                          <Text
                            style={
                              styles.timeText
                            }
                          >
                            {formatTime(
                              checkpoint.time
                            )}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>

              <TouchableOpacity
                onPress={addCheckpoint}
                style={
                  styles.addCheckpointButton
                }
              >
                <Plus
                  size={15}
                  color={
                    colors.exercise
                  }
                />

                <Text
                  style={
                    styles.addCheckpointText
                  }
                >
                  Add checkpoint
                </Text>
              </TouchableOpacity>

              <View style={styles.toggleRow}>
                <Text
                  style={
                    styles.toggleLabel
                  }
                >
                  Start from tomorrow
                  instead of today
                </Text>

                <Switch
                  value={startTomorrow}
                  onValueChange={
                    setStartTomorrow
                  }
                  trackColor={{
                    true: colors.exercise,
                  }}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text
                  style={
                    styles.toggleLabel
                  }
                >
                  Require photo proof
                </Text>

                <Switch
                  value={requirePhoto}
                  onValueChange={
                    setRequirePhoto
                  }
                  trackColor={{
                    true: colors.exercise,
                  }}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor:
                      colors.exercise,
                    opacity:
                      saving ||
                      customCheckpoints.some(
                        (cp) =>
                          !cp.label.trim()
                      )
                        ? 0.45
                        : 1,
                  },
                ]}
                onPress={create}
                disabled={
                  saving ||
                  customCheckpoints.some(
                    (cp) =>
                      !cp.label.trim()
                  )
                }
              >
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Add activity"}
                </Text>
              </TouchableOpacity>

              {timePickerVisible &&
                editingCheckpointIndex !==
                  null && (
                  <DateTimePicker
                    value={timeToDate(
                      customCheckpoints[
                        editingCheckpointIndex
                      ].time
                    )}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={
                      handleTimeChange
                    }
                  />
                )}
            </>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text
              style={styles.cancelText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#141918",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "90%",
  },

  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#2A3634",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },

  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  subtitle: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },

  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#191F1E",
    borderWidth: 1,
    borderColor: "#202826",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  presetName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },

  presetSub: {
    color: colors.textFaint,
    fontSize: 11.5,
    marginTop: 2,
  },

  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  input: {
    flex: 1,
    backgroundColor: "#191F1E",
    borderWidth: 1,
    borderColor: "#202826",
    borderRadius: 10,
    padding: 10,
    color: colors.text,
  },

  smallAddBtn: {
    width: 40,
    borderRadius: 10,
    backgroundColor:
      colors.exercise,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#191F1E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  sectionText: {
    color: colors.textFaint,
    fontSize: 11.5,
    marginTop: 8,
    marginBottom: 12,
  },

  checkpointList: {
    borderTopWidth: 1,
    borderTopColor:
      colors.cardBorder,
  },

  checkpointEditor: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor:
      colors.cardBorder,
  },

  checkpointHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 8,
  },

  checkpointNumber: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  removeButton: {
    padding: 4,
  },

  checkpointInput: {
    backgroundColor: "#191F1E",
    borderWidth: 1,
    borderColor: "#202826",
    borderRadius: 10,
    padding: 10,
    color: colors.text,
    marginBottom: 8,
  },

  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#191F1E",
    borderWidth: 1,
    borderColor: "#2A3634",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  timeCaption: {
    color: colors.textFaint,
    fontSize: 9.5,
    marginBottom: 2,
  },

  timeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  addCheckpointButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2A3634",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },

  addCheckpointText: {
    color: colors.exercise,
    fontSize: 12,
    fontWeight: "600",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginTop: 14,
  },

  toggleLabel: {
    color: colors.textDim,
    fontSize: 12.5,
    flex: 1,
    marginRight: 10,
  },

  createButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },

  createButtonText: {
    color: "#0E1213",
    fontSize: 14,
    fontWeight: "700",
  },

  cancelButton: {
    marginTop: 12,
    alignItems: "center",
  },

  cancelText: {
    color: colors.textFaint,
    fontSize: 12,
  },
});