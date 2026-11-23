// OPAL COAST — tiny static file server for local testing. Node stdlib only.
// Usage: node serve.ts [--root game] [--port 8080]
// Written fresh, from scratch, in the recorded session (fourth rewrite).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const args = process.argv.slice(2);
let root = 'game';
let port = 8080;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && args[i + 1]) root = args[++i];
  else if (args[i] === '--port' && args[i + 1]) port = Number(args[++i]);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safe = normalize(rawPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
  const filePath = join(root, safe === '' ? 'index.html' : safe);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

server.listen(port, () => {
  console.log(`OPAL COAST serving ${root} at http://localhost:${port}`);
});
