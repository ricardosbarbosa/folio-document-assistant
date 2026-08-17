import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";

const exec = promisify(execFile);

function setVariable(content: string, name: string, value: string) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

async function connectionString(projectId: string, pooled: boolean) {
  const args = [
    "neonctl@latest",
    "connection-string",
    "--project-id",
    projectId,
    "--database-name",
    "folio",
    "--role-name",
    "folio_owner",
    "--ssl",
    "verify-full",
  ];
  if (pooled) args.push("--pooled");
  const { stdout } = await exec("npx", args, { maxBuffer: 1024 * 1024 });
  const value = stdout.trim();
  if (!value.startsWith("postgresql://")) throw new Error("Neon did not return a valid connection string");
  return value;
}

async function main() {
  const projectId = process.argv[2];
  if (!projectId) throw new Error("Provide the Neon project id");
  const target = resolve(".env.local");
  const current = await readFile(target, "utf8").catch(() => "");
  if (/^DATABASE_URL=postgresql:\/\//m.test(current)) {
    throw new Error("Database is already configured. Refusing to replace the existing connection.");
  }
  const [pooled, direct] = await Promise.all([
    connectionString(projectId, true),
    connectionString(projectId, false),
  ]);
  const withPooled = setVariable(current, "DATABASE_URL", pooled);
  const complete = setVariable(withPooled, "DIRECT_DATABASE_URL", direct);
  await writeFile(target, complete, { mode: 0o600 });
  console.log("Neon connection variables saved to .env.local");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
