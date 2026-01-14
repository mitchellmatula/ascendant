import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import OpenAI from "openai";

// Force dynamic - don't cache AI responses
export const dynamic = "force-dynamic";

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// POST /api/admin/ai/suggest-xp-distribution - Suggest XP distribution across domains
export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 }
      );
    }

    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    const { name, description, domains } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Challenge name is required" },
        { status: 400 }
      );
    }

    if (!domains || domains.length === 0) {
      return NextResponse.json(
        { error: "At least one domain is required" },
        { status: 400 }
      );
    }

    // Build domain list for the prompt
    const domainList = domains.map((d: { id: string; name: string }) => d.name).join(", ");

    const prompt = `You are an expert in athletic training and fitness programming. Analyze this exercise/challenge and recommend how XP (experience points) should be distributed across fitness domains.

Challenge: "${name.trim()}"
${description ? `Description: "${description.trim()}"` : ""}

Available domains: ${domainList}

Rules:
- Most challenges should use ONLY 1 domain at 100%
- Only add a secondary domain if it genuinely represents 20%+ of what the challenge develops
- Only add a tertiary domain if it genuinely represents 10%+ of what the challenge develops
- Primary domain gets 50-100% of XP
- Secondary domain (if truly needed) gets 10-50% of XP
- Tertiary domain (rarely needed) gets 10-30% of XP
- All percentages must sum to exactly 100%
- Be CONSERVATIVE - when in doubt, use fewer domains
- Don't add domains just to fill slots

Domain definitions (use these to decide):
- Strength: Raw power, muscle strength, lifting, pulling, pushing, holding body weight
- Endurance: Cardiovascular fitness, sustained effort over time, running, swimming, cycling
- Speed: Explosive power, quickness, reaction time, sprint speed, fast movements
- Skill: Technical proficiency, coordination, balance, timing, learned movement patterns

Respond in JSON format:
{
  "primaryDomain": "domain name",
  "primaryXPPercent": number (50-100),
  "secondaryDomain": "domain name or null",
  "secondaryXPPercent": number or null,
  "tertiaryDomain": "domain name or null", 
  "tertiaryXPPercent": number or null,
  "reasoning": "Brief 1-sentence explanation"
}

Examples of CORRECT distributions:
- "Pull-ups" → Strength 100% (pure strength, no other component)
- "5K Run" → Endurance 100% (pure cardiovascular, no skill needed)
- "Marathon" → Endurance 100% (just running for a long time)
- "100m Sprint" → Speed 100% (pure explosive speed)
- "Muscle-up" → Strength 70%, Skill 30% (mostly strength, but timing/technique matters)
- "Salmon Ladder" → Strength 60%, Skill 40% (strength plus significant technique)
- "Backflip" → Skill 100% (pure technique and body control)
- "Handstand Hold" → Strength 60%, Skill 40% (strength to hold, skill to balance)

Examples of WRONG distributions (too many domains):
- "Marathon" → Endurance 80%, Skill 20% ❌ (running doesn't need "skill")
- "Pull-ups" → Strength 80%, Endurance 20% ❌ (a set of pull-ups isn't endurance)`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fitness expert helping optimize XP distribution for an athletic progression system. Always respond with valid JSON only. Be VERY conservative - most exercises only train one domain. Only add secondary/tertiary domains if they genuinely represent a significant portion of what the exercise develops.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Even lower temperature for more consistent, conservative recommendations
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let result;
    try {
      // Handle potential markdown code blocks
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Map domain names back to IDs
    const findDomainId = (domainName: string | null) => {
      if (!domainName) return null;
      const domain = domains.find(
        (d: { id: string; name: string }) => 
          d.name.toLowerCase() === domainName.toLowerCase()
      );
      return domain?.id || null;
    };

    // Validate percentages sum to 100
    const primary = result.primaryXPPercent || 100;
    const secondary = result.secondaryXPPercent || 0;
    const tertiary = result.tertiaryXPPercent || 0;
    const total = primary + secondary + tertiary;

    // Adjust if not exactly 100 (AI sometimes makes small errors)
    let adjustedPrimary = primary;
    if (total !== 100) {
      adjustedPrimary = primary + (100 - total);
    }

    return NextResponse.json({
      primaryDomainId: findDomainId(result.primaryDomain),
      primaryXPPercent: Math.max(50, Math.min(100, adjustedPrimary)),
      secondaryDomainId: result.secondaryDomain ? findDomainId(result.secondaryDomain) : null,
      secondaryXPPercent: result.secondaryDomain ? Math.max(5, Math.min(50, secondary)) : null,
      tertiaryDomainId: result.tertiaryDomain ? findDomainId(result.tertiaryDomain) : null,
      tertiaryXPPercent: result.tertiaryDomain ? Math.max(5, Math.min(30, tertiary)) : null,
      reasoning: result.reasoning || "",
    }, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error suggesting XP distribution:", error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
