/**
 * Prisma Seed Script
 * 
 * Run with: npm run db:seed
 * 
 * Seeds the database with essential data:
 * - 4 Domains (Strength, Skill, Endurance, Speed)
 * - Categories for each domain
 * - Standard divisions (age/gender)
 * - Common disciplines
 * - Basic equipment
 */

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// =============================================================================
// SEED DATA
// =============================================================================

const DOMAINS = [
  {
    name: "Strength",
    slug: "strength",
    description: "Force production, load capacity, and work capacity. Lifting, carrying, pushing, pulling.",
    icon: "💪",
    color: "#ef4444", // Red
    sortOrder: 0,
  },
  {
    name: "Skill",
    slug: "skill",
    description: "Coordination, control, precision, and technique. Ninja, parkour, gymnastics movements.",
    icon: "🎯",
    color: "#8b5cf6", // Purple
    sortOrder: 1,
  },
  {
    name: "Endurance",
    slug: "endurance",
    description: "Long-duration effort and stamina. Running, rowing, sustained work capacity.",
    icon: "🏃",
    color: "#22c55e", // Green
    sortOrder: 2,
  },
  {
    name: "Speed",
    slug: "speed",
    description: "Acceleration, sprinting, and fast power output. Explosive movements.",
    icon: "⚡",
    color: "#f59e0b", // Amber
    sortOrder: 3,
  },
];

const CATEGORIES_BY_DOMAIN: Record<string, { name: string; description: string; icon: string }[]> = {
  "Strength": [
    { name: "Upper Body Push", description: "Pushing movements: push-ups, dips, overhead press", icon: "🫸" },
    { name: "Upper Body Pull", description: "Pulling movements: pull-ups, rows, climbing", icon: "🧗" },
    { name: "Lower Body", description: "Squats, lunges, leg press, jumping", icon: "🦵" },
    { name: "Core", description: "Planks, hollow holds, anti-rotation, trunk stability", icon: "🎯" },
    { name: "Grip", description: "Hanging, pinch grip, dead hangs, farmer carries", icon: "✊" },
    { name: "Loaded Carries", description: "Farmer walks, sandbag carries, weighted marches", icon: "🏋️" },
  ],
  "Skill": [
    { name: "Balance", description: "Static and dynamic balance, beam work, single-leg stability", icon: "⚖️" },
    { name: "Swinging", description: "Laches, swing transfers, bar-to-bar movement", icon: "🦧" },
    { name: "Climbing", description: "Wall climbing, rope climbing, peg boards", icon: "🧗" },
    { name: "Vaulting", description: "Box jumps, kong vaults, speed vaults", icon: "🤸" },
    { name: "Precision", description: "Precision jumps, landing accuracy, foot placement", icon: "🎯" },
    { name: "Upper Body Skills", description: "Handstands, muscle-ups, ring work", icon: "🤸" },
    { name: "Traversing", description: "Monkey bars, traversing walls, horizontal movement", icon: "🐒" },
  ],
  "Endurance": [
    { name: "Running", description: "Distance running, trail running, timed runs", icon: "🏃" },
    { name: "Rowing", description: "Ergometer rowing, water rowing", icon: "🚣" },
    { name: "Cycling", description: "Stationary and road cycling endurance", icon: "🚴" },
    { name: "Mixed Modal", description: "Circuit work, AMRAP, sustained varied effort", icon: "🔄" },
    { name: "Swimming", description: "Lap swimming, open water distance", icon: "🏊" },
  ],
  "Speed": [
    { name: "Sprint", description: "Short distance max effort running", icon: "💨" },
    { name: "Agility", description: "Direction changes, ladder drills, cone work", icon: "🔀" },
    { name: "Reaction", description: "Reaction time, quick starts, response drills", icon: "⚡" },
    { name: "Power", description: "Explosive jumps, throws, rapid force production", icon: "💥" },
  ],
};

