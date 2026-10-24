// Run a Python 3 script with whichever launcher this computer has: `py -3` on Windows, `python3` elsewhere.
// Usage: node scripts/py.mjs <script.py> [args...]
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CANDIDATES = process.platform === 'win32' ? [['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];

// The Windows Store stub named "python" exits without printing a version, so it is skipped.
export function findPython() {
  for (const command of CANDIDATES) {
    const probe = spawnSync(command[0], [...command.slice(1), '--version'], { encoding: 'utf8' });
    if (probe.status === 0 && /Python 3\./.test(probe.stdout + probe.stderr)) return command;
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const python = findPython();
  if (!python) {
    console.error('Python 3 was not found. Install it from python.org (tick "Add python.exe to PATH"), then open a new terminal.');
    process.exit(1);
  }
  const result = spawnSync(python[0], [...python.slice(1), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
