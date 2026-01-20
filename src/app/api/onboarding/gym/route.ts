import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description,
      logoUrl,
      address,
      city, 
      state, 
      country,
      zipCode,
      googlePlaceId,
      website, 
      phone,
      email,
      instagramUrl,
      facebookUrl,
      tiktokUrl,
      youtubeUrl,
      disciplineIds 
    } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Gym name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Find or create the user
    let user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          clerkId,
          email: "", // Will be updated by webhook
          accountType: "ATHLETE",
          role: "GYM_ADMIN",
        },
      });
    } else {
      // Update role to GYM_ADMIN
      user = await db.user.update({
        where: { clerkId },
        data: {
          role: "GYM_ADMIN",
        },
      });
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists and make unique if needed
    let slug = baseSlug;
    let counter = 1;
    while (await db.gym.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the gym
    const gym = await db.gym.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        zipCode: zipCode?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        website: website?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        facebookUrl: facebookUrl?.trim() || null,
        tiktokUrl: tiktokUrl?.trim() || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        ownerId: user.id,
        // Add creator as owner member
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        // Link disciplines if provided
        disciplines: disciplineIds?.length > 0
          ? {
              create: disciplineIds.map((disciplineId: string, index: number) => ({
                disciplineId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({ success: true, gymId: gym.id, gymSlug: gym.slug });
  } catch (error) {
    console.error("Gym onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create gym" },
      { status: 500 }
    );
  }
}