const DIVISIONS = [
  // Kids divisions
  { name: "Kids Male 5-7", gender: "male", ageMin: 5, ageMax: 7, sortOrder: 0 },
  { name: "Kids Female 5-7", gender: "female", ageMin: 5, ageMax: 7, sortOrder: 1 },
  { name: "Kids Male 8-10", gender: "male", ageMin: 8, ageMax: 10, sortOrder: 2 },
  { name: "Kids Female 8-10", gender: "female", ageMin: 8, ageMax: 10, sortOrder: 3 },
  // Youth divisions
  { name: "Youth Male 11-13", gender: "male", ageMin: 11, ageMax: 13, sortOrder: 4 },
  { name: "Youth Female 11-13", gender: "female", ageMin: 11, ageMax: 13, sortOrder: 5 },
  // Teen divisions
  { name: "Teen Male 14-17", gender: "male", ageMin: 14, ageMax: 17, sortOrder: 6 },
  { name: "Teen Female 14-17", gender: "female", ageMin: 14, ageMax: 17, sortOrder: 7 },
  // Young Adult divisions
  { name: "Young Adult Male 18-20", gender: "male", ageMin: 18, ageMax: 20, sortOrder: 8 },
  { name: "Young Adult Female 18-20", gender: "female", ageMin: 18, ageMax: 20, sortOrder: 9 },
  // Adult divisions
  { name: "Adult Male 21-39", gender: "male", ageMin: 21, ageMax: 39, sortOrder: 10 },
  { name: "Adult Female 21-39", gender: "female", ageMin: 21, ageMax: 39, sortOrder: 11 },
  // Masters divisions
  { name: "Masters Male 40-49", gender: "male", ageMin: 40, ageMax: 49, sortOrder: 12 },
  { name: "Masters Female 40-49", gender: "female", ageMin: 40, ageMax: 49, sortOrder: 13 },
  { name: "Masters Male 50-59", gender: "male", ageMin: 50, ageMax: 59, sortOrder: 14 },
  { name: "Masters Female 50-59", gender: "female", ageMin: 50, ageMax: 59, sortOrder: 15 },
  { name: "Masters Male 60+", gender: "male", ageMin: 60, ageMax: null, sortOrder: 16 },
  { name: "Masters Female 60+", gender: "female", ageMin: 60, ageMax: null, sortOrder: 17 },
];

const DISCIPLINES = [
  { name: "Ninja", icon: "🥷", color: "#ef4444", description: "Obstacle course training, American Ninja Warrior style" },
  { name: "Calisthenics", icon: "🤸", color: "#8b5cf6", description: "Bodyweight strength and skill training" },
  { name: "Parkour", icon: "🏃", color: "#22c55e", description: "Movement art, efficient locomotion through environments" },
  { name: "CrossFit", icon: "🏋️", color: "#f97316", description: "Constantly varied functional movements at high intensity" },
  { name: "Gymnastics", icon: "🤸", color: "#ec4899", description: "Artistic and rhythmic gymnastics training" },
  { name: "Rock Climbing", icon: "🧗", color: "#6366f1", description: "Indoor and outdoor climbing, bouldering" },
  { name: "Sprinting", icon: "💨", color: "#fbbf24", description: "Short distance max effort running: 100m, 200m, 400m" },
  { name: "Middle Distance", icon: "🏃", color: "#14b8a6", description: "800m to mile distance running" },
  { name: "Distance Running", icon: "🏃", color: "#06b6d4", description: "5K to 10K running" },
  { name: "Marathon", icon: "🏅", color: "#0ea5e9", description: "Half marathon and full marathon running" },
  { name: "Ultra Running", icon: "🏔️", color: "#84cc16", description: "Ultra marathons: 50K, 100K, 100 mile events" },
  { name: "Trail Running", icon: "🌲", color: "#22c55e", description: "Off-road and trail running" },
  { name: "OCR", icon: "🏅", color: "#a855f7", description: "Obstacle Course Racing: Spartan, Tough Mudder, etc." },
  { name: "Weightlifting", icon: "🏋️", color: "#dc2626", description: "Olympic and powerlifting movements" },
  { name: "Functional Fitness", icon: "💪", color: "#0ea5e9", description: "General physical preparedness and fitness" },
  { name: "Swimming", icon: "🏊", color: "#0284c7", description: "Pool and open water swimming" },
  { name: "Cycling", icon: "🚴", color: "#eab308", description: "Road cycling, mountain biking, indoor cycling" },
  { name: "Rowing", icon: "🚣", color: "#64748b", description: "Ergometer and water rowing" },
  { name: "Triathlon", icon: "🏊", color: "#7c3aed", description: "Swim, bike, run multi-sport events" },
];

