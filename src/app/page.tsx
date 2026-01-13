import Link from "next/link";

export default function Home() {
  return (
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

        <div id="domains" className="pt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: "Strength", color: "bg-[oklch(0.65_0.2_25)]", icon: "💪" },
            { name: "Skill", color: "bg-[oklch(0.65_0.2_145)]", icon: "🎯" },
            { name: "Endurance", color: "bg-[oklch(0.65_0.2_250)]", icon: "🏃" },
            { name: "Speed", color: "bg-[oklch(0.65_0.2_85)]", icon: "⚡" },
          ].map((domain) => (
            <div
              key={domain.name}
              className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border hover:border-primary/50 transition-colors"
            >
              <div className={`w-12 h-12 ${domain.color} rounded-full flex items-center justify-center text-2xl`}>
                {domain.icon}
              </div>
              <span className="font-medium">{domain.name}</span>
            </div>
          ))}
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>F → E → D → C → B → A → S</p>
          <p className="mt-1">Progress through 7 ranks, each with 10 sublevels</p>
        </div>
      </div>
    </div>
  );
}
