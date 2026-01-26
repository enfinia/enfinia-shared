require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const Logger = require('./logger');
const { ENV } = require('./env');

/**
 * Cliente mínimo para a Pluggy Data API (Open Finance).
 *
 * Usa autenticação via clientId/clientSecret para obter um accessToken e
 * oferece alguns métodos utilitários para ler itens, contas e transações.
 *
 * Env vars esperadas:
 * - PLUGGY_CLIENT_ID
 * - PLUGGY_CLIENT_SECRET
 * - PLUGGY_BASE_URL (opcional, padrão: https://api.pluggy.ai)
 */
class PluggyClient {
  constructor(options = {}) {
    this.clientId = options.clientId || ENV.pluggy.CLIENT_ID || '';
    this.clientSecret = options.clientSecret || ENV.pluggy.CLIENT_SECRET || '';
    this.baseUrl = (options.baseUrl || ENV.pluggy.BASE_URL || 'https://api.pluggy.ai').replace(/\/$/, '');

    this.accessToken = null;
    this.accessTokenExpiresAt = 0;

    if (!this.clientId || !this.clientSecret) {
      Logger.warn('⚠️ PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não configurados - PluggyClient desabilitado');
      Logger.info('💡 Configure no .env ou Railway Shared Variables');
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  async _ensureToken() {
    if (!this.enabled) {
      throw new Error('PluggyClient desabilitado (credenciais ausentes)');
    }

    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (typeof fetch === 'undefined') {
      throw new Error('fetch não disponível no runtime Node - não é possível chamar Pluggy');
    }

    const url = `${this.baseUrl}/auth/token`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      Logger.error('❌ Falha ao autenticar na Pluggy API:', resp.status, text);
      throw new Error(`Falha ao autenticar na Pluggy API (status ${resp.status})`);
    }

    const json = await resp.json();
    const token = json.accessToken || json.access_token;
    const expiresIn = Number(json.expiresIn || json.expires_in || 3600);

    if (!token) {
      throw new Error('Resposta de autenticação da Pluggy não contém accessToken');
    }

    this.accessToken = token;
    this.accessTokenExpiresAt = now + expiresIn * 1000;

    return this.accessToken;
  }

  async _request(method, path, { query, body } = {}) {
    const token = await this._ensureToken();

    const url = new URL(`${this.baseUrl}${path}`);
    if (query && typeof query === 'object') {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.append(key, String(value));
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      Logger.error(`❌ Erro na chamada Pluggy ${method} ${path}:`, resp.status, text);
      throw new Error(`Erro Pluggy ${method} ${path} (status ${resp.status})`);
    }

    try {
      return await resp.json();
    } catch (e) {
      Logger.warn(`⚠️ Resposta Pluggy ${method} ${path} não é JSON válido:`, e);
      return null;
    }
  }

  /**
   * Lista itens (conexões) disponíveis na conta Pluggy.
   * Aceita os mesmos parâmetros de paginação do endpoint oficial.
   */
  async listItems(params = {}) {
    return this._request('GET', '/items', { query: params });
  }

  /**
   * Busca um item específico.
   */
  async getItem(itemId) {
    if (!itemId) {
      throw new Error('itemId é obrigatório em getItem');
    }
    return this._request('GET', `/items/${encodeURIComponent(itemId)}`);
  }

  /**
   * Lista contas financeiras (accounts) ligadas a um item.
   */
  async listAccounts(itemId, params = {}) {
    if (!itemId) {
      throw new Error('itemId é obrigatório em listAccounts');
    }
    return this._request('GET', '/accounts', {
      query: { itemId, ...params }
    });
  }

  /**
   * Lista transações de uma conta específica.
   * Params típicos: { from, to, pageSize, page }.
   */
  async listTransactions(accountId, params = {}) {
    if (!accountId) {
      throw new Error('accountId é obrigatório em listTransactions');
    }
    return this._request('GET', '/transactions', {
      query: { accountId, ...params }
    });
  }
}

module.exports = PluggyClient;
