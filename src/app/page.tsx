import Link from "next/link";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";
import { HomeFeed } from "@/components/feed/home-feed";
import { Trophy, Zap, Users, Target } from "lucide-react";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Ascendant - Universal Progression System for Athletes",
  description:
    "Level up your athletic performance with Ascendant. Track challenges across Strength, Skill, Endurance, and Speed domains. Earn XP, progress through ranks F→S, and compete with athletes worldwide.",
  alternates: {
    canonical: "/",
  },
};

// JSON-LD structured data for the homepage
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://ascendant.app/#website",
      url: "https://ascendant.app",
      name: "Ascendant",
      description: "Universal progression system for athletes",
      publisher: {
        "@id": "https://ascendant.app/#organization",
      },
      potentialAction: [
        {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://ascendant.app/challenges?search={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://ascendant.app/#organization",
      name: "Ascendant",
      url: "https://ascendant.app",
      logo: {
        "@type": "ImageObject",
        "@id": "https://ascendant.app/#logo",
        url: "https://ascendant.app/logo.png",
        contentUrl: "https://ascendant.app/logo.png",
        width: 512,
        height: 512,
        caption: "Ascendant",
      },
      sameAs: [
        "https://twitter.com/ascendantapp",
        "https://instagram.com/ascendantapp",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://ascendant.app/#app",
      name: "Ascendant",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      description:
        "A gamified fitness platform where athletes earn XP by completing challenges across Strength, Skill, Endurance, and Speed domains. Progress through ranks from F to S.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "150",
        bestRating: "5",
        worstRating: "1",
      },
      featureList: [
        "Track athletic challenges",
        "Earn XP and level up",
        "Progress through 7 ranks (F→S)",
        "Four skill domains: Strength, Skill, Endurance, Speed",
        "Strava integration",
        "Gym and community features",
        "Video proof submissions",
      ],
    },
  ],
};

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  
  // Get current user's athlete ID for follow button state
  let currentAthleteId: string | undefined;
  if (userId) {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { athlete: { select: { id: true } } },
    });
    currentAthleteId = user?.athlete?.id;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Hero Section for non-authenticated users */}
        {!isSignedIn && (
          <section className="mb-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 sm:p-8">
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Rise Through the <span className="text-primary">Ranks</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Ascendant is a universal progression system for athletes. 
                Complete challenges, earn XP, and level up across Strength, Skill, Endurance, and Speed.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/50">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span className="text-xs font-medium">Earn XP</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/50">
                  <Zap className="w-6 h-6 text-primary" />
                  <span className="text-xs font-medium">Level Up</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/50">
                  <Target className="w-6 h-6 text-green-500" />
                  <span className="text-xs font-medium">4 Domains</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-background/50">
                  <Users className="w-6 h-6 text-blue-500" />
                  <span className="text-xs font-medium">Community</span>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <SignUpButton mode="modal">
                  <button className="bg-primary text-primary-foreground rounded-lg font-medium text-base h-11 px-6 hover:opacity-90 transition-opacity cursor-pointer">
                    Start Your Journey
                  </button>
                </SignUpButton>
                <Link
                  href="/challenges"
                  className="border border-border rounded-lg font-medium text-base h-11 px-6 flex items-center justify-center hover:bg-accent transition-colors"
                >
                  Browse Challenges
                </Link>
              </div>

              {/* Rank progression */}
              <p className="text-xs text-muted-foreground pt-2">
                F → E → D → C → B → A → S • 7 ranks, each with 10 sublevels
              </p>
            </div>
          </section>
        )}

        {/* Feed Section */}
        <HomeFeed isSignedIn={isSignedIn} currentAthleteId={currentAthleteId} />
      </div>
    </>
  );
}
