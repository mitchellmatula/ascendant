# Ascendant – Creation Plan

## Tech Stack (Finalized)

| Category | Choice |
|----------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Neon Postgres |
| ORM | Prisma 7 |
| Auth | Clerk |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |
| Animations | Framer Motion |
| Hosting | Vercel |
| Storage | Vercel Blob (images & videos) |
| Video Compression | FFmpeg.wasm (client-side) |
| Charts | TBD (Recharts or Tremor) |

---

## Video & Media Infrastructure

### Video Sources
Challenges support two types of demo videos:
1. **Uploaded videos** - Stored in Vercel Blob, compressed client-side
2. **External URLs** - YouTube/Vimeo links embedded via iframe

### Components
| Component | Purpose |
|-----------|---------|
| `VideoUpload` | Upload with client-side compression, progress tracking |
| `VideoEmbed` | Embed YouTube/Vimeo with privacy-enhanced URLs |
| `VideoDisplay` | Smart component that auto-detects source type |
| `VideoPlayer` | Native HTML5 player for uploaded videos |
| `VideoSkeleton` | Loading skeleton for Suspense fallback |
| `ImageUpload` | Image upload with cropping (react-image-crop) |

### Video Best Practices (Next.js aligned)
- `preload="none"` for native controls (don't load until user interacts)
- `preload="metadata"` for custom controls (load duration only)
- `loading="lazy"` on iframes for external embeds
- `playsInline` for iOS compatibility
- `aria-label` for accessibility
- Fallback content for unsupported browsers
- Use `<VideoSkeleton>` with React Suspense for loading states

### Client-Side Compression
Using FFmpeg.wasm for mobile uploads:
- Target: 720p, 30fps, H.264/AAC
- Auto-compress if file exceeds threshold (default 10MB)
- Shows progress during compression
- Reduces upload time and storage costs

### External Video Support
Supported platforms:
- YouTube (youtube.com, youtu.be, youtube.com/shorts)
- Vimeo (vimeo.com, player.vimeo.com)

Privacy-enhanced embeds:
- YouTube: `youtube-nocookie.com` domain
- Vimeo: `byline=0&portrait=0` params

---

## Design Principles

### Mobile-First Design (CRITICAL)
All UI must be designed **mobile-first**. Athletes will primarily use this app on their phones at gyms, competitions, and training sessions.

**Key principles:**
1. **Touch-friendly targets** – Minimum 44px tap targets for all interactive elements
2. **Single-column layouts on mobile** – Stack content vertically, use horizontal layouts only on larger screens
3. **Bottom navigation preferred** – Primary actions should be thumb-reachable
4. **Large, readable text** – Base font size 16px minimum, important info larger
5. **Swipe gestures** – Support swipe for common actions where appropriate
6. **Minimal typing** – Use selectors, toggles, and pickers over text input when possible
7. **Progressive disclosure** – Show essential info first, details on tap/expand
8. **Fast loading** – Optimize images, lazy load where possible
9. **Offline-friendly** – Cache key data for offline viewing (future PWA)
10. **Responsive breakpoints:**
    - `sm`: 640px (large phones)
    - `md`: 768px (tablets)
    - `lg`: 1024px (laptops)
    - `xl`: 1280px (desktops)

**Component guidelines:**
- Cards: Full-width on mobile, grid on desktop
- Forms: Single column, large inputs, sticky submit buttons
- Tables: Convert to card lists on mobile
- Modals: Full-screen sheets on mobile, centered modals on desktop
- Navigation: Bottom tab bar on mobile, sidebar on desktop

---

## Phase 0: Core System Design

### 0.1 Domains (Finalized)
4 core domains:
- **Strength** – Force, load, work capacity
- **Skill** – Coordination, control, precision (ninja/parkour style)
- **Endurance** – Long-duration effort
- **Speed** – Acceleration, sprinting, fast output

*(Prime is calculated from these 4, not directly trained)*

### 0.1.1 Level System & Prime Calculation

**Rank Letters & Numeric Values:**
| Rank | Name | Numeric Range | Example |
|------|------|---------------|---------|
| F | Foundation | 0-9 | F7 = 7 |
| E | Explorer | 10-19 | E3 = 13 |
| D | Disciplined | 20-29 | D5 = 25 |
| C | Challenger | 30-39 | C7 = 37 |
| B | Breakthrough | 40-49 | B2 = 42 |
| A | Apex | 50-59 | A0 = 50 |
| S | Supreme | 60-69 | S9 = 69 |

**Rank Meanings:**
- **F - Foundation**: Learning the basics. Building the base.
- **E - Explorer**: Trying new skills. Expanding capability.
- **D - Disciplined**: Training with intent. Showing consistency.
- **C - Challenger**: Taking on real tests. Pushing limits.
- **B - Breakthrough**: Major capability unlocked.
- **A - Apex**: Advanced performance.
- **S - Supreme**: Exceptional. Rare.

**Formula**: `numericValue = (rankIndex * 10) + sublevel`
- Where rankIndex: F=0, E=1, D=2, C=3, B=4, A=5, S=6

**Prime Calculation**:
1. Convert each domain level to numeric value
2. Average all 4 values
3. Convert back to letter + sublevel

**Example**:
- Strength: C7 = 37
- Skill: D3 = 23  
- Endurance: B2 = 42
- Speed: E5 = 15
- **Average**: (37 + 23 + 42 + 15) / 4 = 29.25
- **Prime**: D9 (rounds to 29, which is D-rank sublevel 9)

### 0.2 Categories (Admin-Configurable)
- Each domain has **X categories** (number is flexible, set by admins)
- Categories are created/managed via admin interface
- Examples for Skill: Balance, Climbing, Swinging, Precision, Jumping
- Categories define the "what" you're training

### 0.3 Challenges (The Core Content)
Challenges are the atomic unit of progression. Each challenge has:
- **Name** & **Description**
- **Domain** assignment
- **Category** assignment (within that domain)
- **Demo media** – Video or image showing proper execution
- **Submission requirements** – What athletes must upload to prove completion
- **XP value** – How much XP completing this challenge awards
- **Rank requirements** – Which age/gender divisions need this for which rank

### 0.4 Age & Gender Divisions (Admin-Configurable)
Divisions are fully configurable:
- **Gender**: Male, Female (configurable labels)
- **Age brackets**: Created by admins (e.g., 8-10, 11-13, 14-17, 18-29, 30-39, 40+)
- Athletes auto-assigned to division based on profile

### 0.5 Rank Requirement Matrix (The Rubric)
A matrix/rubric system that defines:

| Challenge | Division | Required For Rank | XP Bonus |
|-----------|----------|-------------------|----------|
| 10ft Lache | Adult Male | C-rank | +50 |
| 10ft Lache | Youth 14-17 Male | B-rank | +50 |
| 5ft Lache | Youth 8-10 | C-rank | +30 |

This allows:
- Same challenge, different requirements per age/gender
- Flexible "complete N of M" rules per category per rank
- Admins can design progression paths visually

### 0.6 User Types & Roles

**Account Types (at signup):**
| Type | Description |
|------|-------------|
| **Athlete** | Individual competitor (adult, 18+) |
| **Parent** | Manages one or more child athletes |

**Roles (admin-assigned):**
| Role | Capabilities |
|------|-------------|
| **Athlete** | View challenges, submit completions, track progress |
| **Parent** | Manage child athletes, submit on their behalf, view their progress |
| **Coach** | View athlete progress, verify submissions (future) |
| **Gym Admin** | Manage gym athletes, verify submissions, view analytics |
| **System Admin** | Configure domains, categories, challenges, divisions, rubrics |

**Parent Account Features:**
- Create/manage multiple child athlete profiles
- Switch between children in the UI
- Submit challenges on behalf of children
- View progress for all managed athletes
- Children don't need their own login (until they turn 18 or are granted one)

### 0.7 MVP Scope
**MVP (v1.0)**:
- Athlete registration & profile
- Browse challenges by domain/category
- Submit challenge completions (video upload)
- XP tracking & level display
- Basic admin: manage challenges, categories, divisions
- Rank requirement matrix editor

**V2**:
- Coach/gym admin roles
- Submission verification workflow
- Leaderboards (opt-in)
- Competition/event integration

**V3**:
- Social features
- Training programs
- Team challenges
- Mobile app (or enhanced PWA)

---

## Phase 1: Project Setup

### 1.1 Initialize Project
- [ ] Create Next.js 16 app with Turbopack
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up ESLint + Prettier

### 1.2 Database & Auth
- [ ] Create Neon Postgres database
- [ ] Initialize Prisma
- [ ] Design initial schema (see below)
- [ ] Set up Clerk
- [ ] Connect Clerk user to Prisma Athlete model

### 1.3 Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── onboarding/           # Account type selection & profile setup
│   ├── (app)/                    # Main athlete experience
│   │   ├── dashboard/
│   │   ├── domains/
│   │   │   └── [slug]/           # Domain detail with categories
│   │   ├── challenges/
│   │   │   └── [slug]/           # Challenge detail & submission
│   │   ├── profile/
│   │   ├── history/
│   │   └── athletes/             # Parent: manage children
│   │       ├── page.tsx          # List of managed athletes
│   │       ├── add/              # Add new child athlete
│   │       └── [id]/             # View/edit child profile
│   ├── (admin)/                  # Admin configuration
│   │   ├── domains/              # CRUD domains
│   │   ├── categories/           # CRUD categories
│   │   ├── challenges/           # CRUD challenges with demo upload
│   │   ├── divisions/            # Age/gender division config
│   │   ├── rubric/               # Rank requirement matrix editor
│   │   ├── submissions/          # Review pending submissions
│   │   └── users/                # User management
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── clerk/            # Clerk webhook for user sync
│   │   ├── upload/               # Vercel Blob upload endpoints
│   │   └── trpc/                 # Optional: tRPC router
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn components
│   ├── domains/                  # Domain cards, radar chart
│   ├── challenges/               # Challenge cards, submission form
│   ├── levels/                   # Level display, progress bars, rank badges
│   ├── athletes/                 # Athlete switcher (for parents)
│   ├── admin/                    # Admin-specific components
│   │   ├── rubric-editor/        # Matrix editor for rank requirements
│   │   └── media-upload/         # Video/image upload components
│   └── layout/                   # Nav, sidebar, footer
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── auth.ts                   # Clerk helpers
│   ├── xp.ts                     # XP calculation logic
│   ├── levels.ts                 # Level/rank utilities
│   ├── divisions.ts              # Division matching logic
│   ├── upload.ts                 # Vercel Blob helpers
│   └── validators/               # Zod schemas
│       ├── athlete.ts
│       ├── challenge.ts
│       ├── submission.ts
│       └── admin.ts
├── hooks/
│   ├── use-athlete.ts
│   ├── use-domains.ts
│   └── use-submissions.ts
├── types/
│   └── index.ts
└── styles/
```

---

## Phase 2: Core Data Model (Prisma Schema Draft)

```prisma
// ============================================
// USER & ATHLETE
// ============================================

model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  accountType   AccountType @default(ATHLETE)
  role          Role     @default(ATHLETE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // If accountType is ATHLETE, this is their own athlete profile
  athlete       Athlete?  @relation("UserAthlete")
  
  // If accountType is PARENT, these are their managed children
  managedAthletes Athlete[] @relation("ParentManaged")
}

enum AccountType {
  ATHLETE   // Adult competing for themselves
  PARENT    // Parent managing child athletes
}

enum Role {
  ATHLETE
  PARENT
  COACH
  GYM_ADMIN
  SYSTEM_ADMIN
}

model Athlete {
  id            String   @id @default(cuid())
  
  // For adult athletes who have their own account
  userId        String?  @unique
  user          User?    @relation("UserAthlete", fields: [userId], references: [id])
  
  // For child athletes managed by a parent
  parentId      String?
  parent        User?    @relation("ParentManaged", fields: [parentId], references: [id])
  
  displayName   String
  dateOfBirth   DateTime
  gender        String   // Maps to division
  avatarUrl     String?
  isMinor       Boolean  @default(false)  // Calculated from DOB, for quick filtering
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  domainLevels  DomainLevel[]
  xpTransactions XPTransaction[]
  submissions   ChallengeSubmission[]
}

// ============================================
// DOMAINS & CATEGORIES (Admin-Configurable)
// ============================================

model Domain {
  id          String   @id @default(cuid())
  name        String   @unique  // Strength, Skill, Endurance, Speed
  slug        String   @unique
  description String?
  icon        String?  // Icon name or URL
  color       String?  // Hex color for UI
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  categories  Category[]
  levels      DomainLevel[]
  xpTransactions XPTransaction[]
  xpThresholds XPThreshold[]  // Configurable XP per sublevel
}

// XP required per sublevel, configurable per domain per rank
model XPThreshold {
  id          String   @id @default(cuid())
  domainId    String
  rank        String   // F, E, D, C, B, A, S
  sublevel    Int      // 0-9
  xpRequired  Int      // XP needed to reach this sublevel
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  domain      Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@unique([domainId, rank, sublevel])
}

model Category {
  id          String   @id @default(cuid())
  domainId    String
  name        String   // e.g., "Balance", "Grip Strength", "Climbing"
  slug        String
  description String?
  icon        String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  domain      Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)
  challenges  Challenge[]

  @@unique([domainId, slug])
}

