const https = require('https');

class BrasilApiClient {
  constructor({ cacheTtlMs = 6 * 60 * 60 * 1000 } = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map();
  }

  async cnpjInfo(cnpj) {
    if (!cnpj || cnpj.length !== 14) return null;

    const cached = this.cache.get(cnpj);
    if (cached && cached.expires > Date.now()) return cached.data;

    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;

    try {
      const raw = await this._fetchJson(url);
      if (!raw) return null;

      const secondaryCnaes = Array.isArray(raw.cnaes_secundarios)
        ? raw.cnaes_secundarios
            .map((item) => ({
              code: (item.codigo || '').toString(),
              description: item.descricao || null
            }))
            .filter((c) => c.code && c.description)
        : [];

      // A BrasilAPI usa os campos `nome_fantasia` e `razao_social`.
      // Os campos `trade_name` / `company_name` não existem na resposta.
      const tradeName = raw.nome_fantasia || raw.razao_social || null;

      const data = {
        cnpj,
        trade_name: tradeName,
        cnae: (raw.cnae_fiscal || '').toString(),
        cnae_desc: raw.cnae_fiscal_descricao || null,
        secondary_cnaes: secondaryCnaes
      };

      this.cache.set(cnpj, { data, expires: Date.now() + this.cacheTtlMs });
      return data;
    } catch {
      return null;
    }
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let buf = '';
          res.on('data', (d) => {
            buf += d;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(buf));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = BrasilApiClient;
