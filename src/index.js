// Shared module for cross-microservice utilities
require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const Logger = require('./logger');
const AppVars = require('./variables');
const { ENV } = require('./env');
const CryptoService = require('./crypto-service');
const BrasilApiClient = require('./brasilapi-client');
const PluggyClient = require('./pluggy-client');
const { supabase } = require('../lib/supabase-client');

module.exports = {
  Logger,
  AppVars,
  ENV,
  CryptoService,
  BrasilApiClient,
  PluggyClient,
  supabase
};