// ============================================
// CHALLENGES (The Core Content)
// ============================================

model Challenge {
  id            String   @id @default(cuid())
  categoryId    String
  name          String
  slug          String
  description   String   @db.Text
  instructions  String?  @db.Text  // How to perform/submit
  demoVideoUrl  String?  // Vercel Blob URL
  demoImageUrl  String?  // Vercel Blob URL
  baseXP        Int      @default(100)  // XP awarded on completion
  difficulty    Int      @default(1)    // 1-10 scale for sorting/filtering
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  category      Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  rankRequirements RankRequirement[]
  submissions   ChallengeSubmission[]

  @@unique([categoryId, slug])
}

// ============================================
// DIVISIONS (Age/Gender - Admin-Configurable)
// ============================================

model Division {
  id          String   @id @default(cuid())
  name        String   // e.g., "Youth Male 8-10", "Adult Female"
  slug        String   @unique
  gender      String?  // Male, Female, or null for any
  ageMin      Int?     // Minimum age (inclusive)
  ageMax      Int?     // Maximum age (inclusive)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rankRequirements RankRequirement[]
  rankThresholds   RankThreshold[]
}

// ============================================
// RANK REQUIREMENT MATRIX (The Rubric)
// ============================================

model RankRequirement {
  id            String   @id @default(cuid())
  challengeId   String
  divisionId    String
  requiredForRank String // F, E, D, C, B, A, S
  bonusXP       Int      @default(0)  // Extra XP for this division
  isRequired    Boolean  @default(true)  // vs optional for rank
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  challenge     Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  division      Division  @relation(fields: [divisionId], references: [id], onDelete: Cascade)

  @@unique([challengeId, divisionId, requiredForRank])
}

// How many challenges needed per category to advance rank
model RankThreshold {
  id            String   @id @default(cuid())
  divisionId    String
  domainId      String
  rank          String   // The rank being unlocked (e.g., "C" means moving from D to C)
  categoryId    String?  // If null, applies to whole domain
  requiredCount Int      // N of M challenges required
  totalInCategory Int?   // M (optional, can be calculated)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  division      Division @relation(fields: [divisionId], references: [id], onDelete: Cascade)

  @@unique([divisionId, domainId, rank, categoryId])
}

// ============================================
// ATHLETE PROGRESS
// ============================================

model DomainLevel {
  id          String   @id @default(cuid())
  athleteId   String
  domainId    String
  letter      String   @default("F")  // F, E, D, C, B, A, S
  sublevel    Int      @default(0)    // 0-9
  currentXP   Int      @default(0)
  bankedXP    Int      @default(0)    // XP waiting for breakthrough
  updatedAt   DateTime @updatedAt

  athlete     Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  domain      Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@unique([athleteId, domainId])
}

model XPTransaction {
  id          String   @id @default(cuid())
  athleteId   String
  domainId    String
  amount      Int
  source      XPSource
  sourceId    String?  // Reference to challenge submission, competition, etc.
  note        String?
  createdAt   DateTime @default(now())

  athlete     Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  domain      Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)
}

enum XPSource {
  CHALLENGE
  TRAINING
  COMPETITION
  EVENT
  BONUS
  ADMIN
}

// ============================================
// CHALLENGE SUBMISSIONS
// ============================================

model ChallengeSubmission {
  id            String   @id @default(cuid())
  athleteId     String
  challengeId   String
  submittedById String   // User who submitted (parent or athlete themselves)
  videoUrl      String?  // Vercel Blob URL
  imageUrl      String?  // Vercel Blob URL
  notes         String?
  status        SubmissionStatus @default(PENDING)
  autoApproved  Boolean  @default(false)  // True if submitter was Coach/Admin
  xpAwarded     Int?
  reviewedBy    String?  // User ID of reviewer
  reviewNotes   String?
  submittedAt   DateTime @default(now())
  reviewedAt    DateTime?
  version       Int      @default(1)  // Increments on resubmission

  athlete       Athlete   @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  challenge     Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  history       SubmissionHistory[]  // Previous versions

  @@unique([athleteId, challengeId])  // One active submission per challenge per athlete
}

