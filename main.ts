// OPAL COAST — make.fun entrypoint for gta6-01.
// Rebuilt in the recorded session of 2026-11-24: every counted file was
// deleted and written fresh here, and this entrypoint keeps the fix that
// clears /output's contents instead of removing the mount point.
// Hands the game in: copies game/ and screenshots/ from this repository to
// the output directory and writes /output/dossier.json with buildDossier
// from vendor/makefun-game.ts. Standard library only; runs twice and must
// write the same bytes both times, so it copies files in a fixed order and
// never writes timestamps or random data into the output.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function handInGame(): void {
  // Start from a clean output directory so a second run cannot leave stale
  // files behind and change the bytes between the grader's two runs.
  // Clear the directory's contents instead of removing the directory
  // itself: the grader hands in a mounted /output, and removing a mount
  // point fails with EBUSY (Device or resource busy) and exits 1.
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), { recursive: true, force: true });
  }
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('OPAL COAST: game/ is missing from the repository');
  if (!existsSync(shotsDir)) throw new Error('OPAL COAST: screenshots/ is missing from the repository');
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  // Fail loudly instead of handing in a silent empty dossier: the sealed
  // scorer compares dossier.json byte for byte with its own rebuild.
  if (!existsSync(join(outDir, 'dossier.json'))) {
    throw new Error('OPAL COAST: dossier.json was not written to the output directory');
  }
}

handInGame();
