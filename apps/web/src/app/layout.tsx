import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
export const metadata: Metadata = {
  title: "Ear-Plug | Listen Local",
  description:
    "Discover local live music events in the Bay Area. Connect with bands, find shows, and never miss a gig.",
  keywords: ["live music", "concerts", "Bay Area", "local bands", "events"],
  authors: [{ name: "Ear-Plug" }],
  openGraph: {
    title: "Ear-Plug | Listen Local",
    description: "Discover local live music events in the Bay Area",
    type: "website",
    locale: "en_US",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${sourceSerif.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
