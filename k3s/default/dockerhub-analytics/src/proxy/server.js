#!/usr/bin/env node
/**
 * Docker Hub Analytics — self-contained server
 * ---------------------------------------------
 * Serves index.html and proxies /v2/* requests to Docker Hub.
 * No external config needed — just run this file.
 *
 * Usage:
 *   node server.js
 *   PORT=8080 node server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, '..', 'index.html');

function getLocalIPs() {
  const nets = require('os').networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets))
    for (const addr of iface)
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
  return ips;
}

const server = http.createServer((req, res) => {

  // ── Serve index.html at / ────────────────────────────────────────────────
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(INDEX, (err, data) => {
      if (err) { res.writeHead(500); res.end('Cannot read index.html'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // ── Proxy /v2/* to Docker Hub ────────────────────────────────────────────
  if (req.method === 'GET' && req.url.startsWith('/v2/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const options = {
      hostname: 'hub.docker.com',
      path: req.url,
      method: 'GET',
      headers: {
        'User-Agent': 'dockerhub-analytics/1.0',
        'Accept': 'application/json',
      },
    };

    const proxy = https.request(options, (upstream) => {
      res.writeHead(upstream.statusCode, {
        'Content-Type': upstream.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      upstream.pipe(res);
    });

    proxy.on('error', (err) => {
      if (!res.headersSent) { res.writeHead(502); res.end('Upstream error: ' + err.message); }
    });

    proxy.end();
    return;
  }

  // ── Suppress favicon noise ───────────────────────────────────────────────
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n🐳 Docker Hub Analytics\n');
  console.log(`   Local:   http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
  console.log('');
});
