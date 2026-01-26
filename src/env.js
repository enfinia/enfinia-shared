// =============================================
// VARIÁVEIS DE AMBIENTE CENTRALIZADAS
// =============================================
// IMPORTANTE: Nunca inclua valores sensíveis hardcoded aqui!
// Todos os valores são lidos de process.env (Railway ou .env local)
// Valores default só para configurações NÃO sensíveis

const ENV = {
  // 🔐 DATABASE - Credenciais Supabase (OBRIGATÓRIAS)
  database: {
    get SUPABASE_URL() {
      return process.env.SUPABASE_URL;
    },
    get SUPABASE_KEY() {
      return process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  },

  // 🤖 OPENAI - API Keys (OBRIGATÓRIAS)
  openai: {
    get API_KEY() {
      return process.env.OPENAI_API_KEY;
    },
    get CONVERSATIONAL_MODEL() {
      return process.env.OPENAI_CONVERSATIONAL_MODEL || 'gpt-4o-mini';
    },
    get PLANNING_MODEL() {
      return process.env.OPENAI_PLANNING_MODEL || 'gpt-4o';
    }
  },

  // 🔌 PLUGGY - Open Finance (OBRIGATÓRIAS)
  pluggy: {
    get CLIENT_ID() {
      return process.env.PLUGGY_CLIENT_ID;
    },
    get CLIENT_SECRET() {
      return process.env.PLUGGY_CLIENT_SECRET;
    },
    get BASE_URL() {
      return process.env.PLUGGY_BASE_URL || 'https://api.pluggy.ai';
    },
    get DEFAULT_ACCOUNT_ID() {
      return process.env.PLUGGY_DEFAULT_ACCOUNT_ID;
    },
    get CONNECT_URL() {
      return process.env.PLUGGY_CONNECT_URL || 'https://connect.pluggy.ai';
    }
  },

  // 💳 ASSINATURA - Valores do produto (pode ter default)
  assinatura: {
    get VALOR() {
      return process.env.ASSINATURA_VALOR || "12,90";
    }
  },

  // 🌐 SERVIÇOS - URLs internas (para desenvolvimento local)
  services: {
    get BOT_GATEWAY_URL() {
      return process.env.BOT_GATEWAY_URL || 'http://localhost:4001';
    },
    get USER_SERVICE_URL() {
      return process.env.USER_SERVICE_URL || 'http://localhost:4002';
    },
    get IDENTITY_SERVICE_URL() {
      return process.env.IDENTITY_SERVICE_URL || 'http://localhost:4003';
    },
    get BASELINE_SERVICE_URL() {
      return process.env.BASELINE_SERVICE_URL || 'http://localhost:4004';
    },
    get TRANSACTION_SERVICE_URL() {
      return process.env.TRANSACTION_SERVICE_URL || 'http://localhost:4005';
    },
    get FILE_PROCESSING_SERVICE_URL() {
      return process.env.FILE_PROCESSING_SERVICE_URL || 'http://localhost:4006';
    },
    get SUMMARY_SERVICE_URL() {
      return process.env.SUMMARY_SERVICE_URL || 'http://localhost:4007';
    },
    get CONVERSATIONAL_AI_SERVICE_URL() {
      return process.env.CONVERSATIONAL_AI_SERVICE_URL || 'http://localhost:4008';
    },
    get BALANCE_SERVICE_URL() {
      return process.env.BALANCE_SERVICE_URL || 'http://localhost:4009';
    },
    get FINANCIAL_PLAN_SERVICE_URL() {
      return process.env.FINANCIAL_PLAN_SERVICE_URL || 'http://localhost:4010';
    },
    get ORCHESTRATION_SERVICE_URL() {
      return process.env.ORCHESTRATION_SERVICE_URL || 'http://localhost:4011';
    },
    get BACKOFFICE_SERVICE_URL() {
      return process.env.BACKOFFICE_SERVICE_URL || 'http://localhost:4012';
    }
  },

  // 🔧 AMBIENTE - Flags de configuração
  config: {
    get NODE_ENV() {
      return process.env.NODE_ENV || 'development';
    },
    get PORT() {
      return process.env.PORT || 3000;
    },
    get LOG_LEVEL() {
      return process.env.LOG_LEVEL || 'info';
    }
  }
};

# ===== 🌐 SERVIÇOS INTERNOS (OPCIONAL - usa localhost por padrão) =====
# Desenvolvimento local: não precisa definir
# Railway: use ${{service.variable}} para referenciar entre serviços

BOT_GATEWAY_URL=http://localhost:4001
USER_SERVICE_URL=http://localhost:4002
IDENTITY_SERVICE_URL=http://localhost:4003
BASELINE_SERVICE_URL=http://localhost:4004
TRANSACTION_SERVICE_URL=http://localhost:4005
FILE_PROCESSING_SERVICE_URL=http://localhost:4006
SUMMARY_SERVICE_URL=http://localhost:4007
CONVERSATIONAL_AI_SERVICE_URL=http://localhost:4008
BALANCE_SERVICE_URL=http://localhost:4009
FINANCIAL_PLAN_SERVICE_URL=http://localhost:4010
ORCHESTRATION_SERVICE_URL=http://localhost:4011
BACKOFFICE_SERVICE_URL=http://localhost:4012

# ===== 🔧 CONFIGURAÇÕES (OPCIONAL) =====
NODE_ENV=development
PORT=3000
LOG_LEVEL=info


module.exports = { ENV };
