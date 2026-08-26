// rivetz-website — static presentation site, served as a harness MultiSite child.
//
// Harness (rootz-services) owns ports 80/443, terminates TLS via SNI, and proxies
// by Host to this process on its assigned PORT. So this is display code only:
// plain HTTP on PORT, a /health probe for harness, and the static pages. No own
// TLS and no webhook — those belong to the front, not a per-site duplicate shell.

import express from 'express';
import { resolve } from 'path';
import morgan from 'morgan';

const root = import.meta.dirname;
const app = express();
app.use(morgan('dev'));

// Harness health probe (GET 127.0.0.1:PORT/health)
app.get('/health', (req, res) => res.status(200).send('ok'));

// AI Discovery — /.well-known/ai + llms.txt
app.get('/.well-known/ai', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json');
  res.sendFile(resolve(root, '.well-known/ai/index.json'), { dotfiles: 'allow' });
});
app.get('/.well-known/ai/knowledge', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json');
  res.sendFile(resolve(root, '.well-known/ai/knowledge.json'), { dotfiles: 'allow' });
});
app.get('/llms.txt', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.sendFile(resolve(root, 'llms.txt'));
});

// Static assets + pages
app.use('/assets', express.static(resolve(root, 'assets')));
app.use('/pages', express.static(resolve(root, 'pages')));
app.use('/images', express.static(resolve(root, 'images')));
app.get('/', (req, res) => res.sendFile(resolve(root, 'index.html')));
app.get('/manifest.json', (req, res) => res.sendFile(resolve(root, 'manifest.json')));
app.get('/favicon.ico', (req, res) => res.sendFile(resolve(root, 'favicon.ico')));

const port = parseInt(process.env.PORT || 4080);
app.listen(port, () => console.log(`rivetz-website listening on :${port}`));

process.on('SIGTERM', () => { console.log('Shutting down'); process.exit(0); });
process.on('SIGINT', () => { console.log('Shutting down'); process.exit(0); });
