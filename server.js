/**
 * Minimal development server for the static HTML5 application.
 * No npm dependencies are required.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function safeFilePath(urlPath) {
  const requested = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relativePath);
  return resolved.startsWith(`${ROOT}${path.sep}`) || resolved === path.join(ROOT, 'index.html')
    ? resolved
    : null;
}

http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const filePath = safeFilePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return req.method === 'HEAD' ? res.end() : res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Game Asset Generator is running at http://127.0.0.1:${PORT}`);
});
