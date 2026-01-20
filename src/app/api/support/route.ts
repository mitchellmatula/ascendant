import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { z } from "zod";

const supportTicketSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().min(10, "Please provide more details").max(5000, "Message too long"),
  category: z.enum(["BUG", "ACCOUNT", "CHALLENGE", "SUBMISSION", "GYM", "FEATURE", "OTHER"]).default("OTHER"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = supportTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, name, subject, message, category } = validation.data;

    // Get user info if logged in (optional)
    let userId: string | null = null;
    let athleteId: string | null = null;
    
    try {
      const user = await getCurrentUser();
      if (user) {
        userId = user.id;
        const athlete = await getActiveAthlete(user);
        if (athlete) {
          athleteId = athlete.id;
        }
      }
    } catch {
      // Not logged in, that's fine
    }

    // Create support ticket
    const ticket = await db.supportTicket.create({
      data: {
        email,
        name: name || null,
        subject,
        message,
        category,
        userId,
        athleteId,
      },
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: "Your support request has been submitted. We'll get back to you as soon as possible!",
    });
  } catch (error) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json(
      { error: "Failed to submit support request. Please try again." },
      { status: 500 }
    );
  }
}
