import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Oswald - Bold Condensed for headers (Street Poster Aesthetic)
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Inter - Clean & Legible for body text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist",
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
  themeColor: "#0F0F0F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark"
      style={{ colorScheme: "dark" }}
    >
      <body
        className={`${oswald.variable} ${inter.variable} font-sans antialiased bg-night text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
