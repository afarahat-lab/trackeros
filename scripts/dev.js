#!/usr/bin/env node
/**
 * Concurrent dev runner: boot the API and the web dev server together.
 *
 * Each child's stdout/stderr is forwarded to the parent terminal with a per-process
 * prefix so the two streams stay distinguishable. When either child exits, the sibling
 * is terminated and this process exits with that child's code. SIGINT/SIGTERM (Ctrl-C)
 * tear down both children before exiting.
 */
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CHILDREN = [
  {
    name: 'api',
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'start'],
    cwd: ROOT,
  },
  {
    name: 'web',
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.join(ROOT, 'web'),
  },
];

const children = new Set();
let shuttingDown = false;

function prefixStream(child, name, streamKind) {
  const prefix = `[${name}] `;
  child[streamKind].on('data', (chunk) => {
    const lines = String(chunk).split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (i === lines.length - 1 && lines[i] === '') continue;
      process[streamKind].write(prefix + lines[i] + '\n');
    }
  });
}

function killChild(child) {
  if (child.exitCode !== null) return;
  try {
    child.kill('SIGTERM');
  } catch {
    // Ignore: the child may have already exited between the check and the kill.
  }
}

function teardown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) killChild(child);

  // Give children a moment to handle SIGTERM, then force-kill any survivor.
  const forceTimer = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null) {
        try {
          child.kill('SIGKILL');
        } catch {
          // Already gone.
        }
      }
    }
  }, 2000);
  if (forceTimer.unref) forceTimer.unref();

  if (typeof signal === 'number' && signal !== 0) {
    process.exitCode = 128 + signal;
  } else {
    process.exitCode = 0;
  }
}

for (const spec of CHILDREN) {
  const child = spawn(spec.command, spec.args, { cwd: spec.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  prefixStream(child, spec.name, 'stdout');
  prefixStream(child, spec.name, 'stderr');

  child.on('error', (err) => {
    console.error(`[${spec.name}] failed to spawn: ${err.message}`);
    teardown(0);
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    if (signal) {
      console.error(`[${spec.name}] terminated by signal ${signal} — shutting down sibling`);
    } else {
      console.error(`[${spec.name}] exited with code ${code} — shutting down sibling`);
    }

    shuttingDown = true;
    for (const sibling of children) killChild(sibling);
    process.exitCode = typeof code === 'number' ? code : 1;
    process.exit(process.exitCode);
  });
}

process.on('SIGINT', () => teardown(2));
process.on('SIGTERM', () => teardown(15));
