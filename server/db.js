import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("Missing DATABASE_URL in server environment.");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function query(sql, params) {
  return pool.query(sql, params);
}

