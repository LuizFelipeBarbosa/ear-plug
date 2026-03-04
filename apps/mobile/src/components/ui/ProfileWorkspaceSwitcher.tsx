import { useProfileContext } from "@/context/ProfileContext";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

export function ProfileWorkspaceSwitcher() {
  const { mode, bandId, bands, setBandMode, setPersonalMode, notice, clearNotice } = useProfileContext();
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (mode !== "band" || !bandId) return "Personal";
    return bands.find((entry) => entry.band._id === bandId)?.band.name ?? "Band";
  }, [bandId, bands, mode]);

  const handleBandSelect = (nextBandId: Id<"bands">) => {
    setBandMode(nextBandId);
    setOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="rounded-xl border border-gray-200 px-3 py-2 bg-gray-50"
      >
        <Text className="text-sm font-semibold text-gray-900">Workspace: {label}</Text>
      </TouchableOpacity>

      {notice ? (
        <Pressable onPress={clearNotice} className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Text className="text-xs text-amber-700">{notice}</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)}>
          <View className="mx-6 mt-40 rounded-2xl bg-white p-4">
            <Text className="text-base font-semibold text-gray-900">Switch Workspace</Text>

            <TouchableOpacity
              onPress={() => {
                setPersonalMode();
                setOpen(false);
              }}
              className={`mt-3 rounded-xl border px-3 py-3 ${
                mode === "personal" ? "border-blue-400 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className="font-medium text-gray-900">Personal</Text>
            </TouchableOpacity>

            {bands.map((entry) => {
              const active = mode === "band" && bandId === entry.band._id;
              return (
                <TouchableOpacity
                  key={entry.band._id}
                  onPress={() => handleBandSelect(entry.band._id)}
                  className={`mt-2 rounded-xl border px-3 py-3 ${
                    active ? "border-violet-400 bg-violet-50" : "border-gray-200"
                  }`}
                >
                  <Text className="font-medium text-gray-900">{entry.band.name}</Text>
                  <Text className="text-xs text-gray-500 uppercase">{entry.membership.role}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={() => setOpen(false)} className="mt-4 rounded-xl bg-gray-900 py-3">
              <Text className="text-center font-semibold text-white">Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
