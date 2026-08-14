import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/lib/identity/schema.ts",
    "./src/lib/appointments/schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/drvandana",
  },
});
