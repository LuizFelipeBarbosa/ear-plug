import type { Metadata } from "next";
import { buildBandPageMetadata } from "@/lib/shareMetadata";
import BandFeedPageClient from "./BandFeedPageClient";

type BandPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: BandPageProps): Promise<Metadata> {
  const { id } = await params;
  return await buildBandPageMetadata(id);
}

export default function BandFeedPage() {
  return <BandFeedPageClient />;
}
