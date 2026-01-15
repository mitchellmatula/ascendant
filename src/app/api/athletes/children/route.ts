import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMinor } from "@/lib/divisions";
import { setActiveAthleteId } from "@/lib/active-athlete";

interface CreateChildBody {
  displayName: string;
  dateOfBirth: string;
  gender: string;
  disciplineIds?: string[];
  avatarUrl?: string | null;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body: CreateChildBody = await request.json();
    const { displayName, dateOfBirth, gender, disciplineIds, avatarUrl } = body;

    // Validate required fields
    if (!displayName || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: "Display name, date of birth, and gender are required" },
        { status: 400 }
      );
    }

    const dob = new Date(dateOfBirth);
    const isMinorAthlete = isMinor(dob);

    // Create the child athlete profile
    const athlete = await db.athlete.create({
      data: {
        parentId: user.id,
        displayName,
        dateOfBirth: dob,
        gender,
        isMinor: isMinorAthlete,
        avatarUrl: avatarUrl ?? undefined,
        ...(disciplineIds?.length && {
          disciplines: {
            create: disciplineIds.map((disciplineId: string) => ({
              disciplineId,
            })),
          },
        }),
      },
      include: {
        disciplines: {
          include: {
            discipline: true,
          },
        },
      },
    });

    // Set the new child as the active athlete
    await setActiveAthleteId(athlete.id);

    return NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        displayName: athlete.displayName,
        gender: athlete.gender,
        dateOfBirth: athlete.dateOfBirth,
        isMinor: athlete.isMinor,
        disciplines: athlete.disciplines.map((d) => d.discipline),
      },
    });
  } catch (error) {
    console.error("Error adding child:", error);
    return NextResponse.json(
      { error: "Failed to add child" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireUser();

    // Get all managed children
    const children = await db.athlete.findMany({
      where: { parentId: user.id },
      include: {
        disciplines: {
          include: {
            discipline: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      children.map((child) => ({
        id: child.id,
        displayName: child.displayName,
        gender: child.gender,
        dateOfBirth: child.dateOfBirth,
        avatarUrl: child.avatarUrl,
        isMinor: child.isMinor,
        disciplines: child.disciplines.map((d) => d.discipline),
      }))
    );
  } catch (error) {
    console.error("Error fetching children:", error);
    return NextResponse.json(
      { error: "Failed to fetch children" },
      { status: 500 }
    );
  }
}
