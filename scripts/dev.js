#!/usr/bin/env node
/**
 * Run the API and the web dev server concurrently.
 *
 * Both processes are spawned as children of this script: their stdout/stderr are
 * forwarded to this process's own streams (prefixed so their interleaved output is
 * attributable), and whichever child exits first terminates the other and propagates
 * its exit code. This is the established pattern for plain-Node scripts in this repo
 * (see scripts/smoke.js): a CommonJS entry, Node built-ins only, no new devDependency.
 *
 * The API is started with the same command `npm run start` resolves to
 * (ts-node src/index.ts), and the web dev server via `npm --prefix web run dev`.
 */
const { spawn } = require('child_process');
const path = require('path');

// `npm` may resolve to npm.cmd on Windows; `process.platform` guard keeps the spawn
// portable without adding a dependency.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  {
    label: 'api',
    command: npm,
    args: ['run', 'start'],
    cwd: path.join(__dirname, '..'),
  },
  {
    label: 'web',
    command: npm,
    args: ['--prefix', 'web', 'run', 'dev'],
    cwd: path.join(__dirname, '..'),
  },
];

let shuttingDown = false;

function forward(child, label) {
  const prefix = (chunk) =>
    String(chunk)
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => `[${label}] ${line}`)
      .join('\n');

  child.stdout.on('data', (chunk) => process.stdout.write(prefix(chunk) + '\n'));
  child.stderr.on('data', (chunk) => process.stderr.write(prefix(chunk) + '\n'));
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const entry of children) {
    if (entry.proc && entry.proc.exitCode === null) {
      entry.proc.kill(signal);
    }
  }
}

for (const entry of children) {
  entry.proc = spawn(entry.command, entry.args, {
    cwd: entry.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  forward(entry.proc, entry.label);

  entry.proc.on('error', (err) => {
    console.error(`[${entry.label}] failed to start: ${err.message}`);
    process.exitCode = 1;
    shutdown('SIGTERM');
  });

  entry.proc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`\n[${entry.label}] exited (code ${code}, signal ${signal || 'none'}) — stopping the other process.`);
    shutdown('SIGTERM');
    process.exitCode = code === null ? 1 : code;
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
