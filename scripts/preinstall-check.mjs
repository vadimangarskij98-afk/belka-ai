import { rmSync } from "node:fs";
import { join } from "node:path";

const userAgent = process.env.npm_config_user_agent || "";

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  try {
    rmSync(join(process.cwd(), lockfile), { force: true });
  } catch {
    // Ignore missing lockfiles.
  }
}

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead.");
  process.exit(1);
}
