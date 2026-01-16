import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) throw new Error("POSTGRES_URL not set");

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const users = await db.user.findMany({
    select: { id: true, email: true, role: true, clerkId: true },
  });
  console.log("Users:", JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
