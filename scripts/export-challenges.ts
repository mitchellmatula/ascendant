import { config } from "dotenv";
config(); // Load .env file

import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const challenges = await db.challenge.findMany({
    include: {
      categories: { include: { category: true } },
      disciplines: { include: { discipline: true } },
      equipment: { include: { equipment: true } },
      grades: { include: { division: true } },
      allowedDivisions: { include: { division: true } },
      primaryDomain: true,
      secondaryDomain: true,
      tertiaryDomain: true,
    },
  });
  
  // Create a simplified export format
  const exportData = challenges.map(c => ({
    name: c.name,
    slug: c.slug,
    description: c.description,
    instructions: c.instructions,
    demoVideoUrl: c.demoVideoUrl,
    demoImageUrl: c.demoImageUrl,
    gradingType: c.gradingType,
    gradingUnit: c.gradingUnit,
    timeFormat: c.timeFormat,
    minRank: c.minRank,
    maxRank: c.maxRank,
    proofTypes: c.proofTypes,
    activityType: c.activityType,
    minDistance: c.minDistance,
    maxDistance: c.maxDistance,
    minElevationGain: c.minElevationGain,
    requiresGPS: c.requiresGPS,
    requiresHeartRate: c.requiresHeartRate,
    primaryDomain: c.primaryDomain?.slug,
    primaryXPPercent: c.primaryXPPercent,
    secondaryDomain: c.secondaryDomain?.slug,
    secondaryXPPercent: c.secondaryXPPercent,
    tertiaryDomain: c.tertiaryDomain?.slug,
    tertiaryXPPercent: c.tertiaryXPPercent,
    categories: c.categories.map(cc => cc.category.slug),
    disciplines: c.disciplines.map(cd => cd.discipline.slug),
    equipment: c.equipment.map(ce => ({
      slug: ce.equipment.slug,
      isRequired: ce.isRequired,
      notes: ce.notes,
    })),
    allowedDivisions: c.allowedDivisions.map(ad => ad.division.slug),
    grades: c.grades.map(g => ({
      divisionSlug: g.division.slug,
      rank: g.rank,
      targetValue: g.targetValue,
      description: g.description,
      bonusXP: g.bonusXP,
    })),
  }));
  
  // Write to file
  fs.writeFileSync(
    "scripts/challenges-export.json",
    JSON.stringify(exportData, null, 2)
  );
  
  console.log(`Exported ${challenges.length} challenges to scripts/challenges-export.json`);
  
  // Also print summary
  challenges.forEach(c => {
    console.log(`- ${c.name} (${c.gradingType}, ${c.grades.length} grades)`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
