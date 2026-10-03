/**
 * Environment loading for the server workspace.
 *
 * Runs as an import side-effect so `.env` values are available BEFORE any
 * other module body executes (e.g. `geminiClient.ts` reads GEMINI_MODEL and
 * EMBEDDING_MODEL at module scope). Always import this module first.
 *
 * Candidate locations, in priority order:
 *   1. <cwd>/.env              — workspace-local (server/.env)
 *   2. <cwd>/../.env           — monorepo root (when cwd is server/)
 *   3. <serverRoot>/../.env    — monorepo root (tsx / compiled dist)
 *
 * Nothing is loaded when no file exists, so platform-provided environment
 * variables (Vercel, Docker `-e`, CI) always take precedence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(moduleDir, '..', '.env'),
  path.resolve(moduleDir, '..', '..', '.env'),
];

const found = candidates.find((candidate) => fs.existsSync(candidate));

if (found) {
  dotenv.config({ path: found });
}

/** Path of the loaded .env file, or null when none was found. */
export const ENV_FILE: string | null = found ?? null;