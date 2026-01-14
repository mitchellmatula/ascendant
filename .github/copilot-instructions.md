# Copilot Instructions for Ascendant

## Project Overview
Ascendant is a universal progression system for athletes. Athletes earn XP by completing challenges, progressing through ranks (F→E→D→C→B→A→S) in four domains: Strength, Skill, Endurance, and Speed.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Database**: Neon Postgres + Prisma 7
- **Auth**: Clerk
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Storage**: Vercel Blob (images, videos)
- **Video Compression**: FFmpeg.wasm (client-side)

## Key Architectural Decisions

### XP System (Tier-Based)
XP is awarded per tier achieved on graded challenges. Each tier can only award XP once per challenge.

```typescript
// src/lib/xp.ts
TIER_XP_AWARDS = { F: 25, E: 50, D: 75, C: 100, B: 150, A: 200, S: 300 }
XP_PER_SUBLEVEL = { F: 100, E: 200, D: 400, C: 800, B: 1600, A: 3200, S: 6400 }
```

- Challenges have **grades** defining tier targets per division
- Athletes achieving higher tiers earn XP for all unclaimed lower tiers
- `ChallengeSubmission.claimedTiers` tracks what's been awarded

### Video Infrastructure
Two video source types supported:

1. **Uploaded videos** (Vercel Blob)
   - Client-side compression via FFmpeg.wasm (720p, 30fps)
   - Component: `VideoUpload`
   - API: `/api/upload/video`

2. **External URLs** (YouTube/Vimeo)
   - Embedded via iframe with privacy-enhanced URLs
   - Component: `VideoEmbed`
   - Use `isEmbeddableVideoUrl()` to detect

Smart display component: `VideoDisplay` auto-detects source type.

### Image Upload
- Component: `ImageUpload` with `react-image-crop`
- Supports aspect ratio enforcement
- API: `/api/upload/image`

### Challenge Structure
Challenges can award XP to up to 3 domains:
- Primary: 50-100% (required)
- Secondary: 0-50% (optional)  
- Tertiary: 0-30% (optional)
- Percentages must sum to 100%

### Grading Types
```typescript
GRADING_TYPES = ["PASS_FAIL", "REPS", "TIME", "DISTANCE", "TIMED_REPS"]
```

Graded challenges have `ChallengeGrade` entries defining tier targets per division.

### Divisions
Age/gender based divisions (e.g., "Adult Male 18-29", "Youth Female 14-17"). Athletes auto-assigned based on profile.

### Gyms
Gyms are physical locations where athletes train. Key features:
- **Gym ownership**: Users can own/manage gyms
- **Gym membership**: Users can be members with roles (MEMBER, COACH, MANAGER, OWNER)
- **Equipment tracking**: Gyms have a list of equipment from the master equipment list
- **Discipline focus**: Gyms associate with specific disciplines (Ninja, Calisthenics, etc.)
- **Gym-specific challenges**: Challenges can optionally be tied to a specific gym (visible only to that gym's members)

```typescript
// Gym roles
GymRole = ["MEMBER", "COACH", "MANAGER", "OWNER"]

// Challenge.gymId - null for global challenges, set for gym-specific
```

## Component Conventions

### Video Components
```tsx
// For challenge pages - auto-detects source
<VideoDisplay url={challenge.demoVideoUrl} fallbackImageUrl={challenge.demoImageUrl} />

// For upload forms
<VideoUpload value={url} onUpload={setUrl} enableCompression={true} />

// For embeds only
<VideoEmbed url="https://youtube.com/..." />

// Loading state
<Suspense fallback={<VideoSkeleton />}>
  <VideoDisplay ... />
</Suspense>
```

### Form Patterns
- Use shadcn/ui components
- Zod validation in `src/lib/validators/`
- Server actions or API routes for mutations

## File Structure
```
src/
├── app/
│   ├── (app)/          # Athlete-facing pages
│   ├── (admin)/        # Admin pages
│   └── api/            # API routes
├── components/
│   ├── ui/             # shadcn + custom UI components
│   ├── admin/          # Admin-specific components
│   └── domains/        # Domain visualization
├── lib/
│   ├── xp.ts           # XP calculation
│   ├── levels.ts       # Rank utilities
│   ├── video-compression.ts  # FFmpeg wrapper
│   └── validators/     # Zod schemas
```

## Database Conventions
- All IDs are `cuid()`
- Soft delete via `isActive` boolean
- Audit fields: `createdAt`, `updatedAt`
- Slugs for URL-friendly references

## Mobile-First Design
- Minimum 44px touch targets
- Single-column layouts on mobile
- Large, readable text (16px+ base)
- Use responsive breakpoints: sm(640), md(768), lg(1024), xl(1280)
