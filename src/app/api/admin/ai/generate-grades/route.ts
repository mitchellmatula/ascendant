import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import OpenAI from "openai";

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

interface Division {
  id: string;
  name: string;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
}

interface GradeResult {
  divisionId: string;
  rank: string;
  targetValue: number;
}

// POST /api/admin/ai/generate-grades - Generate grade targets using AI with web search
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

    const { 
      name, 
      description,
      gradingType, 
      gradingUnit, 
      minRank,
      maxRank,
      divisions,
      primaryDomain
    } = body as {
      name: string;
      description?: string;
      gradingType: string;
      gradingUnit: string;
      minRank: string;
      maxRank: string;
      divisions: Division[];
      primaryDomain?: string;
    };

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Challenge name is required" },
        { status: 400 }
      );
    }

    if (!gradingType || gradingType === "PASS_FAIL") {
      return NextResponse.json(
        { error: "Grading type must be a measured type (REPS, TIME, DISTANCE, TIMED_REPS)" },
        { status: 400 }
      );
    }

    if (!divisions || divisions.length === 0) {
      return NextResponse.json(
        { error: "At least one division is required" },
        { status: 400 }
      );
    }

    // Build the prompt for AI
    const gradingExplanation = getGradingExplanation(gradingType);
    const rankRange = getRankRange(minRank, maxRank);
    
    // Format divisions for the prompt
    const divisionsList = divisions.map(d => {
      let desc = d.name;
      if (d.gender) desc += ` (${d.gender})`;
      if (d.ageMin !== null && d.ageMax !== null) {
        desc += ` ages ${d.ageMin}-${d.ageMax}`;
      } else if (d.ageMin !== null) {
        desc += ` ages ${d.ageMin}+`;
      } else if (d.ageMax !== null) {
        desc += ` ages up to ${d.ageMax}`;
      }
      return { id: d.id, description: desc };
    });

    // Build time-specific instructions
    const timeInstructions = gradingType === "TIME" ? `
CRITICAL FOR TIME CHALLENGES:
- Return times in "mm:ss" format (e.g., "12:30" for 12 minutes 30 seconds)
- For longer events, use "h:mm:ss" format (e.g., "1:15:30" for 1 hour 15 min 30 sec)
- LOWER times = BETTER performance (faster is better)
- Be REALISTIC! Research actual benchmarks:

EXAMPLE 3K/5K REALISTIC BENCHMARKS (for reference):
- 3K world record: ~7:20 (men), ~8:06 (women)
- 3K good recreational adult: 12-15 minutes
- 3K untrained adult: 18-25+ minutes
- 5K world record: ~12:35 (men), ~14:00 (women)
- 5K good recreational: 22-28 minutes
- 5K untrained: 35-45+ minutes

CHILDREN RUN SLOWER - be realistic:
- 5-7 year olds: much slower, may struggle to complete 3K
- 8-10 year olds: roughly 40-60% slower than adults
- 11-13 year olds: roughly 20-40% slower than adults
- 14-17 year olds: approaching adult times
- Masters (40+): slightly slower than peak adults, declining with age
` : "";

    const prompt = `You are a fitness and sports performance expert. Generate REALISTIC performance targets for an athletic challenge.

CHALLENGE: "${name.trim()}"
${description ? `DESCRIPTION: ${description}` : ""}
PRIMARY DOMAIN: ${primaryDomain || "General Fitness"}
GRADING TYPE: ${gradingType} (${gradingExplanation})
RANK RANGE: ${rankRange.join(", ")}

RANK DEFINITIONS (percentiles of the GENERAL POPULATION for that age/gender):
- F (Foundation): Bottom 20% - completely untrained, sedentary, just starting
- E (Emerging): 20-40% percentile - beginner, inconsistent training, few months
- D (Developing): 40-60% percentile - regular training, 1-2 years experience
- C (Competent): 60-75% percentile - dedicated recreational athlete
- B (Breakthrough): 75-90% percentile - competitive amateur athlete
- A (Advanced): 90-98% percentile - elite regional/national level
- S (Supreme): Top 2% - professional/Olympic caliber, near world records
${timeInstructions}
DIVISIONS TO GENERATE TARGETS FOR:
${divisionsList.map(d => `- ${d.id}: ${d.description}`).join("\n")}

CRITICAL INSTRUCTIONS:
1. Use your knowledge of real athletic performance data
2. Values MUST differ significantly between age groups and genders
3. Children should have much easier targets than adults
4. Masters divisions should have slightly easier targets than peak adults
5. There should be meaningful gaps between each rank level
6. S-rank should be near world-class for that age/gender, NOT impossible
7. F-rank should be achievable by an untrained person of that age/gender

Respond with ONLY valid JSON in this exact format:
{
  "grades": [
    { "divisionId": "division-id-here", "rank": "F", "targetValue": "mm:ss" },
    { "divisionId": "division-id-here", "rank": "E", "targetValue": "mm:ss" },
    ...
  ],
  "sources": ["Brief note about reasoning"],
  "notes": "Any important notes"
}

Generate targets for ALL ${divisionsList.length} divisions and ALL ${rankRange.length} ranks (${rankRange.join(", ")}).`;

    console.log("=== AI GRADE GENERATION PROMPT ===");
    console.log(prompt);
    console.log("=== END PROMPT ===");
    console.log("Generating grades with AI for:", name);
    
    // Use standard chat completions API (more reliable)
    let response;
    try {
      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are a fitness and sports performance expert with deep knowledge of athletic benchmarks across all age groups and genders. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });
      
      response = completion.choices[0]?.message?.content;
    } catch (apiError) {
      console.error("OpenAI API call failed:", apiError);
      if (apiError instanceof Error) {
        throw new Error(`AI service error: ${apiError.message}`);
      }
      throw new Error("AI service temporarily unavailable");
    }

    if (!response) {
      console.error("No content in response");
      throw new Error("No response from AI");
    }
    
    console.log("=== AI RESPONSE ===");
    console.log(response);
    console.log("=== END RESPONSE ===");

    // Parse the JSON response
    let result;
    try {
      // Handle potential markdown code blocks
      const jsonStr = response.replace(/```json\n?|\n?```/g, "").trim();
      // Find the JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", response);
      console.error("Parse error:", parseError);
      throw new Error("Failed to parse AI response - the response may have been truncated");
    }

    // Validate and clean the grades
    const grades: GradeResult[] = [];
    if (Array.isArray(result.grades)) {
      for (const grade of result.grades) {
        if (grade.divisionId && grade.rank && grade.targetValue !== undefined) {
          // Verify the divisionId exists
          if (divisions.some(d => d.id === grade.divisionId)) {
            // Convert time string to seconds if needed
            let targetValue: number;
            
            if (typeof grade.targetValue === "string") {
              // Parse time string (mm:ss or h:mm:ss)
              targetValue = parseTimeToSeconds(grade.targetValue);
            } else if (typeof grade.targetValue === "number") {
              targetValue = grade.targetValue;
            } else {
              continue; // Skip invalid values
            }
            
            if (targetValue > 0) {
              grades.push({
                divisionId: grade.divisionId,
                rank: grade.rank,
                targetValue: Math.round(targetValue), // Round to whole seconds for time
              });
            }
          }
        }
      }
    }

    console.log(`Parsed ${grades.length} valid grades`);

    return NextResponse.json({
      grades,
      sources: result.sources || [],
      notes: result.notes || "",
    });
  } catch (error) {
    console.error("Error generating grades:", error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate grades" },
      { status: 500 }
    );
  }
}

function getGradingExplanation(gradingType: string): string {
  switch (gradingType) {
    case "REPS":
      return "Count of repetitions completed - higher is better";
    case "TIME":
      return "Duration - lower/faster is better";
    case "DISTANCE":
      return "Distance achieved - higher is better";
    case "TIMED_REPS":
      return "Reps completed within a time limit - higher is better";
    default:
      return "Measured value";
  }
}

// Parse time string (mm:ss or h:mm:ss) to total seconds
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0;
  
  const cleaned = timeStr.trim();
  
  // If it's already a number string, parse as seconds
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  
  // If it's a decimal number
  if (/^\d+\.\d+$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  
  // Parse mm:ss or h:mm:ss format
  const parts = cleaned.split(":").map(p => parseInt(p, 10) || 0);
  
  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // h:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

function getRankRange(minRank: string, maxRank: string): string[] {
  const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
  const minIdx = RANKS.indexOf(minRank) >= 0 ? RANKS.indexOf(minRank) : 0;
  const maxIdx = RANKS.indexOf(maxRank) >= 0 ? RANKS.indexOf(maxRank) : RANKS.length - 1;
  return RANKS.slice(minIdx, maxIdx + 1);
}
