// OPAL COAST — entrypoint: copies game/ and screenshots/ to the output dir and writes dossier.json.
// Paths are resolved from THIS script's own location (import.meta.url), never from the
// process working directory: the grader runs `node /bot/main.ts` from a cwd that is not the
// repo root, so bare relative 'game' / 'screenshots' would not resolve (ENOENT, exit 1).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSrc = join(here, 'game');
const shotsSrc = join(here, 'screenshots');

// Fail fast with a clear message when the repo layout is wrong, instead of
// a bare ENOENT from cpSync deep in the copy.
if (!existsSync(gameSrc)) throw new Error(`main.ts: no game/ beside this script (${gameSrc})`);
if (!existsSync(shotsSrc)) throw new Error(`main.ts: no screenshots/ beside this script (${shotsSrc})`);

// Clear the output dir's contents (never the dir itself), then recreate it.
if (existsSync(outDir)) {
  for (const entry of readdirSync(outDir)) rmSync(join(outDir, entry), { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

// Copy from script-relative paths, so this works from any working directory.
cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`OPAL COAST: wrote ${outDir}/dossier.json (${dossier.length} bytes) from ${here}`);
