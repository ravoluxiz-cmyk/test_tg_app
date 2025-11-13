#!/usr/bin/env node
/**
 * BBP Pairings smoke test harness.
 * - Builds a minimal TRF(bx) with two players using 001 lines
 * - Runs BBP Pairings (real or mock via BBP_PAIRINGS_BIN)
 * - Prints parsed pairs
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

function toOneDecimal(n) { return Number(n || 0).toFixed(1); }

function buildTrfx() {
  const lines = [];
  lines.push('XXC white1');
  lines.push('012 Smoke Test');
  lines.push('022 Online');
  lines.push(`032 ${new Date().toISOString().slice(0,10)}`);
  lines.push('XXR 5');
  lines.push(`BBW ${toOneDecimal(1)}`);
  lines.push(`BBL ${toOneDecimal(0)}`);
  lines.push(`BBD ${toOneDecimal(0.5)}`);
  lines.push(`BBU ${toOneDecimal(0)}`);
  function make001(pos, rating, score) {
    const arr = new Array(91).fill(' ');
    arr[0]='0';arr[1]='0';arr[2]='1';arr[3]=' ';
    const idStr = String(pos).padStart(4,' ');
    arr[4]=idStr[0];arr[5]=idStr[1];arr[6]=idStr[2];arr[7]=idStr[3];
    const ratingStr = String(rating).padStart(4,' ');
    arr[48]=ratingStr[0];arr[49]=ratingStr[1];arr[50]=ratingStr[2];arr[51]=ratingStr[3];
    const scoreStr = toOneDecimal(score).padStart(4,' ');
    arr[80]=scoreStr[0];arr[81]=scoreStr[1];arr[82]=scoreStr[2];arr[83]=scoreStr[3];
    return arr.join('');
  }
  lines.push(make001(1, 1800, 0));
  lines.push(make001(2, 1700, 0));
  return lines.join('\n')+'\n';
}

function run(bin, trfPath, outPath, listPath) {
  return new Promise((resolve, reject) => {
    const args = ['--dutch', trfPath, '-p', outPath, '-l', listPath];
    const child = spawn(bin, args, { stdio: ['ignore','pipe','pipe'] });
    let stderr=''; let stdout='';
    child.stdout.on('data',d=>stdout+=String(d));
    child.stderr.on('data',d=>stderr+=String(d));
    child.on('error',err=>reject(err));
    child.on('close',code=>{
      if (code !== 0) return reject(new Error(`bbp exited ${code}: ${stderr}`));
      try {
        const outText = fs.readFileSync(outPath,'utf-8');
        resolve({ outText, stdout, stderr });
      } catch (e) { reject(e); }
    });
  });
}

function parsePairs(outText) {
  const pairs=[];
  const lines = outText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  for (const line of lines) {
    let m=line.match(/^(\d+)\s+(\d+)$/);
    if (m) { pairs.push({ whitePos: Number(m[1]), blackPos: Number(m[2]) }); continue; }
    m=line.match(/^(\d+)\s+vs\s+BYE$/i);
    if (m) { pairs.push({ whitePos: Number(m[1]), blackPos: null }); }
  }
  return pairs;
}

(async () => {
  try {
    const bin = process.env.BBP_PAIRINGS_BIN || path.resolve(__dirname,'../bin/bbp-mock.js');
    const wd = path.join(os.tmpdir(), 'bbp-smoke-'+Date.now());
    fs.mkdirSync(wd, { recursive: true });
    const trfPath = path.join(wd,'trn.trfx');
    const outPath = path.join(wd,'outfile.txt');
    const listPath = path.join(wd,'checklist.txt');
    fs.writeFileSync(trfPath, buildTrfx(), 'utf-8');
    const res = await run(bin, trfPath, outPath, listPath);
    const pairs = parsePairs(res.outText);
    console.log('BBP smoke output:\n', res.outText);
    console.log('Parsed pairs:', pairs);
    process.exit(0);
  } catch (e) {
    console.error('BBP smoke failed:', e && e.message ? e.message : String(e));
    process.exit(1);
  }
})();