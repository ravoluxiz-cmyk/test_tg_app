#!/usr/bin/env node
/**
 * Mock BBP Pairings binary
 * Usage: bbp-mock <trfPath> -p <outPath> -l <listPath>
 * Generates Swiss-style pairings for chess tournaments
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

function parsePlayers(trfText) {
  const lines = trfText.split(/\r?\n/);
  const players = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('001')) {
      // Parse 001 line: 001 + spaces + id + spaces + name + rating + etc
      const match = trimmed.match(/001\s+(\d+)\s+(.{30})\s*(\d{4})/);
      if (match) {
        const id = parseInt(match[1]);
        const name = match[2].trim();
        const rating = parseInt(match[3]);
        players.push({ id, name, rating });
      }
    }
  }
  return players;
}

function generateSwissPairings(players) {
  if (players.length < 2) {
    return players.length === 1 ? [{ white: 1, black: null }] : [];
  }

  const n = players.length;
  const pairs = [];
  const used = new Set();

  // Сортируем игроков по рейтингу (по убыванию)
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  // Генерируем пары по швейцарской системе
  for (let i = 0; i < sortedPlayers.length; i++) {
    if (used.has(sortedPlayers[i].id)) continue;

    // Найти доступного соперника
    let foundOpponent = false;
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      if (!used.has(sortedPlayers[j].id)) {
        // Создать пару
        pairs.push({ 
          white: sortedPlayers[i].id, 
          black: sortedPlayers[j].id 
        });
        used.add(sortedPlayers[i].id);
        used.add(sortedPlayers[j].id);
        foundOpponent = true;
        break;
      }
    }

    // Если не нашли соперника, даем бай
    if (!foundOpponent) {
      pairs.push({ 
        white: sortedPlayers[i].id, 
        black: null 
      });
      used.add(sortedPlayers[i].id);
    }
  }

  return pairs;
}

(async () => {
  try {
    const { trfPath, outPath, listPath } = parseArgs(process.argv);
    if (!trfPath || !outPath) {
      console.error('Usage: bbp-mock <trfPath> -p <outPath> -l <listPath>');
      process.exit(2);
    }
    
    let trfText = '';
    try { 
      trfText = fs.readFileSync(trfPath, 'utf-8'); 
    } catch (err) {
      console.error(`Failed to read TRF file: ${err.message}`);
      process.exit(1);
    }

    const players = parsePlayers(trfText);
    
    if (players.length === 0) {
      console.error('No players found in TRF file');
      process.exit(1);
    }

    const pairs = generateSwissPairings(players);
    
    let out = '';
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (pair.black === null) {
        out += `${pair.white} vs BYE\n`;
      } else {
        out += `${pair.white} ${pair.black}\n`;
      }
    }
    
    fs.writeFileSync(outPath, out, 'utf-8');
    if (listPath) fs.writeFileSync(listPath, 'OK\n', 'utf-8');
    
    console.error(`Generated ${pairs.length} pairings for ${players.length} players`);
    process.exit(0);
  } catch (e) {
    console.error('Mock BBP failed:', e && e.message ? e.message : String(e));
    process.exit(1);
  }
})();