// Keeps history of resubmissions for audit
model SubmissionHistory {
  id              String   @id @default(cuid())
  submissionId    String
  videoUrl        String?
  imageUrl        String?
  notes           String?
  status          SubmissionStatus
  reviewedBy      String?
  reviewNotes     String?
  submittedAt     DateTime
  reviewedAt      DateTime?
  version         Int
  archivedAt      DateTime @default(now())

  submission      ChallengeSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
  NEEDS_REVISION
}

// ============================================
// FUTURE: COMPETITIONS
// ============================================

model Competition {
  id          String   @id @default(cuid())
  name        String
  date        DateTime
  location    String?
  sport       String
  domains     String[] // Which domains this affects
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  results     CompetitionResult[]
}

model CompetitionResult {
  id            String   @id @default(cuid())
  competitionId String
  athleteId     String
  placement     Int
  totalParticipants Int
  xpAwarded     Int
  createdAt     DateTime @default(now())

  competition   Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
}
```

---

## Phase 3: Core Features (MVP)

### 3.1 Authentication & Onboarding
- [ ] Sign up / Sign in with Clerk
- [ ] Clerk webhook to sync user to database
- [ ] **Account type selection**: "I'm an athlete" vs "I'm a parent"
- [ ] **Athlete flow**: Create athlete profile (DOB, gender, display name)
- [ ] **Parent flow**: Create first child athlete profile
- [ ] Auto-assign division based on age/gender

### 3.2 Parent Account Features
- [ ] **Athlete switcher**: Dropdown/sidebar to switch between managed children
- [ ] **Add child**: Create new child athlete profile
- [ ] **Child management**: Edit child profiles, view their progress
- [ ] **Submit on behalf**: Parents submit challenges for their children
- [ ] **Dashboard per child**: See each child's progress separately

### 3.3 Athlete Dashboard
- [ ] Domain level cards (4 domains + Prime)
- [ ] Radar chart showing domain balance
- [ ] Recent XP activity feed
- [ ] Next challenges to complete
- [ ] Breakthrough progress per domain
- [ ] (Parent view shows currently selected child's dashboard)

### 3.4 Domain & Challenge Browsing
- [ ] Domain detail page with categories
- [ ] Category view with challenges
- [ ] Challenge detail page:
  - Demo video/image player
  - Description & instructions
  - XP value display
  - "Required for [Rank]" badge based on athlete's division
  - Submit button

### 3.4 Challenge Submission
- [ ] Video/image upload to Vercel Blob
- [ ] Submission form with notes
- [ ] Pending/approved/rejected status display
- [ ] XP awarded on approval

### 3.5 Progress Tracking
- [ ] XP history by domain
- [ ] Completed challenges list
- [ ] Breakthrough requirements checklist
- [ ] "Banked XP" indicator when awaiting breakthrough

---

## Phase 4: Admin Interface (MVP)

### 4.1 Domain & Category Management
- [ ] CRUD for domains (name, icon, color, description)
- [ ] CRUD for categories per domain
- [ ] Drag-and-drop reordering

### 4.2 Challenge Management
- [ ] CRUD for challenges
- [ ] Demo video/image upload
- [ ] Rich text description editor
- [ ] XP value and difficulty settings

### 4.3 Division Configuration
- [ ] Create age/gender divisions
- [ ] Set age ranges
- [ ] Activate/deactivate divisions

### 4.4 Rank Requirement Matrix (Rubric Editor)
- [ ] Visual matrix: Challenges × Divisions × Ranks
- [ ] Toggle which challenges are required for which rank in each division
- [ ] Set bonus XP per division
- [ ] Configure "N of M" thresholds per category

### 4.5 Submission Review
- [ ] Queue of pending submissions
- [ ] Video/image viewer
- [ ] Approve/reject with notes
- [ ] Bulk actions

---

## Phase 5: Polish & Enhancement

- [ ] Level-up animations (Framer Motion)
- [ ] Breakthrough unlock celebrations
- [ ] Progress notifications
- [ ] Mobile-responsive design
- [ ] Dark mode
- [ ] PWA support

---

## Phase 6: Future Features

- [ ] Coach/gym admin roles with verification workflow
- [ ] Gym integrations (APIs)
- [ ] Competition/event management & XP integration
- [ ] Leaderboards (opt-in by division)
- [ ] Social profiles & following
- [ ] Team challenges
- [ ] Training program suggestions
- [ ] Mobile app (React Native) or enhanced PWA

---

## Immediate Next Steps

### 🎯 WHAT'S NEXT
The following items are the highest priority for immediate work:

1. **Class & Coaching System** (Phase 11) – IN PROGRESS
   - ✅ Schema migration for Class, ClassCoach, ClassMember, ClassJoinRequest, ClassBenchmark, ClassGrade
   - ✅ Class CRUD API endpoints (`/api/classes`, `/api/classes/[id]`)
   - ✅ Join request flow (request → approve/deny)
   - ✅ Coach dashboard (`/coach`) with class list
   - ✅ Create class form (`/coach/classes/new`)
   - ✅ Class detail page (`/classes/[id]`) with benchmarks and progress
   - ✅ Member management (`/coach/classes/[id]/members`) - add/remove athletes
   - ✅ Athlete search for adding members
   - ✅ Join request queue for coaches with approve/deny
   - ✅ Benchmark management (`/coach/classes/[id]/benchmarks`)
   - ✅ Quick grade UI (`/coach/classes/[id]/grade`) - batch mode with previous submission history
   - ✅ Grade edit capability
   - ✅ Parent view: browse classes, request to join (with athlete selection dropdown)
   - ✅ Athlete view: "My Classes" section on dashboard
   - ✅ XP integration: grades create ChallengeSubmission records with tier-based XP
   - ✅ CLASS_GRADE notification type for new grades
   - ✅ Parent notifications: parents see notifications for all managed athletes
   - ✅ Progress page links to challenges (with athlete switch for parents)
   - ✅ Dashboard recent submissions link to challenges
   - ✅ Leave class functionality (self-removal for athletes/parents)
   - ✅ Coach athlete detail page (`/coach/classes/[id]/athletes/[athleteId]`)
   - ✅ Notification improvements: bulk delete, individual delete (supports parent accounts)
   - ✅ Privacy: class submissions hidden from public feeds (isPublic: false by default)
   - [ ] Custom challenge creation form (1 per class limit)
   - [ ] Admin moderation: view coach-created challenges

2. **Community Feed & Social System** (Phase 9) – COMPLETED
   - ✅ Schema migration for social models (Follow, Reaction, Comment, Notification)
   - ✅ Username field on Athlete model
   - ✅ Feed utility functions (`src/lib/feed.ts`)
   - ✅ Notification utility functions (`src/lib/notifications.ts`)
   - ✅ Feed API endpoint (`/api/feed`)
   - ✅ Notifications API endpoints (`/api/notifications`, `/api/notifications/[id]`)
   - ✅ Follow API endpoint (`/api/athletes/[username]/follow`)
   - ✅ Reactions API endpoint (`/api/submissions/[id]/reactions`)
   - ✅ Comments API endpoints (`/api/submissions/[id]/comments`)
   - ✅ Feed page with tabs (`/feed`)
   - ✅ Feed card component with reactions
   - ✅ Comments component with nested replies
   - ✅ Follow button component
   - ✅ Notification bell in header
   - ✅ Athlete profile page (`/athletes/[username]`)
   - ✅ Athlete search page (`/athletes/search`)
   - ✅ Added Feed to main navigation
   - ✅ Followers/Following lists on profile
   - ✅ Full notifications page (`/notifications`)
   - ✅ Parent consent for sharing child activity (COPPA compliance)

3. **Progress notifications** (Phase 8) – Toast/banner when earning XP or leveling up
4. **Dark mode polish** (Phase 8) – Ensure all components work well in dark mode
5. **PWA support** (Phase 8) – Add to home screen, offline caching

### ✅ COMPLETED - Phase 1: Project Setup
1. ✅ **Scaffold the project** – Next.js 16 + Prisma 7 + Tailwind v4 + shadcn
2. ✅ **Set up Neon database** – Connected via Prisma
3. ✅ **Configure Clerk** – Auth working + webhook for user sync
4. ✅ **Run initial migration** – Database schema live

### ✅ COMPLETED - Phase 2: Authentication & Onboarding
1. ✅ **Sign up / Sign in with Clerk** – Working auth flow
2. ✅ **Account type selection** – "I'm an athlete" vs "I'm a parent"
3. ✅ **Athlete onboarding** – DOB, gender, display name, avatar, disciplines
4. ✅ **Parent onboarding** – Add multiple children with profiles
5. ✅ **Parent "also compete" option** – Parents can create their own athlete profile
6. ✅ **Auto-assign division** – Based on age/gender
7. ✅ **Gym owner onboarding** – Separate flow for gym registration

### ✅ COMPLETED - Phase 3: Admin Backend
1. ✅ **Admin layout & navigation** – Sidebar with all admin sections
2. ✅ **Domain CRUD** – Full management (Strength, Skill, Endurance, Speed)
3. ✅ **Category CRUD** – Categories per domain with icons
4. ✅ **Division CRUD** – Age/gender divisions with ranges
5. ✅ **Discipline CRUD** – Sports/activities (Ninja, Calisthenics, etc.)
6. ✅ **Equipment CRUD** – Master equipment list with icons/images
7. ✅ **Equipment Packages** – "Standard Ninja Gym", "Standard Gym" quick-add bundles
8. ✅ **Challenge CRUD** – Full challenge management with:
   - ✅ AI-generated descriptions & instructions
   - ✅ AI-suggested XP distribution
   - ✅ AI-generated grade matrix (with web search for running benchmarks)
   - ✅ Similar challenge search (duplicate prevention)
   - ✅ Multi-domain XP distribution (primary/secondary/tertiary)
   - ✅ Video upload & YouTube/Vimeo embed support
   - ✅ Image upload with cropping
   - ✅ Grading types (Pass/Fail, Reps, Time, Distance, Timed Reps)
   - ✅ Time format support (seconds, mm:ss, hh:mm:ss)
   - ✅ Grade matrix by division & rank
   - ✅ Equipment requirements
   - ✅ Discipline tagging
   - ✅ Gym-specific challenges
   - ✅ Form validation with inline error display
9. ✅ **Gym CRUD** – Full gym management with:
   - ✅ Google Places integration (search & auto-fill address)
   - ✅ Logo upload with cropping
   - ✅ Equipment selection with packages
   - ✅ Discipline associations
   - ✅ Contact info & social links
   - ✅ Form validation & completion progress
10. ✅ **User Management** – Admin can edit users:
    - ✅ View all users with role badges
    - ✅ Edit role, account type
    - ✅ View/manage athlete profiles & managed children
    - ✅ Avatar upload
11. ✅ **Database Seed Script** – `npm run db:seed` populates:
    - ✅ 4 Domains (Strength, Skill, Endurance, Speed)
    - ✅ 22 Categories across domains
    - ✅ 18 Divisions (Kids 5-7 through Masters 60+, M/F)
    - ✅ 16 Disciplines (Ninja, Calisthenics, Sprint, Marathon, etc.)
    - ✅ 23 Equipment items

### 🔨 NEXT UP - Phase 4: Athlete Experience

**Priority 1: Dashboard Enhancement**
1. ✅ **Dashboard shows real data** – Fetches actual domain levels from DB
   - ✅ Fetch actual domain levels from DB
   - ✅ Calculate Prime level from domains
   - ✅ Show real XP progress per domain (with correct XP thresholds)
   - ✅ Recent activity feed (XP transactions & submissions)
   - ✅ Quick action links

**Priority 2: Challenge Browsing**
2. ✅ **Domain browsing page** – `/domains` - View all 4 domains with progress
3. ✅ **Domain detail page** – `/domains/[slug]` - Categories within domain with completion %
4. ✅ **Category detail page** – `/domains/[slug]/[category]` - Challenges in category
5. ✅ **Challenge detail page** – `/challenges/[slug]`
   - ✅ Demo video/image player (VideoDisplay component)
   - ✅ Description & instructions
   - ✅ XP value & domain distribution
   - ✅ "Required for [Rank]" badge based on athlete's division
   - ✅ Equipment needed
   - ✅ Combined XP Rewards card (tier targets + domain distribution in one place)
   - ✅ Submit button (sticky at bottom)
6. ✅ **Challenge browse page** – `/challenges` - All challenges with advanced browsing:
   - ✅ Unified list sorted by: For You → Explore → Completed
   - ✅ Pagination (12 per page with page numbers)
   - ✅ Search by name/description
   - ✅ Stats cards (total, for you, completed)
   - ✅ Filtering by discipline and gym

**Priority 3: Challenge Submission**
7. ✅ **Submission form** – `/challenges/[slug]/submit` - Video upload for proof
8. ✅ **Submission API** – `/api/submissions` - Create/update submissions
9. ✅ **My submissions page** – `/submissions` - View pending/approved/rejected
10. ✅ **XP calculation on approval** – Tier-based XP awards with multi-domain distribution

**Priority 4: Admin Review**
11. ✅ **Submission review queue** – `/admin/submissions`
    - ✅ List pending submissions with filters
    - ✅ Video/image viewer
    - ✅ Approve/reject with notes
    - ✅ Auto-approve for coaches/admins

### ✅ COMPLETED - Phase 5: Parent Features
11. ✅ **Athlete switcher** – Dropdown to switch between managed children (header + mobile menu)
12. ✅ **Add child flow** – `/settings/children` - Add more children after onboarding
13. ✅ **Submit on behalf** – Parents submit for their children (uses active athlete)
14. ✅ **Per-child dashboard** – View each child's progress (athlete switcher changes context)
15. ✅ **Settings pages** – Accessible via Clerk UserButton menu:
    - ✅ Profile editing (`/settings/profile`) - display name, DOB, gender, avatar with 1:1 crop, disciplines
    - ✅ Unsaved changes indicator with scroll-to-save
    - ✅ Avatar syncs to Clerk profile
    - ✅ Children management (`/settings/children`) - add/edit/remove managed athletes
    - ✅ Connections placeholder (`/settings/connections`) for future Strava/Garmin
16. ✅ **Challenge division restrictions** – Challenges can be limited to specific age divisions:
    - ✅ Admin can select allowed divisions per challenge
    - ✅ Grading table auto-filters to selected divisions
    - ✅ Challenge listings filter by athlete's division
    - ✅ Challenge detail shows restriction warning if not allowed

### 🔨 ON HOLD BUT MOSTLY COMPLETE - Phase 6: Gym Features
16. [x] **Gym dashboard** – `/gym/[slug]` - Public gym page
    - ✅ Shows gym logo, name, address, description
    - ✅ Displays owner (privacy-respecting - only if isPublicProfile)
    - ✅ Lists disciplines and equipment
    - ✅ Shows public member count and list (privacy-first)
    - ✅ Contact info (website, phone, email)
    - ✅ Shows matching challenges count with samples
    - ✅ "View all challenges" link to filtered `/challenges?gym=slug`
17. [x] **Gym membership** – Join/leave gyms with privacy controls
    - ✅ `isPublicProfile` on Athlete (COPPA-compliant for minors)
    - ✅ `isPublicMember` on GymMember (per-gym visibility toggle)
    - ✅ POST/DELETE/PATCH `/api/gyms/[slug]/membership`
    - ✅ Join/Leave button with confirmation dialog
    - ✅ Toggle to show/hide self on gym's public member list
18. [x] **Gym discovery** – `/gyms` - Find gyms page
    - ✅ Search by name or location
    - ✅ Filter by discipline
    - ✅ Shows member count, verified badge
    - ✅ CTA for gym owners to register
    - ✅ Added to main navigation (bottom nav + header)
    - ✅ Dashboard shows "My Gyms" section
19. [x] **Gym-based challenge filtering** – `/challenges?gym=slug`
    - ✅ Challenges page accepts gym query parameter
    - ✅ Filters by gym's disciplines
    - ✅ Shows gym filter banner with clear option
    - ✅ Challenge count displayed
20. [x] **Gym member management** – `/gym/[slug]/members`
    - ✅ Owner/manager can view ALL members (including private ones)
    - ✅ Role management (MEMBER → COACH → MANAGER)
    - ✅ Remove members with confirmation dialog
    - ✅ Role permissions explained in UI
    - ✅ "Manage" button on gym page Community card (only for owner/manager)
    - ✅ API: PATCH/DELETE `/api/gyms/[slug]/members/[memberId]`
21. [x] **Gym-specific challenges** – Challenges only for gym members (private to gym)
    - ✅ Challenges with `gymId` set are exclusive to that gym's members
    - ✅ Challenges page shows gym-specific challenges only to members
    - ✅ Challenge detail page blocks non-members with friendly message
    - ✅ Gym page shows exclusive challenge count and badges
    - ✅ Non-members see "Join to access X exclusive challenges" prompt
    - ✅ Lock icon badge on exclusive challenges in listings
22. [x] **Equipment-based challenge filtering** – Show challenges gym can support
    - ✅ When filtering by gym, only show challenges where gym has all required equipment
    - ✅ Challenges with no equipment requirements always shown
    - ✅ Banner shows equipment filter status and count of hidden challenges
    - ✅ "Show all" toggle to disable equipment filter
    - ✅ URL parameter `?equipment=false` to show all challenges regardless of equipment
23. [x] **Coach invite system** – Gym owners invite coaches via link
    - [x] Generate unique invite link (`/invite/[token]`)
    - [x] Link contains: gym ID, role (COACH/MEMBER/MANAGER), expiration
    - [x] Copy-to-clipboard button in gym management UI
    - [x] When clicked: sign in (if account exists) or create account
    - [x] After auth: auto-join gym with specified role
    - [x] Invite tokens expire after configurable days (1-30)
    - [x] Owner can revoke/regenerate invite links
    - [x] Schema: `GymInvite` + `GymInviteUsage` models with token, gymId, role, expiresAt, maxUses, useCount
    - [x] Invite management page at `/gym/[slug]/invites`
    - [x] Public redemption page at `/invite/[token]`

### ✅ COMPLETED - Phase 7: Fitness App Integrations (Strava/Garmin)
For running, cycling, and outdoor endurance challenges, athletes can link their fitness accounts to submit verified activities.

**Admin: Challenge Form Updates**
21. [x] **Proof type selector** – Challenge can accept: Video, Image, Strava, Garmin, Manual
22. [x] **Activity validation rules** – For Strava/Garmin challenges:
    - [x] Activity type filter (Run, Ride, Swim, Hike, etc.)
    - [x] Distance range (min/max in km/miles)
    - [x] Elevation gain minimum (for hill/mountain challenges)
    - [ ] Pace requirements (optional) - not implemented yet
    - [ ] Heart rate requirements (optional) - not implemented yet
    - [x] Must be outdoor/GPS (requiresGPS flag)
23. [x] **Update challenge form UI** – "Activity Requirements" section for Strava/Garmin-enabled challenges

**Athlete: Account Linking**
24. [x] **Strava OAuth flow** – Connect/disconnect Strava account
    - [x] Store `stravaAccessToken`, `stravaRefreshToken`, `stravaAthleteId` on User
    - [x] Token refresh logic (`src/lib/strava.ts`)
25. [ ] **Garmin OAuth flow** – Connect/disconnect Garmin account (PENDING APPROVAL)
    - [ ] Apply for Garmin Connect Developer Program (submitted Jan 2026, ~2 day approval)
    - [ ] Receive Consumer Key and Consumer Secret after approval
    - [ ] Create `src/lib/garmin.ts` - Token management, activity fetching
    - [ ] OAuth callback route: `GET /api/auth/garmin/callback`
    - [ ] Connect endpoint: `GET /api/auth/garmin` (redirects to Garmin OAuth)
    - [ ] Disconnect endpoint: `DELETE /api/auth/garmin`
    - [ ] Store `garminAccessToken`, `garminRefreshToken`, `garminUserId` on User (schema ready)
    - [ ] Activity API: Fetch activities (supports FIT, GPX, TCX formats)
    - [ ] Webhook setup for push notifications (Garmin prefers push over polling)
    - [ ] `GarminActivityPicker` component (mirror of StravaActivityPicker)
    - [ ] Update `/settings/connections` with Garmin connect/disconnect button
26. [x] **Settings page** – `/settings/connections` - Manage linked accounts with Strava connect/disconnect

**Garmin Connect API Details** (for implementation after approval):
- **OAuth 2.0 flow**: Similar to Strava but uses Garmin's authorization server
- **Activity API endpoints**:
  - `GET /wellness-api/rest/activities` - List activities
  - `GET /wellness-api/rest/activityDetails` - Activity details with GPS data
  - Activity types: running, cycling, swimming, hiking, etc.
- **Webhook (Push) Architecture** (recommended by Garmin):
  - Register webhook URL with Garmin
  - Receive real-time activity notifications
  - Endpoint: `POST /api/webhooks/garmin`
  - Events: activity created, updated, deleted
- **Environment Variables Needed**:
  ```
  GARMIN_CONSUMER_KEY=
  GARMIN_CONSUMER_SECRET=
  GARMIN_WEBHOOK_SECRET=  # For webhook signature validation
  ```

**Athlete: Activity-Based Submission**
26. [x] **Activity picker component** – `StravaActivityPicker` component
    - [x] Filter by type, date range
    - [x] Show distance, time, elevation, date
    - [x] Validate against challenge requirements
    - [x] Route map display with `StravaRouteMap` component
27. [x] **Submit from activity** – Select activity → auto-populate achievedValue
28. [x] **Store activity proof** – Save Strava activity ID, URL, cached metrics
29. [x] **Auto-approve Strava submissions** – Verified data = high trust (coach/admin auto-approve)

**Schema Changes** ✅ All implemented via migration `add_strava_garmin_integration`

### 📋 Phase 8: Polish & Enhancement
- ✅ Rank names (F=Foundation, E=Explorer, D=Disciplined, C=Challenger, B=Breakthrough, A=Apex, S=Supreme)
- ✅ Mobile-responsive refinements (challenges page, tier targets)
- ✅ Level-up animations (Framer Motion)
  - ✅ `LevelUpCelebration` component with confetti, odometer effect
  - ✅ Shows old level → pause → odometer transition to new level
  - ✅ Rank name display (Foundation, Explorer, etc.)
  - ✅ XP gained badge
- ✅ Tier achievement celebrations
  - ✅ `TierAchievement` component for challenge completion
  - ✅ XP breakdown by domain
  - ✅ Clear "Challenge performance tier" labeling
- ✅ Animated progress components
  - ✅ `AnimatedNumber` - Odometer-style number transitions
  - ✅ `AnimatedProgress` - Progress bar with surge/glow effects
  - ✅ `AnimatedLevel` - Rank letter + sublevel with roll animation
  - ✅ `AnimatedDomainCard` - Dashboard cards with animations
- ✅ `CelebrationProvider` - Queue multiple celebrations (tier → level ups)
- [ ] Progress notifications (toast/banner when earning XP)
- [ ] Dark mode polish
- [ ] PWA support

### ✅ COMPLETED - Phase 9: Community Feed & Social System
The homepage feed experience where athletes see activity from the community.

**Feed Types (Tabs):**
| Tab | Content |
|-----|---------|
| Community | All public activity on the site |
| Following | Activity from people you follow |
| Gym | Activity from members of your gyms |
| Division | Activity from athletes in your same division |

**Feed Content Types:**
- ✅ Challenge completions (primary content)
- ✅ Level-ups ("John just hit C-rank in Strength!")
- ❌ Gym joins (tabled for future if requested)
- ❌ New challenges unlocked (not included)
- ✅ Comments & reactions on completions

**Feed Card Design:**
```
┌─────────────────────────────────────────┐
│ [Avatar] @username  [Rank Badge: C3]    │
│ "completed a challenge"      2 hours ago│
├─────────────────────────────────────────┤
│ Challenge Name                          │
│ [Video Thumbnail - tap to play]         │
│                                         │
│ 🏆 B-Tier Result! +150 XP               │
│ Leveled up: Skill D9 → E0!              │
├─────────────────────────────────────────┤
│ 🔥 12  💪 8  👏 24   💬 5 comments      │
└─────────────────────────────────────────┘
```

- Shows username (not full name), avatar, rank badge
- Video thumbnail - tap to play
- Challenge name, tier achieved, XP earned
- Level-up callout if applicable
- Reaction counts + comment count
- Minimalistic, follows site design patterns

**Following System:**
- Follow button on user profiles and feed cards
- Instant follow (no approval required)
- Search for users by username
- View followers / following lists on profile
- Unfollow from profile or following list

**User Profiles (`/athletes/[username]`):**
- Public profile based on privacy settings
- Shows: avatar, username, rank/level in all domains, Prime level
- Recent activity feed (their completions)
- Achievements/milestones
- Gym memberships (if public)
- Follow/Unfollow button
- Follower/Following counts

**Reactions:**
| Emoji | Meaning |
|-------|---------|
| 🔥 | Fire (impressive!) |
| 💪 | Strong |
| 👏 | Clap (encouragement) |
| 🎯 | Bullseye (nailed it) |
| ⚡ | Lightning (fast/speed) |

- One-tap to react (can use multiple)
- See who reacted (tap reaction count)
- Can like other people's comments too

**Comments:**
- Flat comments with nested replies (max depth 3)
- Max length: 2000 characters
- Delete your own comments
- Admins can delete any comment
- Report feature for inappropriate comments
- Oldest-first by default

**Privacy & Activity Settings:**
- Athletes can set default visibility: "Show All" / "Don't Show" / "Followers Only"
- Per-submission override available
- Minors: COPPA-compliant (stricter defaults, parental control)
- Existing `isPublic` on submissions applies to feed

**Notifications:**
- When someone follows you
- When someone reacts to your completion
- When someone comments on your completion
- When you level up (including from training runs)
- When someone replies to your comment
- Notification panel in header (bell icon)
- `src/lib/notifications.ts` utility for creating notifications

**Feed Behavior:**
- Infinite scroll
- Pull-to-refresh
- Chronological order (newest first)
- Shows at least a few days of history
- Skeleton loading states

**Schema Additions Needed:**
```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String   // The athlete doing the following
  followingId String   // The athlete being followed
  createdAt   DateTime @default(now())
  
  follower    Athlete  @relation("Followers", ...)
  following   Athlete  @relation("Following", ...)
  
  @@unique([followerId, followingId])
}

