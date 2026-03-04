import { useCurrentBand } from "@/hooks/useBand";
import { useSharedEventsMutations } from "@/hooks/useSharedEvents";
import { useVenues } from "@/hooks/useVenues";
import type { Genre } from "@ear-plug/shared/types";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

const GENRE_OPTIONS: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];

type StatusFilter = "all" | "confirmed" | "hold";

type FormMode = "create_confirmed" | "create_hold" | "edit";

interface EventFormState {
  title: string;
  dateTimeInput: string;
  capacityInput: string;
  genre: Genre;
  status: "confirmed" | "hold";
  venueId: string;
}

function emptyForm(): EventFormState {
  return {
    title: "",
    dateTimeInput: "",
    capacityInput: "150",
    genre: "indie",
    status: "confirmed",
    venueId: "",
  };
}

export function BandCalendarScreen() {
  const { band, activeBandId } = useCurrentBand();
  const bandEvents = useQuery(
    api.events.listByBand,
    activeBandId ? { bandId: activeBandId, includesPast: true } : "skip",
  ) as any[] | undefined;

  const { venues } = useVenues({ limit: 50 });
  const { createEvent, updateWithVenue, deleteTentative, createTentativeGig } = useSharedEventsMutations();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create_confirmed");
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm);

  const filteredEvents = useMemo(() => {
    const source = bandEvents ?? [];
    if (filter === "all") return source;
    return source.filter((event) => event.status === filter);
  }, [bandEvents, filter]);

  if (!activeBandId || !band) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-gray-500 text-center">
          Select or create a band from Profile to manage shows.
        </Text>
      </View>
    );
  }

  const openCreateConfirmed = () => {
    setMode("create_confirmed");
    setEditingEvent(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openCreateHold = () => {
    setMode("create_hold");
    setEditingEvent(null);
    setForm({ ...emptyForm(), status: "hold" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (event: any) => {
    setMode("edit");
    setEditingEvent(event);
    setForm({
      title: event.title ?? "",
      dateTimeInput: typeof event.dateTime === "number" ? new Date(event.dateTime).toISOString().slice(0, 16) : "",
      capacityInput: String(event.capacity ?? 150),
      genre: (event.genres?.[0] ?? event.genre ?? "indie") as Genre,
      status: event.status,
      venueId: event.venue?._id ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    setPending(true);
    setError(null);

    try {
      if (mode === "create_hold") {
        await createTentativeGig({
          bandId: activeBandId,
          title: form.title.trim() || undefined,
          genres: [form.genre],
        });
        setModalOpen(false);
        return;
      }

      const dateTime = Date.parse(form.dateTimeInput);
      if (!Number.isFinite(dateTime)) {
        throw new Error("Enter a valid date/time in ISO format (YYYY-MM-DDTHH:mm).");
      }

      const selectedVenue = venues.find((venue) => venue._id === form.venueId);
      if (!selectedVenue) {
        throw new Error("Select a venue.");
      }

      const capacity = Number(form.capacityInput || "150");
      if (!Number.isFinite(capacity) || capacity < 1) {
        throw new Error("Capacity must be at least 1.");
      }

      if (mode === "create_confirmed") {
        await createEvent({
          bandId: activeBandId,
          title: form.title.trim(),
          venueId: selectedVenue._id,
          dateTime,
          capacity,
          genres: [form.genre],
          status: "confirmed",
        });
      } else if (mode === "edit" && editingEvent) {
        await updateWithVenue({
          eventId: editingEvent._id,
          actingBandId: activeBandId,
          title: form.title.trim(),
          dateTime,
          capacity,
          genres: [form.genre],
          status: form.status,
        });
      }

      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Shows</Text>
        <Text className="text-sm text-gray-500 mt-1">Manage confirmed gigs and tentative holds.</Text>

        <View className="mt-3 flex-row">
          <FilterButton label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton
            label="Confirmed"
            active={filter === "confirmed"}
            onPress={() => setFilter("confirmed")}
          />
          <FilterButton label="Tentative" active={filter === "hold"} onPress={() => setFilter("hold")} />
        </View>

        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity onPress={openCreateConfirmed} className="flex-1 rounded-xl bg-violet-600 py-2.5">
            <Text className="text-center text-white font-semibold">New Confirmed</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openCreateHold} className="flex-1 rounded-xl border border-violet-400 py-2.5">
            <Text className="text-center text-violet-700 font-semibold">New Tentative</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-semibold text-gray-900">{item.title || "Untitled Gig"}</Text>
            <Text className="mt-1 text-sm text-gray-500">{item.venue?.name || "Venue TBD"}</Text>
            <Text className="mt-1 text-sm text-gray-500">
              {typeof item.dateTime === "number"
                ? new Date(item.dateTime).toLocaleString()
                : "Date not scheduled"}
            </Text>
            <Text className="mt-1 text-xs uppercase text-gray-600">Status: {item.status}</Text>

            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity onPress={() => openEdit(item)} className="flex-1 rounded-lg border border-gray-300 py-2">
                <Text className="text-center text-gray-700 font-medium">Edit</Text>
              </TouchableOpacity>

              {item.status === "hold" ? (
                <TouchableOpacity
                  onPress={async () => {
                    await deleteTentative({ eventId: item._id, actingBandId: activeBandId });
                  }}
                  className="flex-1 rounded-lg border border-red-300 py-2"
                >
                  <Text className="text-center text-red-700 font-medium">Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="py-16 items-center">
            <Text className="text-gray-500">No events yet.</Text>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 max-h-[88%]">
            <Text className="text-lg font-semibold text-gray-900">
              {mode === "create_confirmed"
                ? "Create Confirmed Gig"
                : mode === "create_hold"
                  ? "Create Tentative Hold"
                  : "Edit Gig"}
            </Text>

            <TextInput
              value={form.title}
              onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
              placeholder="Title"
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
            />

            {mode !== "create_hold" ? (
              <>
                <TextInput
                  value={form.dateTimeInput}
                  onChangeText={(value) => setForm((current) => ({ ...current, dateTimeInput: value }))}
                  placeholder="YYYY-MM-DDTHH:mm"
                  autoCapitalize="none"
                  className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />

                <TextInput
                  value={form.capacityInput}
                  onChangeText={(value) => setForm((current) => ({ ...current, capacityInput: value }))}
                  placeholder="Capacity"
                  keyboardType="number-pad"
                  className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />

                <Text className="mt-3 text-xs font-medium text-gray-500 uppercase">Venue</Text>
                <FlatList
                  className="mt-2 max-h-36"
                  data={venues}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => {
                    const active = form.venueId === item._id;
                    return (
                      <TouchableOpacity
                        onPress={() => setForm((current) => ({ ...current, venueId: item._id }))}
                        className={`mb-2 rounded-xl border px-3 py-2 ${
                          active ? "border-violet-400 bg-violet-50" : "border-gray-200"
                        }`}
                      >
                        <Text className="font-medium text-gray-900">{item.name}</Text>
                        <Text className="text-xs text-gray-500">{item.city}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />

                {mode === "edit" ? (
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setForm((current) => ({ ...current, status: "confirmed" }))}
                      className={`flex-1 rounded-xl border py-2 ${
                        form.status === "confirmed" ? "border-violet-400 bg-violet-50" : "border-gray-200"
                      }`}
                    >
                      <Text className={`text-center text-xs font-semibold ${form.status === "confirmed" ? "text-violet-700" : "text-gray-600"}`}>
                        Confirmed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setForm((current) => ({ ...current, status: "hold" }))}
                      className={`flex-1 rounded-xl border py-2 ${
                        form.status === "hold" ? "border-amber-400 bg-amber-50" : "border-gray-200"
                      }`}
                    >
                      <Text className={`text-center text-xs font-semibold ${form.status === "hold" ? "text-amber-700" : "text-gray-600"}`}>
                        Tentative
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}

            <Text className="mt-3 text-xs font-medium text-gray-500 uppercase">Primary Genre</Text>
            <View className="mt-2 flex-row flex-wrap">
              {GENRE_OPTIONS.map((value) => {
                const active = form.genre === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setForm((current) => ({ ...current, genre: value }))}
                    className={`mr-2 mb-2 rounded-full border px-3 py-1 ${
                      active ? "border-violet-400 bg-violet-50" : "border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs ${active ? "text-violet-700" : "text-gray-600"}`}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

            <TouchableOpacity
              onPress={submit}
              disabled={pending}
              className="mt-4 rounded-xl bg-violet-600 py-3"
            >
              <Text className="text-center font-semibold text-white">{pending ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalOpen(false)} className="mt-2 rounded-xl border border-gray-200 py-3">
              <Text className="text-center font-semibold text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-2 rounded-xl border px-3 py-2 ${active ? "border-violet-300 bg-violet-50" : "border-gray-200"}`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-violet-700" : "text-gray-600"}`}>{label}</Text>
    </TouchableOpacity>
  );
}
