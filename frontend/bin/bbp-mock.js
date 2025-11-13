#!/usr/bin/env node
/**
 * Mock BBP Pairings binary
 * Usage: bbp-mock <trfPath> -p <outPath> -l <listPath>
 * It writes a simple pairing "1 2" to outPath (or a bye if only one participant).
 */
const fs = require('fs');

function parseArgs(argv) {
  const args = argv.slice(2);
  let trfPath = null;
  let outPath = null;
  let listPath = null;
  // Support optional system flag as first arg: --dutch or --burstein
  if (args[0] && args[0].startsWith('--')) {
    args.shift();
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!trfPath) { trfPath = a; continue; }
    if (a === '-p') { outPath = args[i+1]; i++; continue; }
    if (a === '-l') { listPath = args[i+1]; i++; continue; }
  }
  return { trfPath, outPath, listPath };
}

function getPlayerCount(trfText) {
  // Count lines starting with '001' (fixed-width player lines)
  const lines = trfText.split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('001')) count++;
  }
  return count;
}

(async () => {
  try {
    const { trfPath, outPath, listPath } = parseArgs(process.argv);
    if (!trfPath || !outPath) {
      console.error('Usage: bbp-mock <trfPath> -p <outPath> -l <listPath>');
      process.exit(2);
    }
    let trfText = '';
    try { trfText = fs.readFileSync(trfPath, 'utf-8'); } catch {}
    const n = getPlayerCount(trfText);

    let out = '';
    if (n >= 2) {
      out = '1 2\n';
    } else if (n === 1) {
      // If only one player, write a bye format recognizable as single number
      out = '1 vs BYE\n';
    } else {
      out = '';
    }
    fs.writeFileSync(outPath, out, 'utf-8');
    if (listPath) fs.writeFileSync(listPath, 'OK\n', 'utf-8');
    process.exit(0);
  } catch (e) {
    console.error('Mock BBP failed:', e && e.message ? e.message : String(e));
    process.exit(1);
  }
})();