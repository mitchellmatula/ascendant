"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { MapPin, Search, Loader2, X, ExternalLink, Image } from "lucide-react";

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
}

export default function GymOnboardingPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  
  // Google Places search state
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    googlePlaceId: "",
    website: "",
    phone: "",
    email: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    disciplineIds: [] as string[],
  });
  
  const [alsoAthlete, setAlsoAthlete] = useState<boolean | null>(null);

  // Fetch disciplines
  useEffect(() => {
    fetch("/api/disciplines", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDisciplines(data);
        }
      })
      .catch(console.error);
  }, []);

  // Click outside to close place results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowPlaceResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced place search
  const handlePlaceSearchChange = (value: string) => {
    setPlaceSearch(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setPlaceResults([]);
      setShowPlaceResults(false);
      return;
    }

    setIsSearchingPlaces(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/places/search?query=${encodeURIComponent(value)}`
        );
        const data = await response.json();
        
        if (response.ok && data.results) {
          setPlaceResults(data.results);
          setShowPlaceResults(true);
        }
      } catch (err) {
        console.error("Place search error:", err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);
  };

  // Select a place and populate address fields
  const handleSelectPlace = async (place: PlaceResult) => {
    setIsLoadingPlaceDetails(true);
    setShowPlaceResults(false);
    setPlaceSearch(place.name);

    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(place.placeId)}`
      );
      const data = await response.json();

      if (response.ok && data.details) {
        const details = data.details;
        setFormData((prev) => ({
          ...prev,
          name: prev.name || details.name || "",
          googlePlaceId: details.placeId,
          address: details.address || prev.address,
          city: details.city || prev.city,
          state: details.state || prev.state,
          country: details.country || prev.country,
          zipCode: details.zipCode || prev.zipCode,
          phone: details.phone || prev.phone,
          website: details.website || prev.website,
        }));
      }
    } catch (err) {
      console.error("Place details error:", err);
    } finally {
      setIsLoadingPlaceDetails(false);
    }
  };

  // Clear Google Place selection
  const handleClearPlace = () => {
    setFormData((prev) => ({ ...prev, googlePlaceId: "" }));
    setPlaceSearch("");
  };

  const toggleDiscipline = (disciplineId: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter((id) => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // If they're also an athlete, continue to profile setup
        if (alsoAthlete) {
          router.push("/onboarding/profile?type=athlete&fromGym=true");
        } else {
          router.push("/gym?welcome=owner");
        }
      } else {
        const data = await response.json();
        console.error("Failed to create gym:", data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating gym:", error);
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isFormValid = formData.name.trim().length >= 2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            Register Your Gym
          </CardTitle>
          <CardDescription>
            Set up your gym on Ascendant. You can add more details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Google Places Search */}
            <div className="space-y-2" ref={searchContainerRef}>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Find Your Gym
              </Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for your gym on Google Maps..."
                    value={placeSearch}
                    onChange={(e) => handlePlaceSearchChange(e.target.value)}
                    onFocus={() => placeResults.length > 0 && setShowPlaceResults(true)}
                    className="pl-10 pr-10"
                    disabled={isLoadingPlaceDetails}
                  />
                  {(isSearchingPlaces || isLoadingPlaceDetails) && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showPlaceResults && placeResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {placeResults.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                        onClick={() => handleSelectPlace(place)}
                      >
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {place.address}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Place Display */}
              {formData.googlePlaceId && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm">
                  <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="flex-1 truncate text-green-700 dark:text-green-400">Linked to Google Maps</span>
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${formData.googlePlaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPlace}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Search to auto-fill your gym&apos;s details, or enter manually below
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Gym Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Ninja City Training Center"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Gym Logo
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Square image recommended (e.g., 400x400px)
                </p>
                <ImageUpload
                  uploadEndpoint="/api/upload/gym"
                  currentImageUrl={formData.logoUrl || undefined}
                  onUpload={(url) => setFormData({ ...formData, logoUrl: url })}
                  onRemove={() => setFormData({ ...formData, logoUrl: "" })}
                  aspectRatio={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell athletes about your gym..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="California"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="94102"
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, zipCode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourgym.com"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@yourgym.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Social Media - Collapsible */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <span>+ Add Social Media Links</span>
                  <span className="text-xs">(optional)</span>
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl" className="text-xs">Instagram</Label>
                    <Input
                      id="instagramUrl"
                      type="url"
                      placeholder="https://instagram.com/yourgym"
                      value={formData.instagramUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, instagramUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl" className="text-xs">Facebook</Label>
                    <Input
                      id="facebookUrl"
                      type="url"
                      placeholder="https://facebook.com/yourgym"
                      value={formData.facebookUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, facebookUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktokUrl" className="text-xs">TikTok</Label>
                    <Input
                      id="tiktokUrl"
                      type="url"
                      placeholder="https://tiktok.com/@yourgym"
                      value={formData.tiktokUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, tiktokUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl" className="text-xs">YouTube</Label>
                    <Input
                      id="youtubeUrl"
                      type="url"
                      placeholder="https://youtube.com/@yourgym"
                      value={formData.youtubeUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, youtubeUrl: e.target.value })
                      }
                    />
                  </div>
                </div>
              </details>
            </div>

            {disciplines.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Disciplines
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({formData.disciplineIds.length} selected)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What sports/activities does your gym focus on?
                </p>
                <div className="flex flex-wrap gap-2">
                  {disciplines.map((disc) => (
                    <Badge
                      key={disc.id}
                      variant={
                        formData.disciplineIds.includes(disc.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => toggleDiscipline(disc.id)}
                    >
                      {disc.icon} {disc.name}
                      {formData.disciplineIds.includes(disc.id) && " ✓"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Are you also an athlete? */}
            <div className="space-y-3 border-t pt-4">
              <Label>Are you also an athlete?</Label>
              <p className="text-xs text-muted-foreground">
                Do you want to track your own fitness progress on Ascendant?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAlsoAthlete(true)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    alsoAthlete === true
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">🏃</span>
                  <p className="text-sm font-medium mt-1">Yes, I train too</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAlsoAthlete(false)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    alsoAthlete === false
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">🏢</span>
                  <p className="text-sm font-medium mt-1">No, just the gym</p>
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !isFormValid || alsoAthlete === null}
              >
                {isLoading ? "Creating Gym..." : alsoAthlete ? "Continue to Profile →" : "Create Gym"}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/onboarding")}
              >
                ← Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
