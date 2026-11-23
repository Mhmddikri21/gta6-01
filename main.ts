// OPAL COAST — entrypoint: copies game/ and screenshots/ to the output dir
// and writes dossier.json with the kit's buildDossier. Node stdlib only.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = new URL('.', import.meta.url).pathname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message when the game is missing its page.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('OPAL COAST: game/index.html is missing, nothing to hand in');
}
if (!existsSync(join(repoRoot, 'screenshots'))) {
  throw new Error('OPAL COAST: screenshots/ is missing, nothing to hand in');
}

// Clear the output dir's CONTENTS, never the dir itself (the grader owns it).
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
console.log(`OPAL COAST wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
