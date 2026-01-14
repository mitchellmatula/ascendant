import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { z } from "zod";

const suspendSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

// POST /api/admin/users/[id]/suspend - Suspend a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prevent self-suspension
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot suspend your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.suspendedAt) {
      return NextResponse.json(
        { error: "User is already suspended" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = suspendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Suspend the user
    await db.user.update({
      where: { id },
      data: {
        suspendedAt: new Date(),
        suspendedBy: currentUser.id,
        suspendReason: parsed.data.reason,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);

    return NextResponse.json({ success: true, message: "User suspended" });
  } catch (error) {
    console.error("Error suspending user:", error);
    return NextResponse.json(
      { error: "Failed to suspend user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/suspend - Unsuspend a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSystemAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!existingUser.suspendedAt) {
      return NextResponse.json(
        { error: "User is not suspended" },
        { status: 400 }
      );
    }

    // Unsuspend the user
    await db.user.update({
      where: { id },
      data: {
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);

    return NextResponse.json({ success: true, message: "User unsuspended" });
  } catch (error) {
    console.error("Error unsuspending user:", error);
    return NextResponse.json(
      { error: "Failed to unsuspend user" },
      { status: 500 }
    );
  }
}
