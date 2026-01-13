# Ascendant – Creation Plan

## Tech Stack (Finalized)

| Category | Choice |
|----------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Neon Postgres |
| ORM | Prisma |
| Auth | Clerk |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Animations | Framer Motion |
| Hosting | Vercel |
| Storage | Vercel Blob |
| Charts | TBD (Recharts or Tremor) |

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
| Rank | Numeric Range | Example |
|------|---------------|---------|
| F | 0-9 | F7 = 7 |
| E | 10-19 | E3 = 13 |
| D | 20-29 | D5 = 25 |
| C | 30-39 | C7 = 37 |
| B | 40-49 | B2 = 42 |
| A | 50-59 | A0 = 50 |
| S | 60-69 | S9 = 69 |

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

### ✅ COMPLETED
1. **Scaffold the project** – Next.js 16 + Prisma 7 + Tailwind v4 + shadcn
2. **Set up Neon database** – Connected via Prisma
3. **Configure Clerk** – Auth working + webhook for user sync
4. **Run initial migration** – Database schema live (`prisma db push`)
5. **Basic auth flow** – Sign-in, sign-up, onboarding (account type + profile creation)
6. **Dashboard page** – Shows domains, Prime level, XP progress

### 🔨 IN PROGRESS / NEXT UP

**Priority 1: Admin Backend (Required before athletes can use the app)**
Without domains, categories, and challenges configured, athletes see an empty dashboard.

1. [ ] **Admin layout & navigation** – Sidebar with admin sections
2. [ ] **Domain CRUD** – Create/edit/delete the 4 domains (Strength, Skill, Endurance, Speed)
3. [ ] **Category CRUD** – Create categories under each domain
4. [ ] **Division CRUD** – Age/gender divisions
5. [ ] **Challenge CRUD** – Create challenges with demo media
6. [ ] **XP Threshold config** – Set XP required per rank/sublevel
7. [ ] **Rank Requirement Matrix** – Set which challenges are required for which rank per division

**Priority 2: Complete Athlete Experience**
8. [ ] **Domain browsing** – View domains → categories → challenges
9. [ ] **Challenge detail page** – View demo, see requirements, submit completion
10. [ ] **Challenge submission** – Video/image upload via Vercel Blob
11. [ ] **Submission review queue** – Admin/coach can approve/reject

**Priority 3: Parent Features**
12. [ ] **Athlete switcher** – Parents can switch between children
13. [ ] **Add child flow** – Parents can add more children after onboarding
14. [ ] **Submit on behalf** – Parents submit for their children

### 📋 REMAINING PHASES

**Phase 4: Admin Interface (MVP)**
- [ ] Domain & Category Management
- [ ] Challenge Management with media upload
- [ ] Division Configuration
- [ ] Rank Requirement Matrix Editor
- [ ] Submission Review Queue

**Phase 5: Polish**
- [ ] Level-up animations (Framer Motion)
- [ ] Mobile-responsive design
- [ ] PWA support

**Phase 6: Future**
- [ ] Coach/gym admin roles
- [ ] Competition integration
- [ ] Leaderboards
- [ ] Social features

---

## Key Admin UI Components Needed

### Rubric Matrix Editor
The most complex UI piece. Needs to show:
```
                    | Youth 8-10 | Youth 11-13 | Adult M | Adult F |
-----------------------------------------------------------------
SKILL DOMAIN
  Balance Category
    Challenge A     |    F       |     E       |   D     |    D    |
    Challenge B     |    E       |     D       |   C     |    C    |
  Climbing Category
    Challenge C     |    D       |     C       |   B     |    B    |
```

Features:
- Click cell to set required rank (or "not required")
- Filter by domain/category
- Bulk operations
- Import/export for backup

### Challenge Editor
- Rich form with media upload
- Preview of demo video/image
- Category assignment (dropdown filtered by domain)
- Rank requirement quick-set per division

---

## Open Questions (RESOLVED)

### 1. XP per sublevel
**Answer**: Configurable per rank, per domain
- Each domain can have different XP thresholds
- Admin UI will allow setting XP required for each sublevel transition
- Allows fine-tuning difficulty per domain (e.g., Skill might be harder than Endurance)

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
