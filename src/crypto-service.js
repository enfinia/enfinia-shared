const crypto = require('crypto');

/**
 * CryptoService
 *
 * Responsável por criptografar e descriptografar dados sensíveis
 * usando AES-256-CBC (reversível).
 */
class CryptoService {
  constructor() {
    this.secretKey = process.env.ENCRYPTION_KEY;

    if (!this.secretKey) {
      throw new Error('ENCRYPTION_KEY não configurada no arquivo .env');
    }

    if (this.secretKey.length < 32) {
      throw new Error('ENCRYPTION_KEY deve ter no mínimo 32 caracteres');
    }

    this.key = crypto.scryptSync(this.secretKey, 'salt', 32);
    this.algorithm = 'aes-256-cbc';
  }

  criptografar(texto) {
    if (texto === null || texto === undefined || texto === '') {
      return null;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(String(texto), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Erro ao criptografar:', error.message || error);
      return null;
    }
  }

  descriptografar(textoCriptografado) {
    if (!textoCriptografado || typeof textoCriptografado !== 'string') {
      return null;
    }

    try {
      const parts = textoCriptografado.split(':');

      if (parts.length !== 2) {
        throw new Error('Formato inválido de texto criptografado');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error.message || error);
      return null;
    }
  }

  criptografarJSON(objeto) {
    if (objeto === null || objeto === undefined) {
      return null;
    }

    try {
      const json = JSON.stringify(objeto);
      return this.criptografar(json);
    } catch (error) {
      console.error('Erro ao criptografar JSON:', error.message || error);
      return null;
    }
  }

  descriptografarJSON(textoCriptografado) {
    if (!textoCriptografado) {
      return null;
    }

    try {
      const json = this.descriptografar(textoCriptografado);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Erro ao descriptografar JSON:', error.message || error);
      return null;
    }
  }

  criptografarNumero(numero) {
    if (numero === null || numero === undefined) {
      return null;
    }

    return this.criptografar(String(numero));
  }

  descriptografarNumero(textoCriptografado) {
    if (!textoCriptografado) {
      return null;
    }

    const texto = this.descriptografar(textoCriptografado);
    if (!texto) {
      return null;
    }

    const numero = parseFloat(texto);
    return Number.isNaN(numero) ? null : numero;
  }

  mascararTexto(texto, mostrarInicio = 2, mostrarFim = 2) {
    if (!texto || typeof texto !== 'string') {
      return '****';
    }

    if (texto.length < 4) {
      return '****';
    }

    const inicio = texto.substring(0, mostrarInicio);
    const fim = texto.substring(texto.length - mostrarFim);
    const tamanhoMeio = Math.max(4, texto.length - mostrarInicio - mostrarFim);
    const meio = '*'.repeat(tamanhoMeio);

    return `${inicio}${meio}${fim}`;
  }

  mascararValor(valor) {
    if (valor === null || valor === undefined) {
      return 'R$ ****';
    }

    return 'R$ ****';
  }
}

module.exports = CryptoService;
