import nextEnv from "@next/env";
import { Pool } from "pg";

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database connection is not configured");
  const pool = new Pool({ connectionString });
  try {
    const extension = await pool.query<{ extversion: string }>(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
    );
    const tables = await pool.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('documents', 'chunks', 'responses', 'evaluations')
    `);
    const vector = await pool.query<{ dimensions: number; cosine_self: string }>(`
      SELECT
        vector_dims(array_fill(1::real, ARRAY[1536])::vector) AS dimensions,
        round((1 - (
          array_fill(1::real, ARRAY[1536])::vector
          <=> array_fill(1::real, ARRAY[1536])::vector
        ))::numeric, 2)::text AS cosine_self
    `);
    const records = await pool.query<{
      documents: string;
      chunks: string;
      responses: string;
      evaluations: string;
    }>(`
      SELECT
        (SELECT count(*)::text FROM documents) AS documents,
        (SELECT count(*)::text FROM chunks) AS chunks,
        (SELECT count(*)::text FROM responses) AS responses,
        (SELECT count(*)::text FROM evaluations) AS evaluations
    `);
    console.table({
      vectorVersion: extension.rows[0]?.extversion ?? "missing",
      applicationTables: Number(tables.rows[0]?.count ?? 0),
      vectorDimensions: vector.rows[0]?.dimensions ?? 0,
      cosineSelf: vector.rows[0]?.cosine_self ?? "missing",
      documents: Number(records.rows[0]?.documents ?? 0),
      chunks: Number(records.rows[0]?.chunks ?? 0),
      responses: Number(records.rows[0]?.responses ?? 0),
      evaluations: Number(records.rows[0]?.evaluations ?? 0),
    });
    if (!extension.rowCount || Number(tables.rows[0]?.count) !== 4 || vector.rows[0]?.dimensions !== 1536) {
      throw new Error("Database verification failed");
    }
    console.log("Database verification passed");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
