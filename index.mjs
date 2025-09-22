import express from 'express';
import http from 'http';
import https from 'https';
import { resolve } from 'path';
import {fileURLToPath} from "url";
import morgan from 'morgan';
import fs from 'fs';
import { Certify } from '../administrate/certify.mjs';
import { Synchronize } from '../administrate/synchronize.mjs';

let main = async function() {
  let app = express();
  app.use(morgan('dev'));

  const http_port = parseInt(process.env.PORT || 4080);
  const https_port = parseInt(process.env.PORTSSL || 4443);

  // Initialize Certify for SSL certificate management
  const certify = await Certify.attach(app, {
    contactEmail: process.env.CONTACT_EMAIL || 'admin@rootz.global'
  });

  // Initialize Synchronize for GitHub webhook auto-updates
  if (process.env.PROFILE !== 'DEV') {
    const branch = await Synchronize.ActiveBranch();
    Synchronize.attach(app, process.env.SYNC_BRANCH || branch);
  }
  // Health check
  app.get('/health', (req, res) => { res.status(200).send() });

  // Static assets
  app.use('/assets', express.static(resolve('./assets')));
  app.use('/pages', express.static(resolve('./pages')));
  app.use('/images', express.static(resolve('./images')));

  // Dynamic routing for pages
  app.get('/', (req, res) => {
    res.sendFile(resolve('./index.html'));
  });

  app.get('/manifest.json', (req, res) => {
    res.sendFile(resolve('./manifest.json'));
  });

  // Serve favicon
  app.get('/favicon.ico', (req, res) => {
    res.sendFile(resolve('./favicon.ico'));
  });


  // Create HTTPS server with SNI callback for dynamic SSL certificates
  const https_server = https.createServer({...certify.SNI}, app);
  https_server.listen(https_port);
  https_server.on('error', console.error);
  https_server.on('listening', () => {
    let address = https_server.address();
    console.log(`HTTPS Server listening on ${address.address} ${address.port} (${address.family})`);
  });

  // Create HTTP server (for redirects and ACME challenges)
  const http_server = http.createServer(app);
  http_server.listen(http_port);
  http_server.on('error', console.error);
  http_server.on('listening', () => {
    let address = http_server.address();
    console.log(`HTTP Server listening on ${address.address} ${address.port} (${address.family})`);
  });
}();

process.on('SIGINT', function() {
  console.log("Shutting down");
  process.exit();
});
