import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env for Prisma CLI commands (migrate, db push, etc.)
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
