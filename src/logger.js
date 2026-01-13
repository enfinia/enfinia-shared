class Logger {
  static info(mensagem, dados = null) {
    console.log(`ℹ️  ${new Date().toISOString()} - ${mensagem}`);
    if (dados) console.log('   📋 Dados:', dados);
  }

  static success(mensagem, dados = null) {
    console.log(`✅ ${new Date().toISOString()} - ${mensagem}`);
    if (dados) console.log('   📋 Dados:', dados);
  }

  static warning(mensagem, dados = null) {
    console.log(`⚠️  ${new Date().toISOString()} - ${mensagem}`);
    if (dados) console.log('   📋 Dados:', dados);
  }

  // Alias para compatibilidade
  static warn(mensagem, dados = null) {
    return this.warning(mensagem, dados);
  }

  static error(mensagem, erro = null) {
    console.error(`❌ ${new Date().toISOString()} - ${mensagem}`);
    if (erro) {
      console.error('   🔍 Erro:', erro.message || erro);
      if (process.env.NODE_ENV === 'development') {
        console.error('   🗂️  Stack:', erro.stack);
      }
    }
  }

  static debug(mensagem, dados = null) {
    if (process.env.DEBUG === 'true') {
      console.log(`🐛 ${new Date().toISOString()} - ${mensagem}`);
      if (dados) console.log('   📋 Dados:', dados);
    }
  }

  static trace(contexto, mensagem, dados = null) {
    if (process.env.TRACE === 'true' || process.env.DEBUG === 'true') {
      console.log(`🔎 ${new Date().toISOString()} - [${contexto}] ${mensagem}`);
      if (dados) console.log('   📋 Dados:', dados);
    }
  }

  // 📊 LOG DE MENSAGEM RECEBIDA
  static mensagemRecebida(telefone, texto) {
    console.log(`\n📨 ${new Date().toISOString()} - Mensagem de ${telefone}: "${this.truncarTexto(texto)}"`);
  }

  static truncarTexto(texto, maxLength = 50) {
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
  }

  // 👤 Log específico para identidade resolvida no BotGateway
  static identidadeProcessarMensagemDebug(telefone, identidade) {
    const resumo = {
      situacao: identidade?.situacao,
      accountId: identidade?.accountId,
      userId: identidade?.userId,
      leadId: identidade?.leadId,
      accountStatus: identidade?.accountStatus,
      accountStep: identidade?.accountStep
    };

    this.debug(`👤 Identidade resolvida para mensagem de ${telefone}`, resumo);
  }
}

module.exports = Logger;
