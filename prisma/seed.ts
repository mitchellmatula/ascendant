/**
 * Prisma Seed Script
 * 
 * Run with: npm run db:seed
 * 
 * This file is intentionally minimal - Ascendant is designed to be
 * fully configurable from scratch via the admin interface.
 */

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Ascendant is designed to be configured from scratch via admin UI
  // No default data is seeded - admins create domains, categories, 
  // challenges, and divisions as needed

  console.log("✅ Seed completed (no default data - configure via admin UI)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
