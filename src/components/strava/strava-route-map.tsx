"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

interface StravaRouteMapProps {
  polyline: string;
  startLatLng?: [number, number] | null;
  endLatLng?: [number, number] | null;
  className?: string;
  height?: number;
  interactive?: boolean;
}

export function StravaRouteMap({
  polyline: encodedPolyline,
  startLatLng,
  endLatLng,
  className = "",
  height = 150,
  interactive = false,
}: StravaRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !encodedPolyline) return;

    // Decode the polyline
    const coordinates = polyline.decode(encodedPolyline);
    
    if (coordinates.length === 0) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Create map
    const map = L.map(mapRef.current, {
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Add tile layer (using CartoDB's Voyager - colorful, modern style)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Convert coordinates to LatLng format for Leaflet
    const latLngs = coordinates.map(([lat, lng]) => L.latLng(lat, lng));

    // Create gradient polyline effect with multiple layers
    // Background (wider, semi-transparent)
    L.polyline(latLngs, {
      color: "#FC4C02",
      weight: 5,
      opacity: 0.3,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Main route line (Strava orange)
    L.polyline(latLngs, {
      color: "#FC4C02",
      weight: 3,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Add start marker (green circle)
    if (startLatLng || coordinates.length > 0) {
      const start = startLatLng || coordinates[0];
      L.circleMarker(L.latLng(start[0], start[1]), {
        radius: 6,
        fillColor: "#00C853",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    }

    // Add end marker (red circle)
    if (endLatLng || coordinates.length > 0) {
      const end = endLatLng || coordinates[coordinates.length - 1];
      L.circleMarker(L.latLng(end[0], end[1]), {
        radius: 6,
        fillColor: "#FF1744",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    }

    // Fit bounds to show entire route with padding
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 15,
    });

    setIsLoaded(true);

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [encodedPolyline, startLatLng, endLatLng, interactive]);

  if (!encodedPolyline) {
    return null;
  }

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    />
  );
}
