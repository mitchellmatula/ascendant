import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { CelebrationProvider } from "@/components/ui/celebration-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ascendant.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ascendant - Universal Progression System for Athletes",
    template: "%s | Ascendant",
  },
  description:
    "Level up your athletic performance with Ascendant. Track challenges across Strength, Skill, Endurance, and Speed domains. Earn XP, progress through ranks F→S, and compete with athletes worldwide.",
  keywords: [
    "fitness tracking",
    "athletic progression",
    "workout challenges",
    "ninja warrior training",
    "calisthenics",
    "parkour",
    "obstacle course racing",
    "OCR training",
    "gamified fitness",
    "fitness XP",
    "strength training",
    "endurance training",
    "skill development",
    "athlete ranking",
  ],
  authors: [{ name: "Ascendant" }],
  creator: "Ascendant",
  publisher: "Ascendant",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Ascendant",
    title: "Ascendant - Universal Progression System for Athletes",
    description:
      "Level up your athletic performance. Track challenges across Strength, Skill, Endurance, and Speed. Earn XP, progress through ranks, and compete worldwide.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ascendant - Rise Through the Ranks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ascendant - Universal Progression System for Athletes",
    description:
      "Level up your athletic performance. Track challenges, earn XP, progress through ranks F→S.",
    images: ["/og-image.png"],
    creator: "@ascendantapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
        >
          <CelebrationProvider>
            <Header />
            <PageTransition>
              <main className="pb-16 md:pb-0">{children}</main>
            </PageTransition>
            <BottomNav />
            <InstallPrompt />
            <Toaster theme="dark" position="top-center" richColors />
          </CelebrationProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
