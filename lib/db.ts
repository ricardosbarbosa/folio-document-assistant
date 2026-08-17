import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var folioPool: Pool | undefined;
}

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!global.folioPool) {
    global.folioPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return global.folioPool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const pool = getPool();
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool.query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const pool = getPool();
  if (!pool) throw new Error("DATABASE_URL is not configured");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
