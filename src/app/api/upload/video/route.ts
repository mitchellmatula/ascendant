import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Route segment config - allow large file uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for large uploads

// Video upload limits
const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB max
const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
  "video/x-m4v",
];

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const athleteId = formData.get("athleteId") as string | null;
    const saveToLibrary = formData.get("saveToLibrary") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get context from form data (for organizing uploads)
    const context = formData.get("context") as string || "submission";
    const uploadAthleteId = athleteId || user.athlete?.id || user.id;

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "mp4";
    const filename = `videos/${context}/${uploadAthleteId}/${timestamp}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true, // Prevents filename conflicts
    });

    // If saveToLibrary is true and we have an athleteId, save to Video library
    let videoRecord = null;
    if (saveToLibrary && athleteId) {
      // Require title for library videos
      if (!title) {
        return NextResponse.json(
          { error: "Title is required when saving to library" },
          { status: 400 }
        );
      }

      videoRecord = await db.video.create({
        data: {
          athleteId,
          title,
          url: blob.url,
          fileSize: file.size,
          mimeType: file.type,
        },
      });
    }

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      type: file.type,
      videoId: videoRecord?.id || null,
      videoTitle: videoRecord?.title || null,
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
