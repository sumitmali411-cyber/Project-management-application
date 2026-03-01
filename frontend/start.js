#!/usr/bin/env node
/**
 * start.js — DevSync frontend launcher with auto port fallback.
 *
 * Usage:  node start.js
 *   or:   npm start   (package.json points here)
 *
 * 1. Finds a free port starting from FRONTEND_BASE (4300).
 * 2. Finds a free backend port starting from BACKEND_BASE (9090).
 * 3. Writes a temporary proxy config pointing at the detected backend port.
 * 4. Spawns `ng serve` with the chosen frontend port + proxy config.
 */

const net   = require('net');
const fs    = require('fs');
const path  = require('path');
const { spawn } = require('child_process');

const FRONTEND_BASE = parseInt(process.env.FRONTEND_PORT || '4300', 10);
const BACKEND_BASE  = parseInt(process.env.BACKEND_PORT  || '9090', 10);
const MAX_OFFSET    = 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
}

async function findFreePort(base) {
  for (let offset = 0; offset <= MAX_OFFSET; offset++) {
    const port = base + offset;
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found in range [${base}-${base + MAX_OFFSET}]`);
}

async function main() {
  const frontendPort = await findFreePort(FRONTEND_BASE);
  const backendPort  = await findFreePort(BACKEND_BASE);

  if (frontendPort !== FRONTEND_BASE) {
    console.warn(`⚠  Port ${FRONTEND_BASE} in use — using frontend port ${frontendPort}`);
  }
  if (backendPort !== BACKEND_BASE) {
    console.warn(`⚠  Port ${BACKEND_BASE} in use — proxying to backend port ${backendPort}`);
  }

  // Write a temp proxy config for this session
  const proxyConf = {
    '/api': {
      target: `http://localhost:${backendPort}`,
      secure: false,
      changeOrigin: true,
      logLevel: 'info'
    }
  };
  const proxyPath = path.join(__dirname, '.proxy.conf.tmp.json');
  fs.writeFileSync(proxyPath, JSON.stringify(proxyConf, null, 2));

  console.log(`Starting DevSync frontend on http://localhost:${frontendPort}`);
  console.log(`Proxying /api  →  http://localhost:${backendPort}`);

  // Also update the backendUrl constant in commits-list if needed (runtime only)
  const ng = process.platform === 'win32' ? 'ng.cmd' : 'ng';
  const child = spawn(
    ng,
    ['serve', '--proxy-config', proxyPath, '--port', String(frontendPort), '--open'],
    { stdio: 'inherit', shell: false }
  );

  const cleanup = () => {
    try { fs.unlinkSync(proxyPath); } catch (_) {}
  };

  child.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });

  process.on('SIGINT',  () => { child.kill('SIGINT');  cleanup(); });
  process.on('SIGTERM', () => { child.kill('SIGTERM'); cleanup(); });
}

main().catch((err) => {
  console.error('Startup error:', err.message);
  process.exit(1);
});
