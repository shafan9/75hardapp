import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://75-squad-challenge.netlify.app";
const siteTitle = "75 Squad - Crush 75 Hard Together";
const siteDescription =
  "Track the 75 Hard challenge with your squad using a daily checklist, motivation, reminders, and shared progress on mobile and desktop.";

const appFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-app", display: "swap" });


const supabaseOrigin = (() => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: siteUrl,
    siteName: "75 Squad",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "75 Squad - Crush 75 Hard Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og.png"],
  },
  manifest: "/manifest.json",
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B0F1A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${appFont.variable} dark`}>
      <head>
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />}
      </head>
      <body className="bg-bg-primary text-text-primary antialiased">
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[120] rounded-lg bg-bg-card px-3 py-2 text-sm font-semibold text-text-primary shadow-lg focus:not-sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/70"
        >
          Skip to main content
        </a>
        <Providers>
          <main id="main-content" className="min-h-dvh">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
