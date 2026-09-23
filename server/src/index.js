import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(compression());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
});
app.use('/api', routes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use('/api', (err, _req, res, _next) => {
  const status = err.status || 502;
  if (status >= 500) console.error(`[api] ${err.message}`);
  res.status(status).json({ error: err.message || 'Upstream error' });
});

// In production the built client is served from the same origin.
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1y', index: false }));
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}${fs.existsSync(dist) ? ' (serving client/dist)' : ''}`);
});
