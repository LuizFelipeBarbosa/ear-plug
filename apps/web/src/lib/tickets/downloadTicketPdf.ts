import { jsPDF } from "jspdf";
import type { MyEventTicketPayload } from "@ear-plug/shared/types";
import { getTicketQrDataUrl } from "./getTicketQrDataUrl";
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export async function downloadTicketPdf(
  payload: MyEventTicketPayload,
): Promise<void> {
  if (!payload.ticket?.qrValue) {
    throw new Error("Ticket QR is unavailable for this ticket state.");
  }
  const qrDataUrl = await getTicketQrDataUrl(payload.ticket.qrValue);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 48;
  let y = 64;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Ear-Plug Event Ticket", marginX, y);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Present this QR code at the door for check-in.", marginX, y);
  y += 32;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1);
  doc.rect(marginX, y, 510, 260);
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(payload.eventTitle, marginX + 16, y, { maxWidth: 320 });
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Date: ${formatDateTime(payload.eventDateTime)}`, marginX + 16, y);
  y += 20;
  doc.text(`Attendee: ${payload.attendeeName}`, marginX + 16, y);
  y += 20;
  doc.text(`Ticket Code: ${payload.ticket.ticketCode}`, marginX + 16, y);
  if (payload.venue) {
    y += 20;
    doc.text(`Venue: ${payload.venue.name}`, marginX + 16, y);
    y += 20;
    doc.text(
      `Address: ${payload.venue.address}, ${payload.venue.city}`,
      marginX + 16,
      y,
      { maxWidth: 320 },
    );
  }
  doc.addImage(qrDataUrl, "PNG", marginX + 360, 160, 170, 170);
  const noticeY = 366;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("One-time QR", marginX + 16, noticeY);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This QR code becomes invalid after first successful scan.",
    marginX + 88,
    noticeY,
  );
  const fileName = `${safeFileName(payload.eventTitle)}-${payload.ticket.ticketCode}.pdf`;
  doc.save(fileName || "ear-plug-ticket.pdf");
}
