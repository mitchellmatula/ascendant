import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    // Use Google Places Text Search API (New)
    // https://developers.google.com/maps/documentation/places/web-service/text-search
    const searchUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json"
    );
    searchUrl.searchParams.set("query", `${query} gym fitness training`);
    searchUrl.searchParams.set("type", "gym");
    searchUrl.searchParams.set("key", apiKey);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      console.error("Google Places API error:", response.status);
      return NextResponse.json(
        { error: "Failed to search places" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API status:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || "Places API error" },
        { status: 500 }
      );
    }

    // Map results to our format
    const results: PlaceResult[] = (data.results || []).slice(0, 10).map(
      (place: {
        place_id: string;
        name: string;
        formatted_address: string;
        address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 }
    );
  }
}
