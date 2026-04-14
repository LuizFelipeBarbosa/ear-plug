import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";

const DEFAULT_METADATA_BASE_URL = "http://localhost:3000";

function normalizeMetadataBaseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(normalizedValue)
    ? normalizedValue
    : `https://${normalizedValue}`;
}

function resolveMetadataBase() {
  const configuredUrl =
    normalizeMetadataBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeMetadataBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeMetadataBaseUrl(process.env.VERCEL_URL) ||
    DEFAULT_METADATA_BASE_URL;

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(DEFAULT_METADATA_BASE_URL);
  }
}

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "EarPlug | Listen Local",
  description:
    "Discover local live music events in the Bay Area. Connect with bands, find shows, and never miss a gig.",
  keywords: ["live music", "concerts", "Bay Area", "local bands", "events"],
  authors: [{ name: "EarPlug" }],
  icons: {
    icon: [
      {
        url: "/branding/earplug-mark-light.png",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/branding/earplug-mark-dark.png",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/branding/earplug-mark-light.png",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/branding/earplug-mark-dark.png",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/branding/earplug-mark-light.png",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/branding/earplug-mark-dark.png",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "EarPlug | Listen Local",
    description: "Discover local live music events in the Bay Area",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/branding/earplug-wordmark-light.png",
        alt: "EarPlug",
      },
    ],
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem("ear-plug-theme");
    const theme = stored === "light" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch (_error) {}
})();`,
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${sourceSerif.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
