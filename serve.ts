// OPAL COAST — tiny static file server for local testing (Node stdlib only).
// Usage: node serve.ts [--root <dir>] [--port <n>]   (defaults: game/, 8080)
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const args = process.argv.slice(2);
const root = args[args.indexOf('--root') + 1] ?? 'game';
const port = Number(args[args.indexOf('--port') + 1] ?? 8080);

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = join(root, normalize(rel));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(port, () => console.log(`OPAL COAST: serving ${root} at http://localhost:${port}`));
