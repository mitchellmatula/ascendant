import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/disciplines - List all active disciplines (public)
export async function GET() {
  try {
    const disciplines = await db.discipline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    return NextResponse.json(disciplines);
  } catch (error) {
    console.error("Error fetching disciplines:", error);
    return NextResponse.json(
      { error: "Failed to fetch disciplines" },
      { status: 500 }
    );
  }
}
