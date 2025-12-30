// Shared module for cross-microservice utilities
require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });
module.exports = {
  Logger: require('../../utils/logger'),
  // AppVars agora é definido localmente em `src/variables.js`,
  // eliminando dependência direta de arquivos do monolito.
  AppVars: require('./variables'),
  CryptoService: require('../../services/crypto-service'),
  BrasilApiClient: require('../../services/brasilapi-client'),
  supabase: require('../lib/supabase-client').supabase
};
