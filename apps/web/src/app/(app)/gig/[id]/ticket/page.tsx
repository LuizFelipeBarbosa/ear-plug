import { redirect } from "next/navigation";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventTicketPage({ params }: TicketPageProps) {
  const { id } = await params;
  redirect(`/gig/${id}`);
}
