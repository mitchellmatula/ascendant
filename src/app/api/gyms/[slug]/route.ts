import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE - Delete gym and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  
  const gym = await db.gym.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, name: true },
  });

  if (!gym) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  // Only owner can delete
  if (gym.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete in transaction to ensure consistency
  await db.$transaction(async (tx) => {
    // Delete all classes associated with this gym (cascades to class members, coaches, etc.)
    await tx.class.deleteMany({
      where: { gymId: gym.id },
    });

    // Delete gym-exclusive challenges
    await tx.challenge.deleteMany({
      where: { gymId: gym.id },
    });

    // Delete gym members (cascade should handle this but explicit for clarity)
    await tx.gymMember.deleteMany({
      where: { gymId: gym.id },
    });

    // Delete gym equipment associations
    await tx.gymEquipment.deleteMany({
      where: { gymId: gym.id },
    });

    // Delete gym discipline associations
    await tx.gymDiscipline.deleteMany({
      where: { gymId: gym.id },
    });

    // Finally delete the gym itself
    await tx.gym.delete({
      where: { id: gym.id },
    });
  });

  return NextResponse.json({ success: true, message: `Gym "${gym.name}" deleted` });
}