model Reaction {
  id           String   @id @default(cuid())
  athleteId    String
  submissionId String?  // Reaction on a submission
  commentId    String?  // Reaction on a comment
  emoji        String   // 🔥 💪 👏 🎯 ⚡
  createdAt    DateTime @default(now())
  
  @@unique([athleteId, submissionId, emoji])
  @@unique([athleteId, commentId, emoji])
}

model Comment {
  id           String   @id @default(cuid())
  athleteId    String
  submissionId String
  parentId     String?  // For nested replies
  content      String   @db.Text
  depth        Int      @default(0)  // 0, 1, 2 (max 3 levels)
  isDeleted    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  replies      Comment[] @relation("CommentReplies")
  parent       Comment?  @relation("CommentReplies", ...)
}

model CommentReport {
  id          String   @id @default(cuid())
  commentId   String
  reporterId  String   // Athlete who reported
  reason      String
  status      ReportStatus @default(PENDING)
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())
}

model Notification {
  id          String   @id @default(cuid())
  athleteId   String   // Who receives the notification
  type        NotificationType
  title       String
  body        String?
  linkUrl     String?  // Where to go when clicked
  isRead      Boolean  @default(false)
  metadata    Json?    // Extra data (actorId, submissionId, etc.)
  createdAt   DateTime @default(now())
}