const EQUIPMENT = [
  // Grip/Hanging
  { name: "Pull-up Bar", icon: "➖", description: "Standard pull-up bar for hanging and pulling movements" },
  { name: "Salmon Ladder", icon: "🐟", description: "Vertical ladder requiring explosive pulls" },
  { name: "Lache Bars", icon: "🦧", description: "Bars for swing-release-catch movements" },
  { name: "Rings", icon: "⭕", description: "Gymnastics rings for upper body work" },
  { name: "Pegboard", icon: "📍", description: "Board with peg holes for climbing" },
  { name: "Rope", icon: "🪢", description: "Climbing rope" },
  { name: "Cannonball Grips", icon: "⚫", description: "Spherical grip holds" },
  // Balance
  { name: "Balance Beam", icon: "➖", description: "Narrow beam for balance training" },
  { name: "Slack Line", icon: "〰️", description: "Tension line for dynamic balance" },
  // Climbing
  { name: "Warped Wall", icon: "🏔️", description: "Curved wall for running climb" },
  { name: "Cargo Net", icon: "🕸️", description: "Rope net for climbing" },
  { name: "Rock Wall", icon: "🧗", description: "Indoor climbing wall with holds" },
  // Jumping
  { name: "Plyo Box", icon: "📦", description: "Box for plyometric jumps" },
  { name: "Vault Box", icon: "📦", description: "Padded box for vaulting" },
  // Strength
  { name: "Barbell", icon: "🏋️", description: "Olympic barbell" },
  { name: "Dumbbells", icon: "🏋️", description: "Free weight dumbbells" },
  { name: "Kettlebell", icon: "🔔", description: "Cast iron kettlebell" },
  { name: "Medicine Ball", icon: "⚽", description: "Weighted ball for throws" },
  { name: "Sandbag", icon: "💰", description: "Sand-filled bag for carries and lifts" },
  // Cardio
  { name: "Rower", icon: "🚣", description: "Rowing ergometer" },
  { name: "Ski Erg", icon: "⛷️", description: "Skiing ergometer" },
  { name: "Assault Bike", icon: "🚴", description: "Air resistance bike" },
  { name: "Treadmill", icon: "🏃", description: "Running treadmill" },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedDomains() {
  console.log("📦 Seeding domains...");
  
  for (const domain of DOMAINS) {
    await prisma.domain.upsert({
      where: { slug: domain.slug },
      update: domain,
      create: domain,
    });
  }
  
  console.log(`   ✓ ${DOMAINS.length} domains`);
}

async function seedCategories() {
  console.log("📁 Seeding categories...");
  
  let count = 0;
  for (const [domainName, categories] of Object.entries(CATEGORIES_BY_DOMAIN)) {
    const domain = await prisma.domain.findFirst({ where: { name: domainName } });
    if (!domain) {
      console.warn(`   ⚠️ Domain "${domainName}" not found, skipping categories`);
      continue;
    }
    
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      await prisma.category.upsert({
        where: { 
          domainId_slug: {
            domainId: domain.id,
            slug,
          }
        },
        update: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          sortOrder: i,
        },
        create: {
          name: cat.name,
          slug,
          description: cat.description,
          icon: cat.icon,
          domainId: domain.id,
          sortOrder: i,
        },
      });
      count++;
    }
  }
  
  console.log(`   ✓ ${count} categories`);
}

async function seedDivisions() {
  console.log("👥 Seeding divisions...");
  
  for (const division of DIVISIONS) {
    const slug = division.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    await prisma.division.upsert({
      where: { slug },
      update: division,
      create: {
        ...division,
        slug,
      },
    });
  }
  
  console.log(`   ✓ ${DIVISIONS.length} divisions`);
}

async function seedDisciplines() {
  console.log("🏅 Seeding disciplines...");
  
  for (let i = 0; i < DISCIPLINES.length; i++) {
    const disc = DISCIPLINES[i];
    const slug = disc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    await prisma.discipline.upsert({
      where: { slug },
      update: {
        ...disc,
        sortOrder: i,
      },
      create: {
        ...disc,
        slug,
        sortOrder: i,
      },
    });
  }
  
  console.log(`   ✓ ${DISCIPLINES.length} disciplines`);
}

async function seedEquipment() {
  console.log("🛠️ Seeding equipment...");
  
  for (let i = 0; i < EQUIPMENT.length; i++) {
    const eq = EQUIPMENT[i];
    const slug = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    await prisma.equipment.upsert({
      where: { slug },
      update: {
        ...eq,
        sortOrder: i,
      },
      create: {
        ...eq,
        slug,
        sortOrder: i,
      },
    });
  }
  
  console.log(`   ✓ ${EQUIPMENT.length} equipment items`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("🌱 Starting Ascendant seed...\n");

  await seedDomains();
  await seedCategories();
  await seedDivisions();
  await seedDisciplines();
  await seedEquipment();

  console.log("\n✅ Seed completed successfully!");
  console.log("   You can now log in and start creating challenges.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
