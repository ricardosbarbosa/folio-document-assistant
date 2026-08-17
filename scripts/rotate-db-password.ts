import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { Pool } from "pg";

function setVariable(content: string, name: string, value: string) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

function withPassword(connectionString: string, password: string) {
  const url = new URL(connectionString);
  url.password = password;
  return url.toString();
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const direct = process.env.DIRECT_DATABASE_URL;
  const pooled = process.env.DATABASE_URL;
  if (!direct || !pooled) throw new Error("Both database URLs must be configured");
  const password = randomBytes(32).toString("hex");
  const pool = new Pool({ connectionString: direct });
  try {
    await pool.query(`ALTER ROLE folio_owner WITH PASSWORD '${password}'`);
  } finally {
    await pool.end();
  }
  const target = resolve(".env.local");
  const current = await readFile(target, "utf8");
  const withPooled = setVariable(current, "DATABASE_URL", withPassword(pooled, password));
  const complete = setVariable(withPooled, "DIRECT_DATABASE_URL", withPassword(direct, password));
  await writeFile(target, complete, { mode: 0o600 });
  console.log("Database role password rotated and local connections refreshed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
