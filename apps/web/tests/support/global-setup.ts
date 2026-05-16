import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";

const TEST_PORT = 5433;
const DATA_DIR = join(homedir(), ".local", "share", "vulf", "pgdata-test");
const LOG_FILE = join(homedir(), ".local", "share", "vulf", "pgdata-test.log");
const LOCAL_URL = `postgresql://localhost:${TEST_PORT}/vulf_test`;

function isReady(host: string, port: number): boolean {
  return (
    spawnSync("pg_isready", ["-h", host, "-p", String(port), "-q"], { timeout: 3000 }).status === 0
  );
}

async function waitForReady(host: string, port: number): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (isReady(host, port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`postgres did not become ready on ${host}:${port}`);
}

async function ensureDatabase(url: string): Promise<void> {
  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.slice(1));
  u.pathname = "/postgres";
  const client = new Client({ connectionString: u.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      dbName,
    ]);
    if (!rowCount) await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}

export default async function setup() {
  if (process.env.CI) {
    // CI: postgres is a GitHub Actions service. TEST_DATABASE_URL is set in the workflow step.
    const url = process.env.TEST_DATABASE_URL!;
    const u = new URL(url);
    await waitForReady(u.hostname || "localhost", Number(u.port || 5432));
    await ensureDatabase(url);
    return;
  }

  // Local: always use mise-managed postgres on port 5433.
  // DATABASE_URL (for the dev server) is intentionally ignored here.
  if (!isReady("localhost", TEST_PORT)) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
      execSync(`initdb -D "${DATA_DIR}" --no-locale --encoding=UTF8`, { stdio: "inherit" });
    }
    execSync(`pg_ctl -D "${DATA_DIR}" -l "${LOG_FILE}" -o "-p ${TEST_PORT}" start`, {
      stdio: "inherit",
    });
    await waitForReady("localhost", TEST_PORT);
  }

  await ensureDatabase(LOCAL_URL);
  // Postgres is intentionally left running between runs for speed.
}
