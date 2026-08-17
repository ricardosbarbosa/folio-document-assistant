import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import nextEnv from "@next/env";

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DIRECT_DATABASE_URL or DATABASE_URL before running migrations");
  const pool = new Pool({ connectionString });
  const sql = await readFile(resolve("db/schema.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("Database schema is ready");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
