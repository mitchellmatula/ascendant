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

// POST /api/admin/ai/generate-challenge - Generate challenge description and instructions
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
    
    const { name, gradingType, gradingUnit } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Challenge name is required" },
        { status: 400 }
      );
    }

    // Build context about the grading
    let gradingContext = "";
    if (gradingType && gradingType !== "PASS_FAIL") {
      gradingContext = `This challenge is measured by ${gradingType.toLowerCase().replace("_", " ")}`;
      if (gradingUnit) {
        gradingContext += ` (${gradingUnit})`;
      }
      gradingContext += ".";
    }

    const prompt = `You are helping create content for a fitness/ninja warrior athlete progression system. Generate a short description and instructions for the following exercise/challenge.

Challenge name: "${name.trim()}"
${gradingContext}

Requirements:
- Description: 1-2 sentences explaining what this challenge is and what it tests (strength, skill, endurance, etc.)
- Instructions: 1-2 sentences on how to properly perform and complete this challenge

Respond in JSON format:
{
  "description": "...",
  "instructions": "..."
}

Keep both concise and practical. Focus on clear, actionable information.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fitness expert helping create challenge descriptions for a ninja warrior / athletic progression app. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
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

    return NextResponse.json({
      description: result.description || "",
      instructions: result.instructions || "",
    });
  } catch (error) {
    console.error("Error generating challenge content:", error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
