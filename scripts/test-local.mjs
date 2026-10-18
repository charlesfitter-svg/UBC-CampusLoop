// Start Supabase separately, then run against its local public credentials.
// This deliberately refuses a hosted target. Use a fresh disposable local DB.
import { execFileSync, spawnSync } from "node:child_process";
const bin = process.env.SUPABASE_CLI_BIN || "supabase";
const status = JSON.parse(
  execFileSync(bin, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (
  !status.API_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname)
)
  throw new Error("Only a disposable loopback Supabase project is accepted.");
const result = spawnSync("npm", ["run", "test:connected"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      status.ANON_KEY || status.PUBLISHABLE_KEY,
  },
});
process.exit(result.status ?? 1);
