"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Search, Loader2, X, ExternalLink, Globe, Mail, Phone, 
  Building2, Image, Dumbbell, Activity, CheckCircle2, AlertCircle, Package 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface Equipment {
  id: string;
  name: string;
  icon: string | null;
}

interface EquipmentPackage {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  items: {
    equipmentId: string;
    equipment: Equipment;
  }[];
}

interface GymFormProps {
  gym?: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    website: string | null;
    googlePlaceId: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zipCode: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    disciplines?: { discipline: Discipline }[];
    equipment?: { equipment: Equipment }[];
  };
  disciplines: Discipline[];
  equipment: Equipment[];
  equipmentPackages?: EquipmentPackage[];
  mode: "create" | "edit";
}

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
}

export function GymForm({ gym, disciplines, equipment, equipmentPackages = [], mode }: GymFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Places search state
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: gym?.name ?? "",
    description: gym?.description ?? "",
    logoUrl: gym?.logoUrl ?? "",
    bannerUrl: gym?.bannerUrl ?? "",
    website: gym?.website ?? "",
    googlePlaceId: gym?.googlePlaceId ?? "",
    address: gym?.address ?? "",
    city: gym?.city ?? "",
    state: gym?.state ?? "",
    country: gym?.country ?? "",
    zipCode: gym?.zipCode ?? "",
    phone: gym?.phone ?? "",
    email: gym?.email ?? "",
    isActive: gym?.isActive ?? true,
    disciplineIds: gym?.disciplines?.map(d => d.discipline.id) ?? [],
    equipmentIds: gym?.equipment?.map(e => e.equipment.id) ?? [],
  });

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
          `/api/admin/places/search?query=${encodeURIComponent(value)}`
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
        `/api/admin/places/details?placeId=${encodeURIComponent(place.placeId)}`
      );
      const data = await response.json();

      if (response.ok && data.details) {
        const details = data.details;
        setFormData((prev) => ({
          ...prev,
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

  // Validation helpers
  const isValidEmail = (email: string) => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidUrl = (url: string) => {
    if (!url) return true; // Optional field
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const isValidPhone = (phone: string) => {
    if (!phone) return true; // Optional field
    // Allow various phone formats
    return /^[\d\s\-+().]{7,20}$/.test(phone);
  };

  // Form validation state
  const nameError = formData.name.trim().length > 0 && formData.name.trim().length < 2 
    ? "Name must be at least 2 characters" : null;
  const emailError = !isValidEmail(formData.email) ? "Please enter a valid email" : null;
  const websiteError = !isValidUrl(formData.website) ? "Please enter a valid URL" : null;
  const phoneError = !isValidPhone(formData.phone) ? "Please enter a valid phone number" : null;

  const isFormValid = 
    formData.name.trim().length >= 2 && 
    !emailError && 
    !websiteError && 
    !phoneError;

  // Auto-format website URL
  const handleWebsiteChange = (value: string) => {
    setFormData({ ...formData, website: value });
  };

  const handleWebsiteBlur = () => {
    if (formData.website && !formData.website.startsWith("http")) {
      setFormData({ ...formData, website: `https://${formData.website}` });
    }
  };

  // Calculate form completion percentage
  const completionItems = [
    { done: formData.name.trim().length >= 2, label: "Name" },
    { done: !!formData.description?.trim(), label: "Description" },
    { done: !!formData.logoUrl, label: "Logo" },
    { done: !!formData.address?.trim(), label: "Address" },
    { done: !!formData.phone?.trim() || !!formData.email?.trim(), label: "Contact" },
    { done: formData.disciplineIds.length > 0, label: "Disciplines" },
  ];
  const completedCount = completionItems.filter(i => i.done).length;
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);

  const toggleDiscipline = (disciplineId: string) => {
    setFormData(prev => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter(id => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const toggleEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(equipmentId)
        ? prev.equipmentIds.filter(id => id !== equipmentId)
        : [...prev.equipmentIds, equipmentId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/admin/gyms" 
        : `/api/admin/gyms/${gym?.id}`;
      
      const submitData = {
        ...formData,
        description: formData.description?.trim() || null,
        logoUrl: formData.logoUrl?.trim() || null,
        bannerUrl: formData.bannerUrl?.trim() || null,
        website: formData.website?.trim() || null,
        googlePlaceId: formData.googlePlaceId?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        country: formData.country?.trim() || null,
        zipCode: formData.zipCode?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
      };

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      router.push("/admin/gyms");
      router.refresh();
    } catch (err) {
      console.error("Gym form error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Completion Progress */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-3">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                completionPercentage === 100 ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {completionItems.map((item) => (
              <Badge
                key={item.label}
                variant={item.done ? "default" : "outline"}
                className={cn(
                  "text-xs",
                  item.done ? "bg-green-600 hover:bg-green-600" : "text-muted-foreground"
                )}
              >
                {item.done && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {item.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>General gym details that athletes will see</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Gym Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Ninja City Training Center"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
              required
              minLength={2}
              maxLength={100}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.name.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell athletes what makes your gym special. Include information about your training programs, coaching staff, facility features, and any specialties..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/2000 characters • A good description helps athletes find and choose your gym
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logo
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Square image, minimum 200x200px
              </p>
              <ImageUpload
                uploadEndpoint="/api/upload/gym"
                currentImageUrl={formData.logoUrl || undefined}
                onUpload={(url) => setFormData({ ...formData, logoUrl: url })}
                onRemove={() => setFormData({ ...formData, logoUrl: "" })}
                disabled={isLoading}
                aspectRatio={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Banner Image
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Wide image for your gym profile header
              </p>
              <ImageUpload
                uploadEndpoint="/api/upload/gym"
                currentImageUrl={formData.bannerUrl || undefined}
                onUpload={(url) => setFormData({ ...formData, bannerUrl: url })}
                onRemove={() => setFormData({ ...formData, bannerUrl: "" })}
                disabled={isLoading}
                aspectRatio={16/9}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>How athletes can reach your gym</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                type="text"
                placeholder="www.yourgym.com"
                value={formData.website}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                onBlur={handleWebsiteBlur}
                className={cn(websiteError && "border-destructive focus-visible:ring-destructive")}
              />
              {websiteError && (
                <p className="text-xs text-destructive">{websiteError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="info@yourgym.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={cn(emailError && "border-destructive focus-visible:ring-destructive")}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn(phoneError && "border-destructive focus-visible:ring-destructive")}
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>
            Your gym&apos;s physical address. Search to auto-fill from Google Maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Places Search */}
          <div className="space-y-2" ref={searchContainerRef}>
            <Label>
              <MapPin className="inline h-4 w-4 mr-1" />
              Search Location
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a gym on Google Maps..."
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
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="flex-1 truncate">Linked to Google Maps</span>
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
              Searching will auto-fill address fields. You can still edit them manually.
            </p>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="San Francisco"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                placeholder="California"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP/Postal Code</Label>
              <Input
                id="zipCode"
                placeholder="94102"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="United States"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Disciplines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Disciplines
          </CardTitle>
          <CardDescription>
            What sports and activities does your gym focus on? Select all that apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disciplines.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {disciplines.map((disc) => {
                  const isSelected = formData.disciplineIds.includes(disc.id);
                  return (
                    <Badge
                      key={disc.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all text-sm py-1.5 px-3",
                        isSelected 
                          ? "bg-primary hover:bg-primary/90" 
                          : "hover:bg-accent hover:border-primary"
                      )}
                      onClick={() => toggleDiscipline(disc.id)}
                    >
                      {disc.icon && <span className="mr-1">{disc.icon}</span>}
                      {disc.name}
                      {isSelected && <CheckCircle2 className="h-3 w-3 ml-1.5" />}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {formData.disciplineIds.length} selected • This helps athletes find gyms that match their interests
              </p>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No disciplines available yet.</p>
              <a href="/admin/disciplines" className="text-primary hover:underline text-sm">
                Add disciplines →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Packages */}
      {equipmentPackages.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quick Add: Equipment Packages
            </CardTitle>
            <CardDescription>
              Click a package to add all its equipment at once. You can still customize individual items below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {equipmentPackages.map((pkg) => {
                // Check how many items from this package are already selected
                const packageEquipmentIds = pkg.items.map((i) => i.equipmentId);
                const selectedCount = packageEquipmentIds.filter((id) =>
                  formData.equipmentIds.includes(id)
                ).length;
                const isFullyApplied = selectedCount === packageEquipmentIds.length && packageEquipmentIds.length > 0;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                      isFullyApplied
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                    onClick={() => {
                      // Add all equipment from this package
                      setFormData((prev) => ({
                        ...prev,
                        equipmentIds: [
                          ...new Set([...prev.equipmentIds, ...packageEquipmentIds]),
                        ],
                      }));
                    }}
                  >
                    <span className="text-2xl">{pkg.icon || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pkg.name}</span>
                        {isFullyApplied && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pkg.items.length} items
                        {selectedCount > 0 && !isFullyApplied && (
                          <span className="ml-1">
                            ({selectedCount} already added)
                          </span>
                        )}
                      </p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Equipment
          </CardTitle>
          <CardDescription>
            What equipment does your gym have? This helps athletes know what to expect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipment.length > 0 ? (
            <>
              {formData.equipmentIds.length > 0 && (
                <div className="flex justify-end mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, equipmentIds: [] })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {equipment.map((eq) => {
                  const isSelected = formData.equipmentIds.includes(eq.id);
                  return (
                    <Badge
                      key={eq.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all text-sm py-1.5 px-3",
                        isSelected 
                          ? "bg-primary hover:bg-primary/90" 
                          : "hover:bg-accent hover:border-primary"
                      )}
                      onClick={() => toggleEquipment(eq.id)}
                    >
                      {eq.icon && <span className="mr-1">{eq.icon}</span>}
                      {eq.name}
                      {isSelected && <CheckCircle2 className="h-3 w-3 ml-1.5" />}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {formData.equipmentIds.length} selected
              </p>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No equipment available yet.</p>
              <a href="/admin/equipment" className="text-primary hover:underline text-sm">
                Add equipment →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control whether athletes can see your gym</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="isActive" className="text-base font-medium cursor-pointer">
                {formData.isActive ? "Gym is Active" : "Gym is Hidden"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {formData.isActive 
                  ? "Your gym is visible to athletes and appears in search results."
                  : "Your gym is hidden from athletes. Enable this when you're ready to launch."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={isLoading || !isFormValid} 
          className="min-w-[140px] h-11"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {mode === "create" ? "Create Gym" : "Save Changes"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/gyms")}
          className="h-11"
          size="lg"
        >
          Cancel
        </Button>
        {!isFormValid && formData.name.length > 0 && (
          <p className="text-sm text-destructive self-center ml-2">
            Please fix the errors above before submitting
          </p>
        )}
      </div>
    </form>
  );
}
