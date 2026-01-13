import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Main entry for the schema
  schema: "prisma/schema.prisma",

  // Where migrations should be generated
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  // Database connection
  datasource: {
    url: env("POSTGRES_URL"),
  },
});
