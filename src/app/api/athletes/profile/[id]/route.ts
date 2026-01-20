import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUser, getAllAthletes } from "@/lib/auth";
import { db } from "@/lib/db";
import { findMatchingDivision } from "@/lib/divisions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: athleteId } = await params;

    // Verify user has access to this athlete
    const allAthletes = getAllAthletes(user);
    const hasAccess = allAthletes.some((a) => a.id === athleteId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to edit this athlete" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { displayName, username, dateOfBirth, gender, avatarUrl, disciplineIds, isPublicProfile } = body;

    // Validate username if provided
    if (username !== undefined) {
      // Check format
      if (!username || username.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        );
      }
      if (username.length > 30) {
        return NextResponse.json(
          { error: "Username must be 30 characters or less" },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, and underscores" },
          { status: 400 }
        );
      }
      
      // Check uniqueness (case insensitive)
      const existingAthlete = await db.athlete.findFirst({
        where: {
          username: { equals: username.toLowerCase(), mode: "insensitive" },
          id: { not: athleteId },
        },
      });
      if (existingAthlete) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 400 }
        );
      }
    }

    // Calculate age for division
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const isMinor = age < 18;

    // Update athlete
    const updatedAthlete = await db.athlete.update({
      where: { id: athleteId },
      data: {
        displayName,
        ...(username !== undefined && { username: username.toLowerCase() }),
        dateOfBirth: dob,
        gender,
        avatarUrl,
        isMinor,
        ...(isPublicProfile !== undefined && { isPublicProfile }),
      },
    });

    // If updating own profile (not a child), sync avatar to Clerk
    const isOwnProfile = user.athlete?.id === athleteId;
    if (isOwnProfile && avatarUrl && user.clerkId) {
      try {
        // Fetch the image from Vercel Blob
        const imageResponse = await fetch(avatarUrl);
        const imageBlob = await imageResponse.blob();
        const file = new File([imageBlob], "avatar.jpg", { type: imageBlob.type });
        
        // Update Clerk profile image
        const clerk = await clerkClient();
        await clerk.users.updateUserProfileImage(user.clerkId, { file });
      } catch (error) {
        console.error("Failed to sync avatar to Clerk:", error);
        // Continue anyway - avatar is still saved in our DB
      }
    }

    // Update disciplines (delete and recreate)
    if (disciplineIds && Array.isArray(disciplineIds)) {
      await db.athleteDiscipline.deleteMany({
        where: { athleteId },
      });

      if (disciplineIds.length > 0) {
        await db.athleteDiscipline.createMany({
          data: disciplineIds.map((disciplineId: string) => ({
            athleteId,
            disciplineId,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      athlete: updatedAthlete,
    });
  } catch (error) {
    console.error("Error updating athlete:", error);
    return NextResponse.json(
      { error: "Failed to update athlete" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: athleteId } = await params;

    // Verify user has access to this athlete
    const allAthletes = getAllAthletes(user);
    const hasAccess = allAthletes.some((a) => a.id === athleteId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to view this athlete" },
        { status: 403 }
      );
    }

    const athlete = await db.athlete.findUnique({
      where: { id: athleteId },
      include: {
        disciplines: {
          include: {
            discipline: true,
          },
        },
        domainLevels: {
          include: {
            domain: true,
          },
        },
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Get their division
    const division = await findMatchingDivision(athlete.dateOfBirth, athlete.gender);

    return NextResponse.json({
      ...athlete,
      division,
    });
  } catch (error) {
    console.error("Error fetching athlete:", error);
    return NextResponse.json(
      { error: "Failed to fetch athlete" },
      { status: 500 }
    );
  }
}
