import {
  ActionButton,
  AppScreen,
  EmptyState,
  HeroHeader,
  SectionCard,
  SectionTitle,
  SegmentedTabs,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useCurrentBand } from "@/hooks/useBand";
import { useSharedEventsMutations } from "@/hooks/useSharedEvents";
import { useVenues } from "@/hooks/useVenues";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
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

  const stats = useMemo(() => {
    const source = bandEvents ?? [];
    return {
      total: source.length,
      confirmed: source.filter((event) => event.status === "confirmed").length,
      holds: source.filter((event) => event.status === "hold").length,
    };
  }, [bandEvents]);

  if (!activeBandId || !band) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="Band workspace required"
          message="Select or create a band from Profile to manage shows."
        />
      </AppScreen>
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
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Shows"
          subtitle="Confirmed gigs and tentative holds stay in one mobile calendar surface."
          eyebrow="Band Workspace"
          tone="band"
        >
          <View className="flex-row gap-2">
            <StatCard label="All" value={String(stats.total)} tone="band" />
            <StatCard label="Confirmed" value={String(stats.confirmed)} tone="band" />
            <StatCard label="Tentative" value={String(stats.holds)} tone="band" />
          </View>
        </HeroHeader>
      }
    >
      <SegmentedTabs
        value={filter}
        tone="band"
        onChange={(value) => setFilter(value as StatusFilter)}
        options={[
          { value: "all", label: "All", count: stats.total },
          { value: "confirmed", label: "Confirmed", count: stats.confirmed },
          { value: "hold", label: "Tentative", count: stats.holds },
        ]}
      />

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1">
          <ActionButton label="New Confirmed" tone="band" onPress={openCreateConfirmed} />
        </View>
        <View className="flex-1">
          <ActionButton label="New Tentative" variant="secondary" onPress={openCreateHold} />
        </View>
      </View>

      <View className="mt-5 gap-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((item) => (
            <SectionCard key={item._id} tone={item.status === "hold" ? "warning" : "band"}>
              <SectionTitle
                title={item.title || "Untitled Gig"}
                subtitle={`${item.venue?.name || "Venue TBD"} • ${typeof item.dateTime === "number" ? `${formatEventDate(item.dateTime)} · ${formatEventTime(item.dateTime)}` : "Date not scheduled"}`}
                action={<MiniStatus status={item.status} />}
              />

              <Text className="text-xs text-slate-500">
                {typeof item.capacity === "number" ? `${item.rsvpCount}/${item.capacity} RSVPs` : `${item.rsvpCount} RSVPs`}
              </Text>

              <View className="mt-4 flex-row gap-2">
                <View className="flex-1">
                  <ActionButton label="Edit" variant="secondary" onPress={() => openEdit(item)} />
                </View>
                {item.status === "hold" ? (
                  <View className="flex-1">
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      onPress={() => void deleteTentative({ eventId: item._id, actingBandId: activeBandId })}
                    />
                  </View>
                ) : null}
              </View>
            </SectionCard>
          ))
        ) : (
          <EmptyState
            tone="band"
            title="No shows in this filter"
            message="Create a confirmed gig or a tentative hold to start building the calendar."
          />
        )}
      </View>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[88%] rounded-t-[32px] bg-white p-5">
            <Text className="text-lg font-semibold text-slate-950">
              {mode === "create_confirmed" ? "Create Confirmed Gig" : mode === "create_hold" ? "Create Tentative Hold" : "Edit Gig"}
            </Text>

            <TextInput
              value={form.title}
              onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
              placeholder="Title"
              placeholderTextColor="#94a3b8"
              className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            {mode !== "create_hold" ? (
              <>
                <TextInput
                  value={form.dateTimeInput}
                  onChangeText={(value) => setForm((current) => ({ ...current, dateTimeInput: value }))}
                  placeholder="YYYY-MM-DDTHH:mm"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />

                <TextInput
                  value={form.capacityInput}
                  onChangeText={(value) => setForm((current) => ({ ...current, capacityInput: value }))}
                  placeholder="Capacity"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />

                <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">Venue</Text>
                <FlatList
                  className="mt-3 max-h-40"
                  data={venues}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => {
                    const active = form.venueId === item._id;
                    return (
                      <TouchableOpacity
                        onPress={() => setForm((current) => ({ ...current, venueId: item._id }))}
                        className={`mb-2 rounded-[18px] border px-4 py-3 ${active ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}
                      >
                        <Text className="text-sm font-semibold text-slate-900">{item.name}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{item.city}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />

                {mode === "edit" ? (
                  <View className="mt-4 flex-row gap-2">
                    <View className="flex-1">
                      <ActionButton
                        label="Confirmed"
                        tone="band"
                        variant={form.status === "confirmed" ? "primary" : "secondary"}
                        onPress={() => setForm((current) => ({ ...current, status: "confirmed" }))}
                      />
                    </View>
                    <View className="flex-1">
                      <ActionButton
                        label="Tentative"
                        tone="band"
                        variant={form.status === "hold" ? "primary" : "secondary"}
                        onPress={() => setForm((current) => ({ ...current, status: "hold" }))}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">Primary Genre</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {GENRE_OPTIONS.map((value) => {
                const active = form.genre === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setForm((current) => ({ ...current, genre: value }))}
                    className={`rounded-full border px-3 py-2 ${active ? "border-violet-200 bg-violet-100" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-violet-700" : "text-slate-600"}`}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

            <View className="mt-5 gap-2">
              <ActionButton
                label={pending ? "Saving..." : "Save"}
                tone="band"
                disabled={pending}
                onPress={submit}
              />
              <ActionButton label="Cancel" variant="secondary" onPress={() => setModalOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function MiniStatus({ status }: { status: "confirmed" | "hold" }) {
  return (
    <View className={`rounded-full border px-2.5 py-1 ${status === "hold" ? "border-amber-200 bg-amber-100" : "border-emerald-200 bg-emerald-100"}`}>
      <Text className={`text-[10px] font-semibold uppercase tracking-[1.4px] ${status === "hold" ? "text-amber-700" : "text-emerald-700"}`}>
        {status === "hold" ? "Tentative" : "Confirmed"}
      </Text>
    </View>
  );
}
