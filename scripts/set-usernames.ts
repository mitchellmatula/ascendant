import { PrismaClient } from '../prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Generate a URL-safe username from display name
function generateUsername(displayName: string, existingUsernames: Set<string>): string {
  // Convert to lowercase, replace spaces with underscores, remove special chars
  let base = displayName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20); // Max 20 chars for base

  if (!base) {
    base = 'athlete';
  }

  let username = base;
  let counter = 1;

  // Ensure uniqueness
  while (existingUsernames.has(username)) {
    username = `${base}${counter}`;
    counter++;
  }

  existingUsernames.add(username);
  return username;
}

async function main() {
  console.log('Fetching athletes without usernames...');
  
  const athletes = await prisma.athlete.findMany({
    where: { username: null },
    select: { id: true, displayName: true }
  });

  if (athletes.length === 0) {
    console.log('All athletes already have usernames!');
    return;
  }

  console.log(`Found ${athletes.length} athletes without usernames`);

  // Get existing usernames to avoid collisions
  const existingUsernames = new Set(
    (await prisma.athlete.findMany({
      where: { username: { not: null } },
      select: { username: true }
    })).map(a => a.username!)
  );

  // Update each athlete
  for (const athlete of athletes) {
    const username = generateUsername(athlete.displayName, existingUsernames);
    
    await prisma.athlete.update({
      where: { id: athlete.id },
      data: { username }
    });

    console.log(`  ${athlete.displayName} → @${username}`);
  }

  console.log('\nDone! All athletes now have usernames.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
