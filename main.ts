// OPAL COAST — the entrypoint. Copies game/ and screenshots/ into the
// output directory and writes dossier.json with the kit's buildDossier.
// Node standard library only; MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });

// Clear the output directory's contents, never the directory itself.
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync('game', join(outDir, 'game'), { recursive: true });
cpSync('screenshots', join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
// buildDossier is deterministic: the same directory writes the same
// bytes, so two runs of this program must produce identical dossiers.
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
console.log(`output: game/ + screenshots/ + dossier.json in ${outDir}`);