enum NotificationType {
  FOLLOW
  REACTION
  COMMENT
  COMMENT_REPLY
  LEVEL_UP
  TRAINING_SYNC
}

enum ReportStatus {
  PENDING
  REVIEWED
  DISMISSED
  ACTION_TAKEN
}

// Add to Athlete model:
model Athlete {
  // ... existing fields
  username           String   @unique  // For @mentions and URLs
  feedVisibility     FeedVisibility @default(PUBLIC)
  // ... relations
  followers          Follow[] @relation("Following")
  following          Follow[] @relation("Followers")
  reactions          Reaction[]
  comments           Comment[]
  notifications      Notification[]
}

enum FeedVisibility {
  PUBLIC        // Everyone can see
  FOLLOWERS     // Only followers
  PRIVATE       // Don't show in feeds
}
```

**Implementation Tasks:**
- [ ] Add `username` field to Athlete (unique, URL-safe)
- [ ] Create Follow model and API (`POST/DELETE /api/athletes/[username]/follow`)
- [ ] Create Reaction model and API (`POST/DELETE /api/submissions/[id]/reactions`)
- [ ] Create Comment model and API (`POST/DELETE /api/submissions/[id]/comments`)
- [ ] Create CommentReport model and API
- [ ] Create Notification model and `src/lib/notifications.ts`
- [ ] Feed page `/feed` with tab navigation
- [ ] Feed API endpoints per tab type
- [ ] Feed card component with video thumbnail, reactions, comments
- [ ] User profile page `/athletes/[username]`
- [ ] User search (`/api/athletes/search?q=...`)
- [ ] Notification panel component (bell icon dropdown)
- [ ] Notification badge (unread count)
- [ ] Privacy settings in `/settings/privacy`
- [ ] Comment reporting flow and admin review

**Stretch Goals:**
- [ ] Share to external social (Twitter, Instagram, etc.)
- [ ] @mentions in comments
- [ ] Push notifications (PWA)
- [ ] Coach verification workflow
- [ ] Leaderboards (opt-in by division)
- [ ] Competition/event integration
- [ ] Social profiles & following
- [ ] Team challenges
- [ ] Training program suggestions
- [ ] Mobile app (React Native) or enhanced PWA

### 📋 Phase 10: Training XP System (Strava/Garmin Auto-Sync)
Automatic XP from synced training activities. See `docs/training-xp-system.md` for full specification.

**Goal:** Athletes earn Endurance/Speed XP from regular training (runs, rides, swims) synced from Strava/Garmin.

**Strava Webhook Integration:**
- Strava allows ONE webhook subscription per app
- Webhook endpoint: `POST /api/webhooks/strava`
- Events: activity `create`, `update`, `delete` + athlete `deauthorize`

**Webhook Payload Example:**
```json
{
  "aspect_type": "create",
  "event_time": 1516126040,
  "object_id": 1360128428,      // Activity ID
  "object_type": "activity",
  "owner_id": 134815,           // Strava athlete ID
  "subscription_id": 120475,
  "updates": {}
}
```

**Webhook Setup Flow:**
1. `POST https://www.strava.com/api/v3/push_subscriptions` with client_id, client_secret, callback_url, verify_token
2. Strava sends GET to callback_url with `hub.challenge` - must respond with `{"hub.challenge": "..."}`
3. Subscription created - Strava sends POSTs for all athlete events

