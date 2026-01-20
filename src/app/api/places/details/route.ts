import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  website?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get("placeId");

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    // Use Google Places Details API
    const detailsUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    detailsUrl.searchParams.set("place_id", placeId);
    detailsUrl.searchParams.set(
      "fields",
      "place_id,name,formatted_address,address_components,formatted_phone_number,website"
    );
    detailsUrl.searchParams.set("key", apiKey);

    const response = await fetch(detailsUrl.toString());

    if (!response.ok) {
      console.error("Google Places API error:", response.status);
      return NextResponse.json(
        { error: "Failed to get place details" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error(
        "Google Places API status:",
        data.status,
        data.error_message
      );
      return NextResponse.json(
        { error: data.error_message || "Places API error" },
        { status: 500 }
      );
    }

    const place = data.result;
    const components: AddressComponent[] = place.address_components || [];

    // Extract address components
    const getComponent = (types: string[]): string | undefined => {
      const component = components.find((c) =>
        types.some((t) => c.types.includes(t))
      );
      return component?.long_name;
    };

    const getShortComponent = (types: string[]): string | undefined => {
      const component = components.find((c) =>
        types.some((t) => c.types.includes(t))
      );
      return component?.short_name;
    };

    // Build street address from components
    const streetNumber = getComponent(["street_number"]) || "";
    const route = getComponent(["route"]) || "";
    const streetAddress = [streetNumber, route].filter(Boolean).join(" ");

    const details: PlaceDetails = {
      placeId: place.place_id,
      name: place.name,
      address: streetAddress || place.formatted_address,
      city:
        getComponent(["locality"]) ||
        getComponent(["sublocality"]) ||
        getComponent(["administrative_area_level_2"]),
      state: getShortComponent(["administrative_area_level_1"]),
      country: getComponent(["country"]),
      zipCode: getComponent(["postal_code"]),
      phone: place.formatted_phone_number,
      website: place.website,
    };

    return NextResponse.json({ details });
  } catch (error) {
    console.error("Place details error:", error);
    return NextResponse.json(
      { error: "Failed to get place details" },
      { status: 500 }
    );
  }
}
