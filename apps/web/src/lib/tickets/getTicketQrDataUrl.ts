import QRCode from "qrcode";

export async function getTicketQrDataUrl(qrValue: string): Promise<string> {
  return await QRCode.toDataURL(qrValue, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
  });
}