**Implementation Tasks:**
- [ ] Create `TrainingActivity` model (distance, elevation, activityType, hrZones, xpAwarded)
- [ ] Webhook endpoint: validate signature, queue activity processing
- [ ] Activity processor: fetch full activity from Strava API, calculate XP
- [ ] XP formula: `Base XP = (distance_km × 2) + (elevation_m × 0.05)` × multipliers
- [ ] Multipliers: terrain (flat/rolling/hilly/mountain), effort (HR zones), activity type
- [ ] Daily cap: 50 XP, Weekly cap: 250-450 XP (based on volume)
- [ ] Weekly bonuses: volume bonus + active day bonus
- [ ] Anti-cheat: pace sanity checks, GPS required, duplicate detection
- [ ] Domain assignment: Running >5km → 80% Endurance / 20% Speed, etc.
- [ ] Breakthrough challenges: 5K, 10K, Half Marathon, Marathon gates for rank-ups
- [ ] Activity review dashboard for admins (GPS map, pace/HR graphs, flag suspicious)
- [ ] Push notification when activity syncs: "🏃 10K run synced! +28 XP Endurance"

**Environment Variables Needed:**
```
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_WEBHOOK_VERIFY_TOKEN=    # Random string for webhook validation
```

**API Endpoints:**
- `GET /api/webhooks/strava` - Webhook validation (respond with hub.challenge)
- `POST /api/webhooks/strava` - Receive activity events
- `GET /api/strava/subscription` - Check current subscription status
- `POST /api/strava/subscription` - Create webhook subscription (admin only)
- `DELETE /api/strava/subscription` - Delete webhook subscription (admin only)

### 📋 Phase 11: Class & Coaching System
Coaches can create classes, add athletes, assign benchmarks, and track progress with quick grading.

**Core Concepts:**

| Concept | Description |
|---------|-------------|
| **Class** | A group of athletes managed by one or more coaches |
| **Benchmark** | A curated list of challenges the class is working on |
| **Quick Grade** | Coach enters results directly, auto-approved |

**Class Structure:**
- **Name**: e.g., "Tuesday Ninja Kids", "Adult Competitive Team", "Marathon Training Group"
- **Gym association**: Optional (running coaches may not have a gym)
- **Schedule**: Meeting time/day (informational, stored as text)
- **Duration**: Ongoing - athletes stay enrolled until removed
- **Multiple coaches**: Classes can have multiple coaches (co-teaching)

**Who Can Create Classes:**
- Gym owners/managers (for their gym)
- Coaches at a gym (for their gym)
- System admins (any class)
- Future: Verified independent coaches (no gym affiliation)

