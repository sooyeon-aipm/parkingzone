// Local server using the exact Vercel API handlers. No dependencies, logs or env file serving.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const parking = require('../api/parking.js');
const places = require('../api/places.js');
const root = path.resolve(__dirname, '../prototype');
const port = Number(process.env.PORT || 8765);
http.createServer(async (req, res) => {
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) {res.writeHead(403).end();return;}
  res.status = code => {res.statusCode = code; return res;};
  res.json = data => {res.setHeader('Content-Type', 'application/json; charset=utf-8');res.end(JSON.stringify(data));};
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/parking') return parking(req, res);
    if (url.pathname === '/api/places') {
      let body = '';
      for await (const chunk of req) {body += chunk; if (body.length > 2048) {res.status(413).json({error:'INVALID_QUERY'});return;}}
      req.body = body; return places(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405).end();return;}
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep) || path.relative(root,file).split(path.sep).some(part=>part.startsWith('.'))) {res.writeHead(404).end();return;}
    const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
    const body = await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
    res.end(req.method==='HEAD'?undefined:body);
  } catch {if(!res.headersSent)res.writeHead(404);res.end();}
}).listen(port, '127.0.0.1', () => console.log(`프로토타입: http://127.0.0.1:${port}/`));
