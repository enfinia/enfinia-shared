const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const redoc = require('redoc-express');

function createDocumentationMiddleware({ specPath, title }) {
  const express = require('express');
  const router = express.Router();

  let specJson;
  try {
    specJson = yaml.load(fs.readFileSync(specPath, 'utf8'));
  } catch (err) {
    console.warn(`[docs] Could not load spec from ${specPath}: ${err.message}`);
    specJson = { openapi: '3.0.0', info: { title: title || 'API', version: '0.0.0' }, paths: {} };
  }

  const specTitle = title || specJson?.info?.title || 'API Documentation';

  router.get('/openapi.json', (_req, res) => res.json(specJson));
  router.get('/docs', redoc({ title: specTitle, specUrl: '/openapi.json' }));

  return router;
}

module.exports = { createDocumentationMiddleware };