**Class Membership:**
- **Coaches can add anyone** - Coaches can add any athlete directly (no approval needed)
- **Parents request to join** - Parents/athletes request to join, coach approves
- **Self-removal allowed** - Athletes/parents can remove themselves from any class
- Class rosters are **private** (members can't see each other - COPPA compliance)
- Athletes can be in multiple classes
- Notification sent when added to a class or request approved

**Benchmarks & Events:**
Benchmarks are the challenges a class is working on:
1. **Curated from existing challenges** - Pick from the global challenge library
2. **Gym-specific challenges** - Create new challenges via full challenge form (same as admin)

**Challenge Ownership & Scope:**
| Scope | Created By | Visible To | XP | Moderation |
|-------|------------|------------|-----|------------|
| **Global** | System Admin | Everyone | Standard tiers | Pre-approved |
| **Class-specific** | Coach (for a class) | Class members only | Standard tiers | Admin can review |

- Class-specific challenges use the **same XP tier system** as global challenges
- **Limit: 1 custom challenge per class** - Prevents XP gaming, keeps it focused
- Classes can use unlimited global challenges as benchmarks
- Admin panel shows all coach-created challenges for moderation
- Admin can promote class challenges to global, or flag/disable problematic ones
- `Challenge.scope` field: `GLOBAL` or `CLASS`
- `Challenge.createdByClassId` - which class created it (if scope=CLASS)

**Grading System:**
- **Quick Grade UI** - Coach enters stats directly during class
- **Two modes**: Batch grading (all athletes at once) OR select athlete then grade
- **Auto-approve** - Coach input is trusted, no review queue
- **Creates ChallengeSubmission** - Grades create submission records (shows in athlete history)
- **Grade updates allowed** - Coaches can edit grades if mistakes were made
- Results feed into athlete's XP and domain progress
- Progress history tracked via SubmissionHistory (see improvement over time)

**Athlete Search (for adding to class):**
- Search by **display name** or **username**
- Works for adults and children
- Shows athlete's gym memberships (if any) for context

**Class Discovery:**
- Classes are **publicly discoverable** (anyone can browse)
- Listing shows: class name, coach name(s), gym (if any), schedule
- Full details visible only to members and coaches

**Privacy & Visibility:**
- Class progress is **separate from public feed** (not shown in community feed)
- Coaches see their students' full profiles and all completed challenges
- Parents see only their own child's class progress
- Athletes see their own class progress and benchmarks
- **Stretch goal**: Opt-in class leaderboard for members

**URL Structure:**
```
/classes                    # Browse/search classes (for parents to find)
/classes/[id]               # Class detail (join request, benchmarks)
/classes/[id]/roster        # Coach view: manage members
/classes/[id]/benchmarks    # Coach view: manage benchmarks
/classes/[id]/grade         # Coach view: quick grade interface
/coach                      # Coach dashboard: my classes
/coach/classes/new          # Create new class
```

**Athlete Experience:**
- "My Classes" section on dashboard
- View assigned benchmarks and progress
- See their own grades/results

**Schema Additions:**
```prisma
model Class {
  id          String   @id @default(cuid())
  name        String
  description String?
  schedule    String?  // e.g., "Tuesdays 5-6pm"
  
  // Optional gym association
  gymId       String?
  gym         Gym?     @relation(fields: [gymId], references: [id])
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  coaches     ClassCoach[]
  members     ClassMember[]
  benchmarks  ClassBenchmark[]
}

model ClassCoach {
  id        String   @id @default(cuid())
  classId   String
  userId    String   // The coach's User record
  role      ClassCoachRole @default(COACH)
  createdAt DateTime @default(now())
  
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([classId, userId])
}

enum ClassCoachRole {
  COACH       // Full access
  ASSISTANT   // Future: limited permissions
}

model ClassMember {
  id        String   @id @default(cuid())
  classId   String
  athleteId String
  addedById String   // User who added them (coach or parent)
  status    ClassMemberStatus @default(ACTIVE)
  joinedAt  DateTime @default(now())
  leftAt    DateTime?
  
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  athlete   Athlete  @relation(fields: [athleteId], references: [id])
  
  @@unique([classId, athleteId])
}

enum ClassMemberStatus {
  ACTIVE
  REMOVED    // Removed by coach
  LEFT       // Self-removed or parent removed
}

model ClassJoinRequest {
  id          String   @id @default(cuid())
  classId     String
  athleteId   String
  requestedById String  // User who requested (parent or adult athlete)
  status      JoinRequestStatus @default(PENDING)
  note        String?  // Optional message from requester
  reviewedById String? // Coach who approved/denied
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())
  
  class       Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  athlete     Athlete  @relation(fields: [athleteId], references: [id])
  requestedBy User     @relation("JoinRequester", fields: [requestedById], references: [id])
  reviewedBy  User?    @relation("JoinReviewer", fields: [reviewedById], references: [id])
  
  @@unique([classId, athleteId])  // One pending request per athlete per class
}

enum JoinRequestStatus {
  PENDING
  APPROVED
  DENIED
}

model ClassBenchmark {
  id          String   @id @default(cuid())
  classId     String
  challengeId String   // Always links to a Challenge (global or gym-specific)
  
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  class       Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  challenge   Challenge @relation(fields: [challengeId], references: [id])
  grades      ClassGrade[]
}

model ClassGrade {
  id           String   @id @default(cuid())
  benchmarkId  String
  athleteId    String
  gradedById   String   // Coach who graded
  submissionId String?  // Links to ChallengeSubmission created
  
  // Result (cached for quick display, source of truth is submission)
  achievedValue Float?   // Reps, time, distance
  passed        Boolean? // For pass/fail
  achievedTier  String?  // F, E, D, C, B, A, S
  notes         String?
  
  gradedAt      DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  benchmark     ClassBenchmark     @relation(fields: [benchmarkId], references: [id], onDelete: Cascade)
  athlete       Athlete            @relation(fields: [athleteId], references: [id])
  gradedBy      User               @relation(fields: [gradedById], references: [id])
  submission    ChallengeSubmission? @relation(fields: [submissionId], references: [id])
  
  @@unique([benchmarkId, athleteId])  // One grade per athlete per benchmark
}

// Add to Challenge model:
model Challenge {
  // ... existing fields
  scope            ChallengeScope @default(GLOBAL)
  createdByClassId String?        // If scope=CLASS, which class created it
  
  classBenchmarks  ClassBenchmark[]
  createdByClass   Class?         @relation("ClassChallenges", fields: [createdByClassId], references: [id])
}

enum ChallengeScope {
  GLOBAL    // Admin-created, visible to everyone
  CLASS     // Coach-created for a class, visible only to class members
}

// Add to Class model:
model Class {
  // ... existing fields
  createdChallenges Challenge[] @relation("ClassChallenges")  // Max 1 per class
}

// Add to User model:
model User {
  // ... existing fields
  coachedClasses  ClassCoach[]
  classGrades     ClassGrade[]  // Grades given by this user
  joinRequestsMade    ClassJoinRequest[] @relation("JoinRequester")
  joinRequestsReviewed ClassJoinRequest[] @relation("JoinReviewer")
}

// Add to Athlete model:
model Athlete {
  // ... existing fields
  classMembers    ClassMember[]
  classGrades     ClassGrade[]
  joinRequests    ClassJoinRequest[]
}

// Add to Gym model:
model Gym {
  // ... existing fields
  classes         Class[]
}

// Add to ChallengeSubmission model:
model ChallengeSubmission {
  // ... existing fields
  classGrade      ClassGrade?  // If created via class grading
}
```

**API Endpoints:**
- `GET /api/classes` - List classes (with filters for gym, coach, search)
- `POST /api/classes` - Create a class
- `GET /api/classes/[id]` - Get class details
- `PATCH /api/classes/[id]` - Update class
- `DELETE /api/classes/[id]` - Archive/delete class
- `GET /api/classes/[id]/members` - List members (coach only)
- `POST /api/classes/[id]/members` - Add member (coach adds directly)
- `DELETE /api/classes/[id]/members/[athleteId]` - Remove member (coach or self/parent)
- `POST /api/classes/[id]/join` - Request to join (parent/athlete)
- `GET /api/classes/[id]/requests` - List pending join requests (coach only)
- `POST /api/classes/[id]/requests/[id]/approve` - Approve join request
- `POST /api/classes/[id]/requests/[id]/deny` - Deny join request
- `GET /api/classes/[id]/benchmarks` - List benchmarks
- `POST /api/classes/[id]/benchmarks` - Add benchmark (existing or create new gym challenge)
- `PATCH /api/classes/[id]/benchmarks/[id]` - Update benchmark
- `DELETE /api/classes/[id]/benchmarks/[id]` - Remove benchmark
- `POST /api/classes/[id]/grade` - Quick grade (batch or single)
- `PATCH /api/classes/[id]/grades/[id]` - Update a grade
- `GET /api/classes/[id]/grades` - Get all grades for class
- `GET /api/classes/[id]/grades/[athleteId]` - Get grades for specific athlete
- `GET /api/coach/classes` - Get classes where user is a coach
- `GET /api/athlete/classes` - Get classes athlete is enrolled in
- `GET /api/athletes/search` - Search athletes by name/username (for adding to class)

**Admin Moderation:**
- `GET /api/admin/challenges?scope=GYM` - List all gym-created challenges
- `PATCH /api/admin/challenges/[id]/promote` - Promote gym challenge to global
- `PATCH /api/admin/challenges/[id]/flag` - Flag/disable problematic challenge
- Admin UI: `/admin/challenges` shows scope filter and gym source

**Implementation Tasks:**
- [ ] Add `scope`, `createdByGymId` to Challenge model
- [x] Schema migration for Class, ClassCoach, ClassMember, ClassJoinRequest, ClassBenchmark, ClassGrade
- [ ] Gym challenge limit enforcement (configurable, e.g., 10 per gym)
- [x] Class CRUD API endpoints
- [x] Join request flow (request → approve/deny)
- [x] Coach dashboard (`/coach`) with class list
- [x] Create class form (`/coach/classes/new`)
- [x] Class detail page with benchmarks
- [x] Member management (add/remove athletes)
- [x] Athlete search (by name/username) for adding members
- [x] Join request queue for coaches
- [x] Benchmark management (select existing challenges)
- [ ] Custom challenge creation form (reuse admin challenge form, 1 per class limit)
- [x] Quick grade UI - batch mode (all athletes, one benchmark)
- [x] Quick grade UI - shows previous submission history when grading
- [x] Grade edit capability
- [x] Parent view: browse classes, request to join (with athlete selection)
- [x] Athlete view: "My Classes" dashboard section
- [x] XP integration: grades create ChallengeSubmission records
- [x] Notifications: added to class, request approved, new grade (CLASS_GRADE type)
- [x] Parent notifications: parents see notifications for all managed athletes
- [x] Leave class functionality (self-removal for athletes/parents)
- [x] Coach athlete detail page (`/coach/classes/[id]/athletes/[athleteId]`)
- [x] Notification improvements: bulk delete, individual delete (supports parent accounts)
- [x] Privacy: class submissions hidden from public feeds (isPublic: false by default)
- [ ] Admin moderation: view coach-created challenges
- [ ] Admin: promote class challenges to global
- [ ] Admin: flag/disable problematic class challenges

**Stretch Goals:**
- [ ] Class leaderboard (opt-in per class)
- [ ] Class notifications (new benchmark, grade posted)
- [ ] Class schedule integration (calendar view)
- [ ] Attendance tracking
- [ ] Progress reports (PDF export for parents)
- [ ] Assistant coach role with limited permissions

---

## Key Admin UI Components (Completed)

### ✅ Challenge Editor (Completed)
Full-featured challenge form with:
- AI content generation (description, instructions)
- AI XP distribution suggestions
- Similar challenge search (duplicate prevention)
- Multi-domain XP sliders (primary/secondary/tertiary)
- Category selection (many-to-many)
- Discipline tagging
- Equipment requirements
- Gym restriction option
- Grading type selector (Pass/Fail, Reps, Time, Distance, Timed Reps)
- **Grade Matrix** - Inline table to set targets per division per rank
- Auto-fill helper for grade progression
- Video upload with compression OR YouTube/Vimeo embed
- Image upload with cropping

### ✅ Gym Editor (Completed)
Full-featured gym form with:
- Google Places search & auto-fill
- Logo upload with cropping
- Equipment packages (quick-add bundles)
- Individual equipment selection
- Discipline associations
- Contact info & validation
- Completion progress tracker

### ✅ Equipment Packages (Completed)
Quick-add bundles for common gym setups:
- Admin can create packages (e.g., "Standard Ninja Gym")
- Each package has a list of equipment with quantities
- Gyms can click to add all equipment from a package

---

## Open Questions (RESOLVED)

### 1. XP System - Tier-Based Awards
**Answer**: Fixed XP per tier, claimable once per challenge

**Tier XP Awards** (awarded when achieving each tier):
| Tier | XP Awarded |
|------|------------|
| F | 25 |
| E | 50 |
| D | 75 |
| C | 100 |
| B | 150 |
| A | 200 |
| S | 300 |

**XP Required Per Sublevel** (to advance within a rank):
| Rank | XP per Sublevel | Total for Rank |
|------|-----------------|----------------|
| F | 100 | 1,000 (F0→E0) |
| E | 200 | 2,000 (E0→D0) |
| D | 400 | 4,000 (D0→C0) |
| C | 800 | 8,000 (C0→B0) |
| B | 1,600 | 16,000 (B0→A0) |
| A | 3,200 | 32,000 (A0→S0) |
| S | 6,400 | 64,000 (S0→S9) |

**Key mechanics:**
- Challenges are **graded** with tier targets per division (e.g., "10 pullups = D-tier for Adult Male")
- Athlete achieves a tier based on performance, earns XP for that tier + all lower unclaimed tiers
- Each tier can only award XP **once per challenge** (tracked via `claimedTiers`)
- Encourages improvement: athlete who gets D-tier first, then later achieves B-tier, gets C+B XP on second submission
- XP is distributed across domains based on challenge's primary/secondary/tertiary percentages

**Implementation:**
- `src/lib/xp.ts` - All XP constants and calculation functions
- `ChallengeSubmission.claimedTiers` - Comma-separated list of claimed tiers
- `ChallengeSubmission.achievedTier` - Current highest tier achieved

### 2. Breakthrough rules
**Answer**: Configurable via admin interface
- N of M formula set per category per rank per division
- Flexible enough to adjust as the system evolves

### 3. Submission Review
**Answer**: All submissions require review, UNLESS submitted by privileged users
- Athletes/parents: submissions go to PENDING, require review
- Coaches/Gym Admins/System Admins: auto-approved (trusted submitters)
- Adds `autoApprove` logic based on submitter's role

### 4. Prime Calculation
**Answer**: Numeric average system
- Each letter rank has a numeric base: F=0-9, E=10-19, D=20-29, C=30-39, B=40-49, A=50-59, S=60-69
- Full level value = base + sublevel (e.g., C7 = 30 + 7 = 37)
- Prime = average of all 4 domain numeric values
- Prime letter/sublevel derived from that average
- Example: Strength=C7(37), Skill=D3(23), Endurance=B2(42), Speed=E5(15) → Average=29.25 → Prime=D9

### 5. Resubmissions
**Answer**: Unlimited resubmissions allowed
- New submission replaces previous (keeps history for audit)
- Status resets to PENDING (or auto-approved for privileged users)

### 6. App Name
**Answer**: "Ascendant" is final

### 7. Seed Data
**Answer**: No pre-seeding, fully configurable from scratch
- Admins create domains, categories, divisions, challenges
- More flexible for different use cases

### 8. Multi-Domain XP for Challenges
**Answer**: Challenges can award XP to up to 3 domains
- **Primary domain**: Required, explicitly set (50-100% of XP)
- **Secondary domain**: Optional, 0-50% of base XP
- **Tertiary domain**: Optional, 0-30% of base XP
- Percentages must sum to 100%
- Example: Salmon Ladder (100 XP) → Skill 50%, Strength 40%, Speed 10% = 50+40+10 XP across 3 domains
- On completion, athlete receives separate XP transactions for each domain

### 9. Challenge-Category Relationship
**Answer**: Many-to-many
- A challenge can appear in multiple categories (e.g., Salmon Ladder in "Swinging", "Grip Strength", "Climbing")
- Categories are for **browsing/organization**, not XP distribution
- XP domains are set explicitly on the challenge, independent of categories
- Athletes browsing any linked category will see the challenge

### 10. Disciplines (Sports/Activities)
**Answer**: Separate concept from domains/categories
- Disciplines = sports/activities (Ninja, Calisthenics, Parkour, CrossFit, Sprinting, etc.)
- Challenges can belong to multiple disciplines (many-to-many)
- Used for **filtering**: "Show me all Ninja challenges" or "Show me Calisthenics challenges"
- Admin-configurable list
- Example: Salmon Ladder → Disciplines: [Ninja, Calisthenics]
