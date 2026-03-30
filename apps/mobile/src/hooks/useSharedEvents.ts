import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";

export function useSharedEventsMutations() {
  const createEvent = useMutation(api.events.create);
  const createWithVenue = useMutation(api.events.createWithVenue);
  const updateWithVenue = useMutation(api.events.updateWithVenue);
  const deleteTentative = useMutation(api.events.deleteTentative);

  return {
    createEvent,
    createWithVenue,
    updateWithVenue,
    deleteTentative,
    createTentativeGig: (args: {
      bandId: Id<"bands">;
      title?: string;
      genres?: ("indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative")[];
    }) =>
      createEvent({
        bandId: args.bandId,
        title: args.title,
        genres: args.genres,
        status: "hold",
      }),
  };
}
