import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isMinor } from "@/lib/divisions";

interface ChildData {
  displayName: string;
  dateOfBirth: string;
  gender: string;
  disciplineIds?: string[];
  avatarUrl?: string | null;
}

interface ParentAthleteData {
  displayName: string;
  dateOfBirth: string;
  gender: string;
  disciplineIds?: string[];
  avatarUrl?: string | null;
}

/**
 * Generate a unique username from a base string
 */
async function generateUniqueUsername(base: string): Promise<string> {
  // Clean the base: lowercase, alphanumeric and underscores only
  let username = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  
  // Ensure minimum length
  if (username.length < 3) {
    username = `user_${username}`;
  }

  // Check if username exists, add numbers if needed
  let candidate = username;
  let suffix = 1;
  while (await db.athlete.findUnique({ where: { username: candidate } })) {
    candidate = `${username}${suffix}`;
    suffix++;
  }
  
  return candidate;
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountType, displayName, dateOfBirth, gender, avatarUrl, disciplineIds, children, parentAthlete } = body;

    // Get Clerk user info for username
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    const clerkUsername = clerkUser.username || clerkUser.firstName || displayName;

    // Find or create the user
    let user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          clerkId,
          email: "", // Will be updated by webhook
          accountType: accountType === "parent" ? "PARENT" : "ATHLETE",
          role: accountType === "parent" ? "PARENT" : "ATHLETE",
        },
      });
    } else {
      // Update account type
      user = await db.user.update({
        where: { clerkId },
        data: {
          accountType: accountType === "parent" ? "PARENT" : "ATHLETE",
          role: accountType === "parent" ? "PARENT" : "ATHLETE",
        },
      });
    }

    // Handle parent account with multiple children
    if (accountType === "parent" && Array.isArray(children)) {
      // Create child athlete profiles
      for (const child of children as ChildData[]) {
        const dob = new Date(child.dateOfBirth);
        const isMinorAthlete = isMinor(dob);
        const childUsername = await generateUniqueUsername(child.displayName);

        await db.athlete.create({
          data: {
            parentId: user.id,
            displayName: child.displayName,
            username: childUsername,
            dateOfBirth: dob,
            gender: child.gender,
            isMinor: isMinorAthlete,
            avatarUrl: child.avatarUrl,
            ...(child.disciplineIds?.length && {
              disciplines: {
                create: child.disciplineIds.map((disciplineId: string) => ({
                  disciplineId,
                })),
              },
            }),
          },
        });
      }

      // If parent also wants to compete, create their own athlete profile
      if (parentAthlete) {
        const pa = parentAthlete as ParentAthleteData;
        const dob = new Date(pa.dateOfBirth);
        const isMinorAthlete = isMinor(dob);
        const parentUsername = await generateUniqueUsername(clerkUsername);

        // Sync avatar to Clerk if provided
        if (pa.avatarUrl) {
          try {
            const imageResponse = await fetch(pa.avatarUrl);
            const imageBlob = await imageResponse.blob();
            const file = new File([imageBlob], "avatar.jpg", { type: imageBlob.type });
            await clerk.users.updateUserProfileImage(clerkId, { file });
          } catch (error) {
            console.error("Failed to sync avatar to Clerk:", error);
          }
        }

        await db.athlete.create({
          data: {
            userId: user.id, // Links to user's own profile
            displayName: pa.displayName,
            username: parentUsername,
            dateOfBirth: dob,
            gender: pa.gender,
            isMinor: isMinorAthlete,
            avatarUrl: pa.avatarUrl,
            ...(pa.disciplineIds?.length && {
              disciplines: {
                create: pa.disciplineIds.map((disciplineId: string) => ({
                  disciplineId,
                })),
              },
            }),
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // Handle single athlete profile
    const dob = new Date(dateOfBirth);
    const isMinorAthlete = isMinor(dob);
    const username = await generateUniqueUsername(clerkUsername);

    // If avatar was uploaded, sync it to Clerk (for adult athletes only)
    if (avatarUrl && accountType !== "parent") {
      try {
        // Fetch the image from Vercel Blob
        const imageResponse = await fetch(avatarUrl);
        const imageBlob = await imageResponse.blob();
        const file = new File([imageBlob], "avatar.jpg", { type: imageBlob.type });
        
        // Update Clerk profile image
        await clerk.users.updateUserProfileImage(clerkId, { file });
      } catch (error) {
        console.error("Failed to sync avatar to Clerk:", error);
        // Continue anyway - avatar is still saved in our DB
      }
    }

    // Create athlete profile for the user themselves
    await db.athlete.create({
      data: {
        userId: user.id,
        displayName,
        username,
        dateOfBirth: dob,
        gender,
        isMinor: isMinorAthlete,
        avatarUrl,
        ...(disciplineIds?.length && {
          disciplines: {
            create: disciplineIds.map((disciplineId: string) => ({
              disciplineId,
            })),
          },
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
