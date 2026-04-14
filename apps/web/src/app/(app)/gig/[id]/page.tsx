import type { Metadata } from "next";
import { buildEventPageMetadata } from "@/lib/shareMetadata";
import EventDetailsPageClient from "./EventDetailsPageClient";

type EventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  return await buildEventPageMetadata(id);
}

export default function EventDetailsPage() {
  return <EventDetailsPageClient />;
}
