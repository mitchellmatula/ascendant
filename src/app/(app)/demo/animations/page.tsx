"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, AnimatedXP } from "@/components/ui/animated-number";
import { AnimatedProgress, AnimatedProgressWithLabel } from "@/components/ui/animated-progress";
import { LevelUpCelebration } from "@/components/ui/level-up-celebration";
import { AnimatedDomainCard } from "@/components/dashboard/animated-domain-card";
import { Slider } from "@/components/ui/slider";
import { getRankName, getRankColor, type Rank } from "@/lib/levels";

export default function AnimationDemoPage() {
  // Demo states
  const [xpValue, setXpValue] = useState(1250);
  const [progressValue, setProgressValue] = useState(35);
  const [levelLetter, setLevelLetter] = useState("D");
  const [levelSublevel, setLevelSublevel] = useState(3);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"level" | "rank">("level");

  const addXP = (amount: number) => {
    setXpValue((prev) => prev + amount);
  };

  const addProgress = (amount: number) => {
    setProgressValue((prev) => Math.min(100, Math.max(0, prev + amount)));
  };

  const levelUp = () => {
    if (levelSublevel < 9) {
      setLevelSublevel((prev) => prev + 1);
      setCelebrationType("level");
      setShowCelebration(true);
    } else {
      // Rank up
      const ranks = ["F", "E", "D", "C", "B", "A", "S"];
      const currentIndex = ranks.indexOf(levelLetter);
      if (currentIndex < ranks.length - 1) {
        setLevelLetter(ranks[currentIndex + 1]);
        setLevelSublevel(0);
        setCelebrationType("rank");
        setShowCelebration(true);
      }
    }
  };

  // Mock domain data for card demo
  const mockDomain = {
    id: "demo",
    name: "Strength",
    slug: "strength",
    icon: "💪",
    color: "#ef4444",
  };

  const mockLevel = {
    letter: levelLetter,
    sublevel: levelSublevel,
    currentXP: xpValue,
    bankedXP: 150,
    breakthroughReady: levelSublevel === 9,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Animation Demo</h1>
        <p className="text-muted-foreground">
          Test and preview level-up animations, progress bars, and number transitions
        </p>
      </div>

      {/* Animated Numbers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Animated Numbers</CardTitle>
          <CardDescription>
            Numbers slide and animate when values change (slot machine style)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current XP</p>
              <AnimatedNumber 
                value={xpValue} 
                className="text-4xl font-bold text-primary"
                duration={800}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addXP(50)} size="sm">+50 XP</Button>
              <Button onClick={() => addXP(100)} size="sm">+100 XP</Button>
              <Button onClick={() => addXP(500)} size="sm">+500 XP</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">With XP Label</p>
              <AnimatedXP value={xpValue} className="text-2xl font-bold" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setXpValue(0)} variant="outline" size="sm">Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animated Progress Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Animated Progress Bar</CardTitle>
          <CardDescription>
            Progress bar surges and glows when increasing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Progress: {progressValue}%</p>
            <AnimatedProgress 
              value={progressValue} 
              color="#8b5cf6"
              height="h-4"
              duration={800}
              showSurge={true}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => addProgress(10)} size="sm">+10%</Button>
            <Button onClick={() => addProgress(25)} size="sm">+25%</Button>
            <Button onClick={() => addProgress(-10)} variant="outline" size="sm">-10%</Button>
            <Button onClick={() => setProgressValue(0)} variant="outline" size="sm">Reset</Button>
            <Button onClick={() => setProgressValue(100)} variant="outline" size="sm">Fill</Button>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">With XP Labels</p>
            <AnimatedProgressWithLabel
              currentXP={xpValue}
              targetXP={2000}
              color="#10b981"
              height="h-3"
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Slider Control</p>
            <Slider
              value={[progressValue]}
              onValueChange={([value]) => setProgressValue(value)}
              max={100}
              step={1}
              className="mb-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Level Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Animated Level & Domain Card</CardTitle>
          <CardDescription>
            Level digits slide when changing, full card with all animations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Level</p>
              <div 
                className="text-5xl font-bold"
                style={{ color: getRankColor(levelLetter as Rank) }}
              >
                {levelLetter}{levelSublevel}
              </div>
              <p 
                className="text-lg font-medium mt-1"
                style={{ color: getRankColor(levelLetter as Rank) }}
              >
                {getRankName(levelLetter as Rank)}
              </p>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button onClick={levelUp}>Level Up!</Button>
              <Button 
                onClick={() => {
                  setLevelLetter("F");
                  setLevelSublevel(0);
                }} 
                variant="outline"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatedDomainCard
              domain={mockDomain}
              level={mockLevel}
              progress={progressValue}
              xpToNext={Math.round((100 - progressValue) * 4)}
              breakthroughProgress={levelSublevel === 9 ? {
                currentProgress: 3,
                challengeCount: 5,
                isComplete: false,
                toRank: "E",
              } : null}
            />
            
            <Card className="bg-muted/50 flex items-center justify-center">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Click &quot;Level Up!&quot; to see<br />the animation in action
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Level Up Celebration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Level Up Celebration</CardTitle>
          <CardDescription>
            Full-screen celebration with confetti and animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => {
                setCelebrationType("level");
                setShowCelebration(true);
              }}
            >
              Trigger Level Up
            </Button>
            <Button 
              onClick={() => {
                setCelebrationType("rank");
                setShowCelebration(true);
              }}
              variant="secondary"
            >
              Trigger Rank Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Celebration Overlay */}
      <LevelUpCelebration
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        previousLevel={
          celebrationType === "rank" 
            ? { letter: "D", sublevel: 9 }
            : { letter: levelLetter, sublevel: Math.max(0, levelSublevel - 1) }
        }
        newLevel={{ letter: levelLetter, sublevel: levelSublevel }}
        domainName="Strength"
        domainIcon="💪"
        xpGained={celebrationType === "rank" ? 500 : 100}
      />
    </div>
  );
}
