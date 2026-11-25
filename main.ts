// Sizzle Station hand-in program.
//
// Runs on Node 22 with the standard library only. It takes the game
// (game/, plain static files that play offline in a desktop browser) and the
// screenshots (screenshots/, real renders of the game) from this repository
// and writes them into the output directory, together with dossier.json,
// the summary the judge reads, built by the vendored make.fun library.
//
// In the grader the output directory is /output. Anywhere else the
// MAKEFUN_OUTPUT_DIR environment variable names it instead:
//   MAKEFUN_OUTPUT_DIR=out-test node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Caps from the scorer's gate: the dossier text is capped, and anything
// over the file counts, screenshot count, screenshot size or game size caps
// would be refused by the gate itself, so refuse it here first.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
  const shots = join(repoRoot, 'screenshots');
  if (existsSync(shots)) copyTree(shots, join(outputDir, 'screenshots'));
  const dossier = buildDossier(outputDir, DOSSIER_OPTIONS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
