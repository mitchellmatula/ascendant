import Link from "next/link";
import { Metadata } from "next";

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
    {
      "@type": "FAQPage",
      "@id": "https://ascendant.app/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Ascendant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ascendant is a universal progression system for athletes. It gamifies fitness by letting you complete challenges, earn XP, and progress through ranks from F to S across four domains: Strength, Skill, Endurance, and Speed.",
          },
        },
        {
          "@type": "Question",
          name: "How does the ranking system work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Athletes progress through 7 ranks: F, E, D, C, B, A, and S. Each rank has 10 sublevels. You earn XP by completing challenges at different tier levels, with harder challenges awarding more XP.",
          },
        },
        {
          "@type": "Question",
          name: "What are the four domains?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The four domains are Strength (💪), Skill (🎯), Endurance (🏃), and Speed (⚡). Each domain tracks your progress independently, allowing you to specialize or become a well-rounded athlete.",
          },
        },
        {
          "@type": "Question",
          name: "Can I connect my Strava account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Ascendant integrates with Strava to automatically verify endurance challenges like running, cycling, and swimming. Your activity data serves as proof of completion.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-3xl text-center space-y-8">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Rise Through the{" "}
            <span className="text-primary">Ranks</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ascendant is a universal progression system for athletes. 
            Train, compete, earn XP, and level up across multiple skill domains.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground rounded-lg font-medium text-base h-12 px-6 flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              Start Your Journey
            </Link>
            <Link
              href="#domains"
              className="border border-border rounded-lg font-medium text-base h-12 px-6 flex items-center justify-center hover:bg-accent transition-colors"
            >
              Learn More
            </Link>
          </div>

          <section id="domains" aria-labelledby="domains-heading" className="pt-16">
            <h2 id="domains-heading" className="sr-only">Skill Domains</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: "Strength", color: "bg-[oklch(0.65_0.2_25)]", icon: "💪", description: "Build raw power and muscular strength" },
                { name: "Skill", color: "bg-[oklch(0.65_0.2_145)]", icon: "🎯", description: "Master technique and coordination" },
                { name: "Endurance", color: "bg-[oklch(0.65_0.2_250)]", icon: "🏃", description: "Develop stamina and cardio capacity" },
                { name: "Speed", color: "bg-[oklch(0.65_0.2_85)]", icon: "⚡", description: "Maximize velocity and explosiveness" },
              ].map((domain) => (
                <article
                  key={domain.name}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border hover:border-primary/50 transition-colors"
                >
                  <div className={`w-12 h-12 ${domain.color} rounded-full flex items-center justify-center text-2xl`} aria-hidden="true">
                    {domain.icon}
                  </div>
                  <h3 className="font-medium">{domain.name}</h3>
                  <p className="sr-only">{domain.description}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="pt-8 text-sm text-muted-foreground">
            <p>F → E → D → C → B → A → S</p>
            <p className="mt-1">Progress through 7 ranks, each with 10 sublevels</p>
          </div>
        </div>
      </div>
    </>
  );
}
