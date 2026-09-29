// rivetz-website — static presentation site, served as a harness MultiSite child.
//
// Harness (rootz-services) owns ports 80/443, terminates TLS via SNI, and proxies
// by Host to this process on its assigned PORT. So this is display code only:
// plain HTTP on PORT, a /health probe for harness, and the static pages. No own
// TLS and no webhook — those belong to the front, not a per-site duplicate shell.
//
// Routing: the site is a hash-router single-page app, which is fine for humans but
// gives every page the same <title> and no link preview when shared. So each page
// also has a clean server-rendered URL (/rules, /blog, …) that returns the same
// shell with that page's own title and Open Graph tags injected. Hash URLs keep
// working unchanged; the clean path is what you share.

import express from 'express';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import morgan from 'morgan';

const root = import.meta.dirname;
const app = express();
app.use(morgan('dev'));

// Page metadata lives in manifest.json so the nav and the link previews cannot
// drift apart. Read once at boot; a page addition is a deploy either way.
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
const PAGES = manifest.pages || {};
const SHELL = readFileSync(resolve(root, 'index.html'), 'utf8');
const OG_IMAGE = '/images/Rivetz_overview.png';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(slug, req) {
  const meta = PAGES[slug] || PAGES.home || {};
  const title = meta.title || 'Rivetz';
  const desc = meta.description || '';
  const origin = `https://${req.headers.host || 'rivetz.com'}`;
  const url = slug === 'home' ? `${origin}/` : `${origin}/${slug}`;
  const image = origin + (meta.image || OG_IMAGE);

  const tags = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${slug === 'home' ? 'website' : 'article'}">`,
    `<meta property="og:site_name" content="Rivetz">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    // tells the client router which page to draw when there is no hash
    `<meta name="rivetz-page" content="${esc(slug)}">`,
  ].join('\n  ');

  return SHELL
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `  ${tags}\n</head>`);
}

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
app.get('/manifest.json', (req, res) => res.sendFile(resolve(root, 'manifest.json')));
app.get('/favicon.ico', (req, res) => res.sendFile(resolve(root, 'favicon.ico')));

// Server-rendered shell: home, then one clean path per known page.
app.get('/', (req, res) => res.type('html').send(render('home', req)));
app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  if (!Object.prototype.hasOwnProperty.call(PAGES, slug)) return next();
  res.type('html').send(render(slug, req));
});

const port = parseInt(process.env.PORT || 4080);
app.listen(port, () => console.log(`rivetz-website listening on :${port}`));

process.on('SIGTERM', () => { console.log('Shutting down'); process.exit(0); });
process.on('SIGINT', () => { console.log('Shutting down'); process.exit(0); });
