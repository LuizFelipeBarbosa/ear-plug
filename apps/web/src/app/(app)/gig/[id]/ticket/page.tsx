import { redirect } from "next/navigation";

interface TicketPageProps {
  params: { id: string };
}

export default function EventTicketPage({ params }: TicketPageProps) {
  redirect(`/gig/${params.id}`);
}
