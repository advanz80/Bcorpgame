const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'highscores.json');

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: GET high scores
  if (req.method === 'GET' && req.url === '/api/highscores') {
    const scores = readScores();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scores));
    return;
  }

  // API: POST new high score
  if (req.method === 'POST' && req.url === '/api/highscores') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        // Validate
        if (!entry.name || typeof entry.name !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Naam is verplicht' }));
          return;
        }
        const sanitized = {
          name: entry.name.slice(0, 20).replace(/[<>&"']/g, ''),
          score: Math.max(0, Math.min(99999, parseInt(entry.score) || 0)),
          stars: Math.max(0, Math.min(12, parseInt(entry.stars) || 0)),
          character: ['man', 'vrouw', 'driessen'].includes(entry.character) ? entry.character : 'man',
          date: new Date().toLocaleDateString('nl-NL')
        };

        const scores = readScores();
        scores.push(sanitized);
        scores.sort((a, b) => b.stars - a.stars || b.score - a.score);
        writeScores(scores);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, scores }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ongeldige data' }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`B-Corp Quest server draait op http://localhost:${PORT}`);
});
