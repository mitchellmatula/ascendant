import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createGymSchema } from "@/lib/validators/admin";

// GET /api/admin/gyms - List all gyms
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gyms = await db.gym.findMany({
      orderBy: { name: "asc" },
      include: {
        owner: {
          select: { id: true, email: true },
        },
        _count: {
          select: { 
            members: true,
            challenges: true,
            equipment: true,
            disciplines: true,
          },
        },
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    return NextResponse.json(gyms);
  } catch (error) {
    console.error("Error fetching gyms:", error);
    return NextResponse.json(
      { error: "Failed to fetch gyms" },
      { status: 500 }
    );
  }
}

// POST /api/admin/gyms - Create new gym
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createGymSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      const errorMessage = firstError 
        ? `${firstError[0]}: ${(firstError[1] as string[])[0]}`
        : "Validation failed";
      
      return NextResponse.json(
        { error: errorMessage, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { 
      name, description, logoUrl, bannerUrl, website, googlePlaceId,
      address, city, state, country, zipCode, phone, email,
      instagramUrl, facebookUrl, tiktokUrl, youtubeUrl,
      isActive, disciplineIds, equipmentIds 
    } = parsed.data;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existing = await db.gym.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A gym with this name already exists" },
        { status: 409 }
      );
    }

    const gym = await db.gym.create({
      data: {
        name,
        slug,
        description,
        logoUrl,
        bannerUrl,
        website,
        googlePlaceId,
        address,
        city,
        state,
        country,
        zipCode,
        phone,
        email,
        instagramUrl,
        facebookUrl,
        tiktokUrl,
        youtubeUrl,
        isActive,
        ownerId: user.id,
        // Create discipline links
        disciplines: disciplineIds && disciplineIds.length > 0
          ? {
              create: disciplineIds.map((disciplineId, index) => ({
                disciplineId,
                isPrimary: index === 0, // First one is primary
              })),
            }
          : undefined,
        // Create equipment links
        equipment: equipmentIds && equipmentIds.length > 0
          ? {
              create: equipmentIds.map((equipmentId) => ({
                equipmentId,
              })),
            }
          : undefined,
        // Add creator as owner member
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        equipment: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    revalidatePath("/admin/gyms");
    return NextResponse.json(gym, { status: 201 });
  } catch (error) {
    console.error("Error creating gym:", error);
    return NextResponse.json(
      { error: "Failed to create gym" },
      { status: 500 }
    );
  }
}
