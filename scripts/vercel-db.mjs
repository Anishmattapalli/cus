import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!process.env.VERCEL) process.exit(0);

process.env.DATABASE_URL = "file:./prisma/build.db";
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  stdio: "inherit",
  env: process.env,
});
if (!existsSync("prisma/build.db")) {
  console.error("Vercel DB prepare failed: prisma/build.db was not created.");
  process.exit(1);
}
