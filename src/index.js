// Shared module for cross-microservice utilities
require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const Logger = require('./logger');
const AppVars = require('./variables');
const CryptoService = require('./crypto-service');
const BrasilApiClient = require('./brasilapi-client');
const { supabase } = require('../lib/supabase-client');

module.exports = {
  Logger,
  AppVars,
  CryptoService,
  BrasilApiClient,
  supabase
};

