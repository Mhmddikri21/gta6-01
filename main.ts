// OPAL COAST — the make.fun entrypoint (Node 22, standard library only).
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier. Runs twice, byte-identical.

import { readdirSync, rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Make sure the output directory exists, then clear its CONTENTS only:
// removing the directory itself would break the grader's mount point.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`OPAL COAST dossier written: ${dossier.length} bytes`);
