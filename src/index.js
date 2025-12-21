// Shared module for cross-microservice utilities

module.exports = {
  Logger: require('../../../utils/logger'),
  AppVars: require('../../../utils/variables'),
  CryptoService: require('../../../services/crypto-service'),
  BrasilApiClient: require('../../../services/brasilapi-client')
};
