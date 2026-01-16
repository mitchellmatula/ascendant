import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const challenge = await db.challenge.findUnique({
    where: { slug: "5k-time-trial" },
    include: {
      grades: {
        where: { division: { slug: "masters-male-40-49" } },
        orderBy: { targetValue: "desc" },
      },
    },
  });

  console.log("5K grades for Masters Male 40-49 (TIME - lower is better):");
  for (const g of challenge?.grades || []) {
    const mins = Math.floor(g.targetValue / 60);
    const secs = (g.targetValue % 60).toString().padStart(2, "0");
    console.log(`  ${g.rank} = ${g.targetValue}s (${mins}:${secs}) - must run ≤ this time`);
  }

  // Check what tier a 22:33 (1353s) time would achieve
  const time = 1353;
  console.log(`\nFor a time of ${time}s (22:33):`);
  const grades = challenge?.grades || [];
  
  // For TIME, lower is better. 
  // Sort DESCENDING by targetValue (highest/easiest targets first: F, then E, then D...)
  // The athlete beats a tier if their time <= targetValue
  // We want the HIGHEST tier they can achieve
  const sortedGrades = [...grades].sort((a, b) => b.targetValue - a.targetValue);
  let achievedTier: string | null = null;
  for (const g of sortedGrades) {
    console.log(`  Checking ${g.rank} (${g.targetValue}s): ${time} <= ${g.targetValue} ? ${time <= g.targetValue}`);
    if (time <= g.targetValue) {
      achievedTier = g.rank;
    }
  }
  console.log(`\n  => Achieved tier: ${achievedTier}`);

  await db.$disconnect();
}

main();
