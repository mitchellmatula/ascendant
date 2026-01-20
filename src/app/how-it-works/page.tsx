import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRankColor, getRankName, RANKS } from "@/lib/levels";
import type { Rank } from "@/lib/levels";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how Ascendant's ranking system works. Progress through 7 ranks from F to S across Strength, Skill, Endurance, and Speed domains.",
};

const rankDescriptions: Record<string, { subtitle: string; description: string; examples: string[] }> = {
  F: {
    subtitle: "Foundation",
    description: "You're starting your journey. These challenges build fundamental movement patterns and baseline fitness. Everyone starts here.",
    examples: ["10 push-ups", "1 mile run", "30 second plank"],
  },
  E: {
    subtitle: "Explorer", 
    description: "You've built a foundation and are exploring your capabilities. Challenges require consistent training and developing good habits.",
    examples: ["25 push-ups", "5K run under 30 min", "5 pull-ups"],
  },
  D: {
    subtitle: "Disciplined",
    description: "Regular training is part of your lifestyle. You're developing real strength, skill, and endurance beyond casual fitness.",
    examples: ["50 push-ups", "10K run", "10 strict pull-ups"],
  },
  C: {
    subtitle: "Challenger",
    description: "You're challenging yourself beyond average. These achievements put you ahead of most recreational athletes.",
    examples: ["One-arm push-up", "Half marathon", "Muscle-up"],
  },
  B: {
    subtitle: "Breakthrough",
    description: "Breaking through plateaus that stop most people. You're entering territory that requires serious dedication and smart programming.",
    examples: ["20 muscle-ups", "Sub-3:30 marathon", "Front lever hold"],
  },
  A: {
    subtitle: "Apex",
    description: "Near the peak of human performance. These achievements require years of focused training and often natural talent.",
    examples: ["Planche push-ups", "Sub-3:00 marathon", "Iron cross"],
  },
  S: {
    subtitle: "Supreme",
    description: "World-class performance. Only a handful of humans on Earth can achieve these feats. Elite among the elite.",
    examples: ["Olympic-level strength", "World record attempts", "Elite competition wins"],
  },
};

const domains = [
  { name: "Strength", icon: "💪", color: "var(--color-strength)", description: "Raw power, lifting capacity, and muscular force" },
  { name: "Skill", icon: "🎯", color: "var(--color-skill)", description: "Coordination, technique, and movement mastery" },
  { name: "Endurance", icon: "🏃", color: "var(--color-endurance)", description: "Cardiovascular capacity and sustained effort" },
  { name: "Speed", icon: "⚡", color: "var(--color-speed)", description: "Explosiveness, reaction time, and velocity" },
];

export default function HowItWorksPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 md:py-8">
      {/* Back button */}
      <Link 
        href="/" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">How Ascendant Works</h1>
        <p className="text-muted-foreground text-balance">
          A universal system to track and develop your athletic potential across every dimension of fitness.
        </p>
      </div>

      {/* The Four Domains */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Four Domains</h2>
        <p className="text-muted-foreground mb-4">
          Every challenge falls into one or more of these core athletic domains:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {domains.map((domain) => (
            <Card key={domain.name} className="border-l-4" style={{ borderLeftColor: domain.color }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{domain.icon}</span>
                  <span className="font-semibold" style={{ color: domain.color }}>{domain.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{domain.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The Ranking System */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Ranking System</h2>
        <p className="text-muted-foreground mb-4">
          Progress through 7 ranks, each with 10 sublevels (e.g., F-1 through F-10). 
          Your rank in each domain reflects your abilities in that area.
        </p>
        
        {/* Rank progression visual */}
        <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
          {RANKS.map((rank, i) => (
            <div key={rank} className="flex items-center">
              <span 
                className="text-lg font-bold px-2 py-1 rounded"
                style={{ 
                  color: getRankColor(rank),
                  backgroundColor: `${getRankColor(rank)}20`,
                }}
              >
                {rank}
              </span>
              {i < RANKS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Rank details */}
        <div className="space-y-3">
          {RANKS.map((rank) => {
            const info = rankDescriptions[rank];
            const color = getRankColor(rank as Rank);
            return (
              <Card key={rank} className="overflow-hidden">
                <div className="flex">
                  <div 
                    className="w-16 sm:w-20 flex flex-col items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span className="text-2xl sm:text-3xl font-bold" style={{ color }}>
                      {rank}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {info.subtitle}
                    </span>
                  </div>
                  <CardContent className="p-3 sm:p-4 flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      {info.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {info.examples.map((ex) => (
                        <Badge key={ex} variant="secondary" className="text-xs">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How XP Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Earning Progress</h2>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <p className="font-medium">Complete Challenges</p>
                <p className="text-sm text-muted-foreground">
                  Each challenge has tier targets. Hit higher tiers to earn more progress in that domain.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📈</span>
              <div>
                <p className="font-medium">Level Up</p>
                <p className="text-sm text-muted-foreground">
                  As you accumulate XP in a domain, you progress through sublevels (1→10) and eventually advance to the next rank.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">⭐</span>
              <div>
                <p className="font-medium">Prime Level</p>
                <p className="text-sm text-muted-foreground">
                  Your Prime Level is your lowest domain rank — it represents your weakest link. True complete athletes have balanced, high Prime Levels.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Philosophy */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Complete Athlete</h2>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Most fitness programs focus on one thing — running, lifting, or a specific sport. 
              Ascendant is different.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              We believe everyone has untapped potential across multiple domains. A runner might 
              discover they&apos;re naturally skilled at climbing. A lifter might find they have 
              incredible endurance they never tested.
            </p>
            <p className="text-sm font-medium">
              Ascendant helps you explore, track, and develop all aspects of your athleticism — 
              because your potential has no limits.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/challenges"
          className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg font-medium text-base h-11 px-6 hover:opacity-90 transition-opacity"
        >
          Explore Challenges
        </Link>
      </div>
    </div>
  );
}
