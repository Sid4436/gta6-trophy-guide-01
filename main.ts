// main.ts — Leonida Ledger (gta6-trophy-guide-01).
//
// Copies app/ and screenshots/ from this repository into the output
// directory (/output, or $MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json with buildDossier from
// vendor/makefun-frontend.ts. Standard library only; no network.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The gate's limits for this competition (competition.yaml / RULES.txt):
// app/ at most 993 files and 48 MiB, index.html at most 1 MiB, 3 to 4
// screenshots of at most 256 KiB, the dossier at most 1.5 MiB and its
// text at most 163,840 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function checkDir(label: string, path: string): void {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  if (!statSync(path).isDirectory()) fail(`${label} is not a directory: ${path}`);
}

// The gate wants 3 or 4 screenshots; refuse early with a plain message.
function checkScreenshots(path: string): void {
  const images = readdirSync(path).filter((name) => /\.(png|jpe?g)$/i.test(name));
  if (images.length < 3 || images.length > 4) {
    fail(`screenshots/ holds ${images.length} images, expected 3 or 4: ${images.join(', ')}`);
  }
  console.log(`main.ts: screenshots: ${images.sort().join(', ')}`);
}

function main(): void {
  const appDir = join(repoRoot, 'app');
  const shotsDir = join(repoRoot, 'screenshots');
  checkDir('app/', appDir);
  checkDir('screenshots/', shotsDir);
  checkScreenshots(shotsDir);

  // Start from a clean output directory so a stale file can never leak in.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });

  cpSync(appDir, join(outDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  console.log(`main.ts: wrote ${outDir} (dossier.json ${dossier.length} bytes)`);
}

main();
