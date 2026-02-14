/**
 * Service-to-Service (S2S) Authentication Client
 *
 * Handles JWT-based authentication between microservices.
 * - Authenticates using SERVICE_API_KEY
 * - Manages access/refresh tokens
 * - Auto-refreshes tokens before expiration
 */
const jwt = require('jsonwebtoken');

class S2SClient {
  /**
   * @param {Object} options
   * @param {string} options.serviceApiKey - Unique API key for this service
   * @param {string} options.serviceName - Name of this service
   * @param {string} options.authEndpoint - URL of the auth service (identity-service)
   * @param {Function} options.httpClient - HTTP client function (fetch-like)
   */
  constructor(options) {
    const { serviceApiKey, serviceName, authEndpoint, httpClient } = options;

    if (!serviceApiKey) {
      throw new Error('SERVICE_API_KEY is required for S2S authentication');
    }

    if (!serviceName) {
      throw new Error('SERVICE_NAME is required for S2S authentication');
    }

    this.serviceApiKey = serviceApiKey;
    this.serviceName = serviceName;
    this.authEndpoint = authEndpoint || process.env.S2S_AUTH_ENDPOINT;
    this.httpClient = httpClient || globalThis.fetch;

    this.accessToken = null;
    this.refreshToken = null;
    this.accessTokenExpiry = null;
    this.refreshing = null;
  }

  /**
   * Authenticate with the identity service and obtain tokens
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async authenticate() {
    if (!this.authEndpoint) {
      throw new Error('S2S_AUTH_ENDPOINT not configured');
    }

    const response = await this.httpClient(`${this.authEndpoint}/auth/s2s/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: this.serviceApiKey,
        serviceName: this.serviceName
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`S2S authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.accessTokenExpiry = Date.now() + (data.expiresIn * 1000);

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    };
  }

  /**
   * Refresh the access token using the refresh token
   * @returns {Promise<{accessToken: string}>}
   */
  async refresh() {
    if (!this.refreshToken) {
      return this.authenticate();
    }

    if (!this.authEndpoint) {
      throw new Error('S2S_AUTH_ENDPOINT not configured');
    }

    const response = await this.httpClient(`${this.authEndpoint}/auth/s2s/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
        serviceName: this.serviceName
      })
    });

    if (!response.ok) {
      // Refresh token expired, re-authenticate
      this.refreshToken = null;
      return this.authenticate();
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.accessTokenExpiry = Date.now() + (data.expiresIn * 1000);

    return { accessToken: this.accessToken };
  }

  /**
   * Get a valid access token, refreshing if necessary
   * @returns {Promise<string>}
   */
  async getValidToken() {
    // Check if we need to refresh (refresh 1 minute before expiry)
    const needsRefresh = !this.accessToken ||
      !this.accessTokenExpiry ||
      Date.now() > (this.accessTokenExpiry - 60000);

    if (needsRefresh) {
      // Prevent concurrent refresh calls
      if (!this.refreshing) {
        this.refreshing = this.refresh().finally(() => {
          this.refreshing = null;
        });
      }
      await this.refreshing;
    }

    return this.accessToken;
  }

  /**
   * Make an authenticated HTTP request to another service
   * @param {string} url - Target URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    const token = await this.getValidToken();

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'X-Service-Name': this.serviceName
    };

    return this.httpClient(url, {
      ...options,
      headers
    });
  }

  /**
   * Clear stored tokens (for logout/cleanup)
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.accessTokenExpiry = null;
  }
}

/**
 * Create JWT tokens for S2S authentication
 * Used by the identity-service to generate tokens
 */
class S2STokenGenerator {
  /**
   * @param {string} jwtSecret - Secret key for signing JWTs
   */
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret || process.env.S2S_JWT_SECRET;

    if (!this.jwtSecret) {
      throw new Error('S2S_JWT_SECRET is required');
    }
  }

  /**
   * Generate access and refresh tokens for a service
   * @param {string} serviceName - Name of the authenticated service
   * @returns {{accessToken: string, refreshToken: string, expiresIn: number}}
   */
  generateTokens(serviceName) {
    const accessTokenExpiresIn = 15 * 60; // 15 minutes
    const refreshTokenExpiresIn = 24 * 60 * 60; // 24 hours

    const accessToken = jwt.sign(
      {
        type: 'access',
        service: serviceName,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: accessTokenExpiresIn }
    );

    const refreshToken = jwt.sign(
      {
        type: 'refresh',
        service: serviceName,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: refreshTokenExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn
    };
  }

  /**
   * Verify and decode a token
   * @param {string} token - JWT token to verify
   * @returns {{valid: boolean, payload?: Object, error?: string}}
   */
  verifyToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
      };
    }
  }

  /**
   * Refresh an access token using a valid refresh token
   * @param {string} refreshToken - The refresh token
   * @returns {{accessToken?: string, expiresIn?: number, error?: string}}
   */
  refreshAccessToken(refreshToken) {
    const result = this.verifyToken(refreshToken);

    if (!result.valid) {
      return { error: result.error };
    }

    if (result.payload.type !== 'refresh') {
      return { error: 'Invalid token type' };
    }

    const accessTokenExpiresIn = 15 * 60;
    const accessToken = jwt.sign(
      {
        type: 'access',
        service: result.payload.service,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: accessTokenExpiresIn }
    );

    return {
      accessToken,
      expiresIn: accessTokenExpiresIn
    };
  }
}

module.exports = {
  S2SClient,
  S2STokenGenerator
};
