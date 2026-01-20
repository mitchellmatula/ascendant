import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Role } from "../../../../../../prisma/generated/prisma/client";

// DELETE /api/admin/classes/[id] - Delete a class (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if class exists
    const cls = await db.class.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!cls) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Delete in order due to foreign key constraints:
    // 1. ClassGrades (references ClassBenchmark and ClassMember)
    // 2. ClassBenchmarks
    // 3. ClassMembers
    // 4. ClassJoinRequests
    // 5. ClassCoaches
    // 6. Class

    await db.$transaction(async (tx) => {
      // Delete all grades for this class's benchmarks
      await tx.classGrade.deleteMany({
        where: { benchmark: { classId: id } },
      });

      // Delete all benchmarks
      await tx.classBenchmark.deleteMany({
        where: { classId: id },
      });

      // Delete all members
      await tx.classMember.deleteMany({
        where: { classId: id },
      });

      // Delete all join requests
      await tx.classJoinRequest.deleteMany({
        where: { classId: id },
      });

      // Delete all coaches
      await tx.classCoach.deleteMany({
        where: { classId: id },
      });

      // Finally delete the class
      await tx.class.delete({
        where: { id },
      });
    });

    return NextResponse.json({ 
      success: true,
      message: `Class "${cls.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Admin class DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}
