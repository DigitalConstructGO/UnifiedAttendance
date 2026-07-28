import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import {
  DockerComposeEnvironment,
  Wait,
  type StartedDockerComposeEnvironment,
} from "testcontainers";


const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const COMPOSE_FILE = "docker-compose.test.yml";
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/src/migrations", import.meta.url));

const DB_CONTAINER = "db-test-1";

const DB_USER = "test";
const DB_PASSWORD = "test";
const DB_NAME = "test";
const DB_PORT = 5432;

let environment: StartedDockerComposeEnvironment | undefined;

export async function setup() {
  environment = await new DockerComposeEnvironment(REPO_ROOT, COMPOSE_FILE)
    .withWaitStrategy(DB_CONTAINER, Wait.forHealthCheck())
    .up();

  const container = environment.getContainer(DB_CONTAINER);
  const host = container.getHost();
  const port = container.getMappedPort(DB_PORT);
  process.env.DATABASE_URL = `postgres://${DB_USER}:${DB_PASSWORD}@${host}:${port}/${DB_NAME}`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

export async function teardown() {
  await environment?.down({ removeVolumes: true });
  environment = undefined;
}
