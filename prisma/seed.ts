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

// Default breakthrough rules: tier required and challenge count per rank transition
const BREAKTHROUGH_RULES = [
  { fromRank: "F", toRank: "E", tierRequired: "E", challengeCount: 3 },
  { fromRank: "E", toRank: "D", tierRequired: "D", challengeCount: 5 },
  { fromRank: "D", toRank: "C", tierRequired: "C", challengeCount: 7 },
  { fromRank: "C", toRank: "B", tierRequired: "B", challengeCount: 10 },
  { fromRank: "B", toRank: "A", tierRequired: "A", challengeCount: 12 },
  { fromRank: "A", toRank: "S", tierRequired: "S", challengeCount: 15 },
];

// Challenges to seed (exported from the database)
const CHALLENGES = [
  {
    name: "5K Time Trial",
    slug: "5k-time-trial",
    description: "The '5k Time Trial' challenge tests your endurance and pacing strategies as you aim to complete a 5-kilometer run as quickly as possible. This challenge is designed to push your cardiovascular limits and improve your overall running performance.",
    instructions: "To complete the challenge, find a flat, measured course or track, and time yourself as you run the full 5 kilometers. Aim to maintain a steady pace and record your time to track your progress.",
    demoImageUrl: "https://ylwisvzq9rnsswjn.public.blob.vercel-storage.com/images/1768498460045-images-kYPI69PjzcOwBHIR8xqVx8ZUzXMfyy.jpg",
    gradingType: "TIME",
    gradingUnit: "time (mm:ss)",
    timeFormat: "mm:ss",
    minRank: "F",
    maxRank: "S",
    proofTypes: ["STRAVA", "GARMIN"],
    minDistance: 5000,
    maxDistance: 5200,
    minElevationGain: 0,
    requiresGPS: true,
    requiresHeartRate: true,
    primaryDomain: "endurance",
    primaryXPPercent: 90,
    secondaryDomain: "speed",
    secondaryXPPercent: 10,
    categories: ["running"],
    disciplines: ["functional-fitness", "middle-distance", "sprinting", "running"],
    // Grade targets per division (time in seconds - lower is better)
    // Based on running.fit 5K reference data:
    // F = Beginner + 3min buffer, E = Beginner, D = Novice, C = Intermediate, B = Advanced, A = Elite, S = WR pace
    grades: {
      // Youth Male 11-13 (age 10 reference: Beginner 37:39, Novice 31:29, Int 26:56, Adv 23:35, Elite 21:07, WR 15:22)
      "youth-male-11-13": { F: 2439, E: 2259, D: 1889, C: 1616, B: 1415, A: 1267, S: 922 },
      // Youth Female 11-13 (age 10 reference: Beginner 41:29, Novice 35:16, Int 30:33, Adv 27:00, Elite 24:20, WR 17:15)
      "youth-female-11-13": { F: 2669, E: 2489, D: 2116, C: 1833, B: 1620, A: 1460, S: 1035 },
      // Teen Male 14-17 (age 15 reference: Beginner 32:35, Novice 27:14, Int 23:19, Adv 20:25, Elite 18:17, WR 13:18)
      "teen-male-14-17": { F: 2135, E: 1955, D: 1634, C: 1399, B: 1225, A: 1097, S: 798 },
      // Teen Female 14-17 (age 15 reference: Beginner 37:14, Novice 31:40, Int 27:26, Adv 24:14, Elite 21:50, WR 15:29)
      "teen-female-14-17": { F: 2414, E: 2234, D: 1900, C: 1646, B: 1454, A: 1310, S: 929 },
      // Young Adult Male 18-20 (age 20 reference: Beginner 31:29, Novice 26:19, Int 22:31, Adv 19:44, Elite 17:40, WR 12:51)
      "young-adult-male-18-20": { F: 2069, E: 1889, D: 1579, C: 1351, B: 1184, A: 1060, S: 771 },
      // Young Adult Female 18-20 (age 20 reference: Beginner 35:27, Novice 30:08, Int 26:07, Adv 23:04, Elite 20:47, WR 14:44)
      "young-adult-female-18-20": { F: 2307, E: 2127, D: 1808, C: 1567, B: 1384, A: 1247, S: 884 },
      // Adult Male 21-39 (age 25-30 reference: Beginner 31:29, Novice 26:19, Int 22:31, Adv 19:44, Elite 17:40, WR 12:51)
      "adult-male-21-39": { F: 2069, E: 1889, D: 1579, C: 1351, B: 1184, A: 1060, S: 771 },
      // Adult Female 21-39 (age 25-30 reference: Beginner 35:27, Novice 30:08, Int 26:07, Adv 23:04, Elite 20:47, WR 14:44)
      "adult-female-21-39": { F: 2307, E: 2127, D: 1808, C: 1567, B: 1384, A: 1247, S: 884 },
      // Masters Male 40-49 (age 40-45 avg: Beginner ~33:47, Novice ~28:15, Int ~24:10, Adv ~21:10, Elite ~18:57, WR ~13:47)
      "masters-male-40-49": { F: 2207, E: 2027, D: 1695, C: 1450, B: 1270, A: 1137, S: 827 },
      // Masters Female 40-49 (age 40-45 avg: Beginner ~37:04, Novice ~31:31, Int ~27:18, Adv ~24:07, Elite ~21:44, WR ~15:24)
      "masters-female-40-49": { F: 2404, E: 2224, D: 1891, C: 1638, B: 1447, A: 1304, S: 924 },
      // Masters Male 50-59 (age 50-55 avg: Beginner ~36:31, Novice ~30:32, Int ~26:08, Adv ~22:53, Elite ~20:30, WR ~14:55)
      "masters-male-50-59": { F: 2371, E: 2191, D: 1832, C: 1568, B: 1373, A: 1230, S: 895 },
      // Masters Female 50-59 (age 50-55 avg: Beginner ~40:47, Novice ~34:41, Int ~30:03, Adv ~26:33, Elite ~23:56, WR ~16:57)
      "masters-female-50-59": { F: 2627, E: 2447, D: 2081, C: 1803, B: 1593, A: 1436, S: 1017 },
      // Masters Male 60+ (age 60-65 avg: Beginner ~39:45, Novice ~33:15, Int ~28:27, Adv ~24:55, Elite ~22:18, WR ~16:13)
      "masters-male-60": { F: 2565, E: 2385, D: 1995, C: 1707, B: 1495, A: 1338, S: 973 },
      // Masters Female 60+ (age 60-65 avg: Beginner ~45:56, Novice ~39:04, Int ~33:50, Adv ~29:54, Elite ~26:57, WR ~19:06)
      "masters-female-60": { F: 2936, E: 2756, D: 2344, C: 2030, B: 1794, A: 1617, S: 1146 },
    },
  },
  {
    name: "3K Time Trial",
    slug: "3k-time-trial",
    description: "The 3K Time Trial is a test of your endurance and speed, challenging you to complete a 3-kilometer run as quickly as possible. This challenge evaluates your cardiovascular fitness and overall stamina.",
    instructions: "Warm up with dynamic stretches, then start the timer and run the 3 kilometers on a flat, measured course. Aim to maintain a steady pace, and record your time when you cross the finish line.",
    demoImageUrl: "https://ylwisvzq9rnsswjn.public.blob.vercel-storage.com/images/1768413647153-images-NLTxuDh8RxBXozlgfTEJHBYJ52AJlp.jpg",
    gradingType: "TIME",
    gradingUnit: "time (mm:ss)",
    timeFormat: "mm:ss",
    minRank: "F",
    maxRank: "S",
    proofTypes: ["STRAVA", "GARMIN"],
    minDistance: 3000,
    maxDistance: 3200,
    minElevationGain: 0,
    requiresGPS: true,
    requiresHeartRate: true,
    primaryDomain: "endurance",
    primaryXPPercent: 80,
    secondaryDomain: "speed",
    secondaryXPPercent: 20,
    categories: ["sprint", "running"],
    disciplines: ["middle-distance", "running", "distance-running"],
    // Grade targets per division (time in seconds - lower is better)
    grades: {
      "youth-male-11-13": { F: 1080, E: 900, D: 780, C: 690, B: 570, A: 480, S: 440 },
      "youth-female-11-13": { F: 1080, E: 900, D: 780, C: 690, B: 570, A: 480, S: 440 },
      "teen-male-14-17": { F: 900, E: 750, D: 660, C: 570, B: 480, A: 420, S: 380 },
      "teen-female-14-17": { F: 900, E: 750, D: 660, C: 570, B: 480, A: 420, S: 380 },
      "young-adult-male-18-20": { F: 750, E: 630, D: 540, C: 450, B: 390, A: 330, S: 290 },
      "young-adult-female-18-20": { F: 750, E: 630, D: 540, C: 450, B: 390, A: 330, S: 290 },
      "adult-male-21-39": { F: 720, E: 600, D: 510, C: 420, B: 360, A: 300, S: 260 },
      "adult-female-21-39": { F: 720, E: 600, D: 510, C: 420, B: 360, A: 300, S: 260 },
      "masters-male-40-49": { F: 780, E: 660, D: 570, C: 480, B: 420, A: 360, S: 320 },
      "masters-female-40-49": { F: 840, E: 720, D: 630, C: 540, B: 480, A: 420, S: 380 },
      "masters-male-50-59": { F: 840, E: 720, D: 630, C: 540, B: 480, A: 420, S: 380 },
      "masters-female-50-59": { F: 900, E: 780, D: 690, C: 600, B: 540, A: 480, S: 440 },
      "masters-male-60": { F: 960, E: 840, D: 750, C: 660, B: 600, A: 540, S: 500 },
      "masters-female-60": { F: 1020, E: 900, D: 810, C: 720, B: 660, A: 600, S: 560 },
    },
  },
  {
    name: "Strict Pull-ups",
    slug: "strict-pullups",
    description: "The Strict Pull-ups challenge tests upper body strength and control by requiring you to lift your body weight from a hanging position to a complete chin-over-bar position without using momentum. This exercise is fundamental for developing the pulling strength necessary for advanced ninja warrior obstacles.",
    instructions: "Begin in a dead hang with your hands shoulder-width apart, palms facing away. Pull your body up until your chin clears the bar, keeping your core engaged and legs straight, then lower yourself back to the starting position with control, arms fully locked out at the bottom each time.",
    demoVideoUrl: "https://youtu.be/HRV5YKKaeVw",
    demoImageUrl: "https://img.youtube.com/vi/HRV5YKKaeVw/maxresdefault.jpg",
    gradingType: "REPS",
    gradingUnit: "reps",
    minRank: "F",
    maxRank: "S",
    proofTypes: ["VIDEO"],
    primaryDomain: "strength",
    primaryXPPercent: 100,
    categories: ["grip", "upper-body-pull"],
    disciplines: ["ninja", "calisthenics", "parkour", "ocr", "functional-fitness"],
    equipment: [{ slug: "pull-up-bar", isRequired: true }],
    // Grade targets per division (reps - higher is better)
    grades: {
      "kids-male-5-7": { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 8 },
      "kids-female-5-7": { F: 1, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 },
      "kids-male-8-10": { F: 1, E: 2, D: 4, C: 6, B: 8, A: 10, S: 12 },
      "kids-female-8-10": { F: 1, E: 1, D: 2, C: 4, B: 6, A: 8, S: 10 },
      "youth-male-11-13": { F: 1, E: 3, D: 5, C: 8, B: 12, A: 15, S: 20 },
      "youth-female-11-13": { F: 1, E: 2, D: 3, C: 5, B: 8, A: 10, S: 15 },
      "teen-male-14-17": { F: 1, E: 5, D: 8, C: 12, B: 16, A: 20, S: 25 },
      "teen-female-14-17": { F: 1, E: 2, D: 4, C: 6, B: 10, A: 12, S: 18 },
      "young-adult-male-18-20": { F: 1, E: 5, D: 10, C: 15, B: 20, A: 25, S: 30 },
      "young-adult-female-18-20": { F: 1, E: 2, D: 5, C: 8, B: 12, A: 15, S: 20 },
      "adult-male-21-39": { F: 1, E: 5, D: 10, C: 15, B: 20, A: 25, S: 30 },
      "adult-female-21-39": { F: 1, E: 2, D: 5, C: 8, B: 12, A: 15, S: 20 },
      "masters-male-40-49": { F: 1, E: 4, D: 8, C: 12, B: 16, A: 20, S: 25 },
      "masters-female-40-49": { F: 1, E: 2, D: 4, C: 6, B: 10, A: 12, S: 16 },
      "masters-male-50-59": { F: 1, E: 3, D: 6, C: 10, B: 14, A: 18, S: 22 },
      "masters-female-50-59": { F: 1, E: 2, D: 3, C: 5, B: 8, A: 10, S: 14 },
      "masters-male-60": { F: 1, E: 2, D: 5, C: 8, B: 12, A: 15, S: 18 },
      "masters-female-60": { F: 1, E: 1, D: 2, C: 4, B: 6, A: 8, S: 12 },
    },
  },
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

async function seedBreakthroughRules() {
  console.log("🚀 Seeding breakthrough rules...");
  
  // Get all domains
  const domains = await prisma.domain.findMany({ where: { isActive: true } });
  
  let count = 0;
  for (const domain of domains) {
    for (const rule of BREAKTHROUGH_RULES) {
      // Check if rule already exists (can't use upsert with null in unique constraint easily)
      const existing = await prisma.breakthroughRule.findFirst({
        where: {
          domainId: domain.id,
          fromRank: rule.fromRank,
          toRank: rule.toRank,
          divisionId: null,
        },
      });

      if (existing) {
        await prisma.breakthroughRule.update({
          where: { id: existing.id },
          data: {
            tierRequired: rule.tierRequired,
            challengeCount: rule.challengeCount,
            isActive: true,
          },
        });
      } else {
        await prisma.breakthroughRule.create({
          data: {
            domainId: domain.id,
            fromRank: rule.fromRank,
            toRank: rule.toRank,
            tierRequired: rule.tierRequired,
            challengeCount: rule.challengeCount,
            divisionId: null,
            isActive: true,
          },
        });
      }
      count++;
    }
  }
  
  console.log(`   ✓ ${count} breakthrough rules (${domains.length} domains × ${BREAKTHROUGH_RULES.length} transitions)`);
}

async function seedChallenges() {
  console.log("🎯 Seeding challenges...");
  
  // Pre-fetch domains, categories, disciplines, divisions, equipment
  const domains = await prisma.domain.findMany();
  const categories = await prisma.category.findMany();
  const disciplines = await prisma.discipline.findMany();
  const divisions = await prisma.division.findMany();
  const equipment = await prisma.equipment.findMany();
  
  const domainMap = new Map(domains.map(d => [d.slug, d]));
  const categoryMap = new Map(categories.map(c => [c.slug, c]));
  const disciplineMap = new Map(disciplines.map(d => [d.slug, d]));
  const divisionMap = new Map(divisions.map(d => [d.slug, d]));
  const equipmentMap = new Map(equipment.map(e => [e.slug, e]));
  
  for (const ch of CHALLENGES) {
    // Cast to allow optional properties
    const challenge_data = ch as typeof ch & {
      tertiaryDomain?: string;
      tertiaryXPPercent?: number;
      activityType?: string;
      demoVideoUrl?: string;
    };
    
    const primaryDomain = domainMap.get(challenge_data.primaryDomain);
    if (!primaryDomain) {
      console.warn(`   ⚠️ Primary domain "${challenge_data.primaryDomain}" not found for challenge "${challenge_data.name}"`);
      continue;
    }
    
    const secondaryDomain = challenge_data.secondaryDomain ? domainMap.get(challenge_data.secondaryDomain) : null;
    const tertiaryDomain = challenge_data.tertiaryDomain ? domainMap.get(challenge_data.tertiaryDomain) : null;
    
    // Upsert the challenge
    const challenge = await prisma.challenge.upsert({
      where: { slug: challenge_data.slug },
      update: {
        name: challenge_data.name,
        description: challenge_data.description,
        instructions: challenge_data.instructions,
        demoVideoUrl: challenge_data.demoVideoUrl || null,
        demoImageUrl: challenge_data.demoImageUrl || null,
        gradingType: challenge_data.gradingType as "TIME" | "REPS" | "DISTANCE" | "PASS_FAIL" | "TIMED_REPS",
        gradingUnit: challenge_data.gradingUnit || null,
        timeFormat: challenge_data.timeFormat || null,
        minRank: challenge_data.minRank,
        maxRank: challenge_data.maxRank,
        proofTypes: challenge_data.proofTypes,
        activityType: challenge_data.activityType || null,
        minDistance: challenge_data.minDistance || null,
        maxDistance: challenge_data.maxDistance || null,
        minElevationGain: challenge_data.minElevationGain || null,
        requiresGPS: challenge_data.requiresGPS || false,
        requiresHeartRate: challenge_data.requiresHeartRate || false,
        primaryDomainId: primaryDomain.id,
        primaryXPPercent: challenge_data.primaryXPPercent,
        secondaryDomainId: secondaryDomain?.id || null,
        secondaryXPPercent: challenge_data.secondaryXPPercent || null,
        tertiaryDomainId: tertiaryDomain?.id || null,
        tertiaryXPPercent: challenge_data.tertiaryXPPercent || null,
        isActive: true,
      },
      create: {
        name: challenge_data.name,
        slug: challenge_data.slug,
        description: challenge_data.description,
        instructions: challenge_data.instructions,
        demoVideoUrl: challenge_data.demoVideoUrl || null,
        demoImageUrl: challenge_data.demoImageUrl || null,
        gradingType: challenge_data.gradingType as "TIME" | "REPS" | "DISTANCE" | "PASS_FAIL" | "TIMED_REPS",
        gradingUnit: challenge_data.gradingUnit || null,
        timeFormat: challenge_data.timeFormat || null,
        minRank: challenge_data.minRank,
        maxRank: challenge_data.maxRank,
        proofTypes: challenge_data.proofTypes,
        activityType: challenge_data.activityType || null,
        minDistance: challenge_data.minDistance || null,
        maxDistance: challenge_data.maxDistance || null,
        minElevationGain: challenge_data.minElevationGain || null,
        requiresGPS: challenge_data.requiresGPS || false,
        requiresHeartRate: challenge_data.requiresHeartRate || false,
        primaryDomainId: primaryDomain.id,
        primaryXPPercent: challenge_data.primaryXPPercent,
        secondaryDomainId: secondaryDomain?.id || null,
        secondaryXPPercent: challenge_data.secondaryXPPercent || null,
        tertiaryDomainId: tertiaryDomain?.id || null,
        tertiaryXPPercent: challenge_data.tertiaryXPPercent || null,
        isActive: true,
      },
    });
    
    // Clear existing relations and recreate (simpler than diffing)
    await prisma.challengeCategory.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.challengeDiscipline.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.challengeEquipment.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.challengeGrade.deleteMany({ where: { challengeId: challenge.id } });
    
    // Add categories
    for (const catSlug of challenge_data.categories || []) {
      const cat = categoryMap.get(catSlug);
      if (cat) {
        await prisma.challengeCategory.create({
          data: { challengeId: challenge.id, categoryId: cat.id },
        });
      }
    }
    
    // Add disciplines
    for (const discSlug of challenge_data.disciplines || []) {
      const disc = disciplineMap.get(discSlug);
      if (disc) {
        await prisma.challengeDiscipline.create({
          data: { challengeId: challenge.id, disciplineId: disc.id },
        });
      }
    }
    
    // Add equipment
    for (const eq of challenge_data.equipment || []) {
      const equip = equipmentMap.get(eq.slug);
      if (equip) {
        await prisma.challengeEquipment.create({
          data: {
            challengeId: challenge.id,
            equipmentId: equip.id,
            isRequired: eq.isRequired,
            notes: (eq as { notes?: string }).notes || null,
          },
        });
      }
    }
    
    // Add grades
    for (const [divSlug, ranks] of Object.entries(challenge_data.grades || {})) {
      const div = divisionMap.get(divSlug);
      if (!div) continue;
      
      for (const [rank, targetValue] of Object.entries(ranks as Record<string, number>)) {
        await prisma.challengeGrade.create({
          data: {
            challengeId: challenge.id,
            divisionId: div.id,
            rank,
            targetValue,
          },
        });
      }
    }
    
    console.log(`   ✓ ${challenge_data.name}`);
  }
  
  console.log(`   ✓ ${CHALLENGES.length} challenges seeded`);
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
  await seedBreakthroughRules();
  await seedChallenges();

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
