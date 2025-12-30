// Configurações compartilhadas de variáveis da plataforma Enfinia
// Este arquivo substitui o antigo `utils/variables.js` do monolito.
// Ajuste aqui as distribuições e outros parâmetros globais.

// =============================================
// APP VARIABLES (Page Object)
// Centraliza variáveis de domínio e flags para facilitar ajustes futuros.
// Use este arquivo para definir parâmetros usados em toda a aplicação.
// =============================================

const { supabase } = require('../lib/supabase-client');

// Cache de categorias do banco
let categoriesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Mapeamento de emojis por categoria
const CATEGORY_EMOJIS = {
  '1': '💰',  // renda
  '2': '🏦',  // reserva
  '3': '🏠',  // moradia
  '4': '💡',  // utilidades
  '5': '🍽️',  // alimentação
  '6': '🚌',  // transporte
  '7': '🎓',  // educação
  '8': '🩺',  // despesas com saúde
  '9': '🐶',  // pet
  '10': '🎉', // lazer e entretenimento
  '11': '💆', // cuidados pessoais
  '12': '🛍️', // compras pessoais
  '13': '🧾', // dívidas
  '14': '📈', // dívida ativa
  '15': '📋', // impostos
  '16': '💵', // aporte
  '17': '📦'  // outros gastos
};

// =============================================
// STEPS NUMÉRICOS
// Sistema de controle de fluxo baseado em números
// =============================================

const STEPS = {
  // HASH STEPS - Controla estado do hash/contato
  HASH: {
    LEAD: 1,          // Usuário é lead (não ativado)
    USER: 2           // Usuário ativo
  },
  
  // ACCOUNT STEPS - Controla estado da conta
  ACCOUNT: {
    PENDENTE_INICIO: 1,             // Aguardando escolha: criar plano agora ou depois
    SEM_ONBOARDING: 2,              // Escolheu começar sem plano (só transações)
    BASELINE_EM_ANDAMENTO: 3,       // Preenchendo baseline
    PENDENTE_PLANEJAMENTO: 4,       // Baseline concluído, aguardando planejamento
    PLANEJAMENTO_EM_ANDAMENTO: 5,   // Preenchendo planejamento
    AGUARDANDO_RESPOSTA_CONTATOS_ADICIONAIS: 6,  // Perguntando sobre adicionar contatos
    ONBOARDING_COMPLETO: 7          // Tudo concluído
  },
  
  // BASELINE STEPS - Controla progresso do questionário
  BASELINE: {
    PENDENTE: 0,      // Não iniciou
    CONCLUIDO: 100    // Finalizou todas as perguntas
    // De 1 a 99 = índice da última pergunta respondida
  }
};

const padroesBase = {
  // ENTRADAS
  ENTRADA: {
    'Salário': ['salario', 'salário', 'holerite', 'folha pagamento', 'pagamento', 'pro-labore'],
    'Prestação de serviços': ['serviço', 'servico', 'consultoria', 'freela', 'freelancer', 'honorário', 'recebido', 'recebida', 'recebemos', 'recebemos de'],
    'Venda de produtos': ['venda', 'produto', 'mercadoria', 'item', 'vendemos', 'vendemos de'],
    'Reembolso': ['reembolso', 'devolução', 'devolucao', 'restituição']
  },
  
  // SAÍDAS
  SAIDA: {
    // ESSENCIAIS
    'Moradia': ['aluguel', 'financiamento', 'condomínio', 'condominio', 'imobiliária', 'imobiliaria', 'hipoteca', 'casa', 'apartamento'],
    'Utilidades': ['água', 'agua', 'luz', 'energia', 'gás', 'gas', 'internet', 'telefone', 'celular', 'conta de luz', 'conta de água'],
    'Alimentação': ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanche', 'ifood', 'uber eats', 'comida', 'alimentação', 'feira', 'açougue', 'hortifruti', 'almoço', 'almoco', 'jantar', 'janta', 'café', 'cafe', 'refeição', 'refeicao', 'almoçar', 'almocar', 'jantar'],
    'Transporte': ['uber', '99', 'taxi', 'posto', 'combustível', 'combustivel', 'metro', 'ônibus', 'onibus', 'transporte', 'estacionamento', 'pedágio', 'pedagio', 'viacao', 'viação', 'rodoviaria', 'rodoviária'],
    'Educação': ['faculdade', 'curso', 'livraria', 'material escolar', 'escola', 'universidade', 'mensalidade', 'livro', 'aula', 'treinamento', 'livros'],
    'Saúde': ['saúde', 'saude', 'farmacia', 'farmácia', 'drogaria', 'drogarias', 'médico', 'medico', 'hospital', 'consulta', 'medicina', 'remedio', 'remédio', 'medicamento', 'medicamentos', 'plano de saúde', 'plano de saude'],
    'Pet': ['pet', 'animal', 'cachorro', 'gato', 'cão', 'animal de estimação', 'animal de estimacao', 'animal de companhia', 'ração', 'racao', 'racão', 'petshop', 'pet shop', 'veterinário', 'veterinario', 'banho e tosa', 'tosa', 'agro', 'agropecuaria', 'agropecuária', 'agromaquinas', 'agromáquinas'],

    // NÃO ESSENCIAIS
    'Lazer e entretenimento': ['cinema', 'mercado*', 'netflix', 'spotify', 'parque', 'lazer', 'entretenimento', 'show', 'teatro', 'streaming', 'jogo', 'games', 'game', 'playstation', 'xbox', 'nintendo', 'diversão', 'diversao'],
    'Compras pessoais': ['roupa', 'roupas', 'calçado', 'calcado', 'vestuário', 'acessório', 'camisa', 'camiseta', 'blusa', 'vestido', 'calça', 'calca', 'short', 'shorts', 'bermuda', 'saia', 'casaco', 'jaqueta', 'tenis', 'tênis', 'sapato', 'sapatos', 'bota', 'sandalia', 'sandália', 'chinelo', 'oculos', 'óculos', 'otica', 'ótica', 'optica', 'óptica', 'shopping dos oculos', 'lente', 'lentes', 'lente de contato', 'óculos de sol'],
    // 'Compras de internet': ['mercado pago', 'mercadopago', 'mercado livre', 'mercadolivre', 'shopee', 'shein', 'amazon', 'aliexpress', 'magalu', 'magazineluiza', 'americanas', 'casas bahia', 'extra', 'netshoes', 'zara', 'renner', 'marketplace', 'ecommerce', 'e-commerce', 'loja virtual', 'compra online', 'mercado*'],
    'Cuidados pessoais': ['academia', 'estética', 'estetica', 'salão', 'cabelereiro', 'spa'],

    // DÍVIDAS
    'Cartão de crédito': ['cartão', 'cartao', 'fatura cartão', 'mastercard', 'visa', 'fatura', 'credicard', 'parcela', 'parcela cartão', 'parcela cartao', 'parcelada', 'parcelada cartão', 'parcelada cartao', 'parcelado', 'parcelado cartão', 'parcelado cartao'],
    'Empréstimos': ['empréstimo', 'emprestimo', 'consignado', 'parcela empréstimo'],
    'Financiamentos': ['financiamento', 'parcela', 'prestação', 'parcela carro', 'parcela casa'],
    'Juros e tarifas': ['juros', 'tarifa', 'anuidade', 'taxa', 'multa', 'iof'],

    // OBRIGAÇÕES LEGAIS
    'Impostos': ['imposto', 'irpf', 'iptu', 'ipva', 'dar', 'iss', 'icms'],
    'Contribuições': ['inss', 'contribuição', 'contribuicao', 'fgts', 'pis'],
    'Custos administrativos': ['nota fiscal', 'certificado', 'registro', 'documento', 'procuração'],

    // INVESTIMENTOS
    'Aportes': ['aporte', 'investimento', 'aplicação', 'cdb', 'lci', 'lca'],
    'Fundos': ['fundo', 'fii', 'fundo imobiliário', 'fundo de investimento'],
    'Previdência': ['previdência', 'previdencia', 'privada', 'vgbl', 'pgbl'],
    'Ativos': ['ação', 'acao', 'tesouro', 'bolsa', 'b3', 'dividendo']
  },

  // Método auxiliar para obter todos os padrões em um único objeto (para compatibilidade)
  obterTodos() {
    return {
      ...this.ENTRADA,
      ...this.SAIDA
    };
  }
};

function buildTermosPadrao(chaves = [], extras = []) {
  const termos = [];
  for (const chave of chaves) {
    if (padroesBase.ENTRADA[chave]) {
      termos.push(...padroesBase.ENTRADA[chave]);
      continue;
    }
    if (padroesBase.SAIDA[chave]) {
      termos.push(...padroesBase.SAIDA[chave]);
    }
  }
  if (Array.isArray(extras)) {
    termos.push(...extras);
  }
  return Array.from(new Set(
    termos
      .map(t => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean)
  ));
}

function criarRegraDescricaoPorPadrao(chavesPadrao, config = {}) {
  const listaChaves = Array.isArray(chavesPadrao) ? chavesPadrao : [chavesPadrao];
  return {
    nome: config.nome || listaChaves[0],
    termos: buildTermosPadrao(listaChaves, config.termosExtras || []),
    categoria: config.categoria || listaChaves[0],
    subcategoria: config.subcategoria || null,
    ignorarMarketplaces: Boolean(config.ignorarMarketplaces)
  };
}

function criarInferenciaPorPadrao(config = {}) {
  const base = config.usarSomenteExtras
    ? []
    : buildTermosPadrao(config.padroes || [], []);
  const palavras = Array.from(new Set([
    ...base,
    ...((config.palavrasExtras && Array.isArray(config.palavrasExtras)) ? config.palavrasExtras : [])
  ].map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)));
  return {
    categoria: config.categoria,
    subcategoria: config.subcategoria || null,
    palavras
  };
}

const AppVars = {
  trial: {
    // Limite de arquivos que podem ser enviados no trial
    LIMITE_ARQUIVOS: 5,
    // Número de meses históricos permitidos no trial
    MESES_HISTORICO: 6,
    // Trial é consumido após primeira análise completa
    CONSUMO_APOS_ANALISE: true
  },

  arquivos: {
    // Período padrão analisado em meses
    PERIODO_MESES: 3,
    // Limite de arquivos por mês
    LIMITE_POR_MES: 10,
    // Limite total de arquivos no período
    LIMITE_TOTAL_PERIODO: 30,
    // Tamanho máximo por arquivo (MB)
    TAMANHO_MAX_ARQUIVO_MB: 10,
    // Volume total máximo permitido no período (MB)
    VOLUME_TOTAL_MAX_MB: 150,
    // Extensões permitidas
    EXTENSOES_PERMITIDAS: ['.csv', '.pdf'],
    // Mimetypes permitidos
    MIMETYPES_PERMITIDOS: ['text/csv', 'application/csv', 'text/plain', 'application/pdf']
  },

  assinatura: {
    // Categorias consideradas "fixas" (mantêm valor integral)
    VALOR: "12,90",     
    
  },

  analise: {
    // Número de meses completos anteriores considerados nas médias
    MESES_COMPLETOS: 6,
    // Limite máximo de transações carregadas para análise
    LIMITE_TRANSACOES: 1000,
    // Modo de cálculo para médias por categoria:
    // 'global' -> divide pelo número de meses reais analisados (mesesReais)
    // 'ajustada' -> divide somente pelos meses em que a categoria apareceu (mesesAtivos)
    // 'ambas' -> mantém ambas disponíveis e permite escolha dinâmica na apresentação
    MEDIA_CATEGORIA_MODO: 'ajustada'
  },

  distribuicao: {
    // Regras de distribuição padrão
    REGRAS: {
      '50/30/20': { essenciais: 50, naoEssenciais: 30, investimentos: 20 },
      '70/20/10': { essenciais: 70, naoEssenciais: 20, investimentos: 10 },
      '60/20/20': { essenciais: 60, naoEssenciais: 20, investimentos: 20 },
      '80/20': { essenciais: 80, naoEssenciais: 15, investimentos: 5 },
    },
    obterRegra(nome = '50/30/20') {
      return this.REGRAS[nome] || this.REGRAS['50/30/20'];
    }
  },

  planejamento: {
    // Tempo de expiração de propostas (em milissegundos)
    EXPIRACAO_PROPOSTA: 30 * 60 * 1000, // 30 minutos
    
    // Regras de distribuição disponíveis
    REGRAS_DISPONIVEIS: {
      '50/30/20': { essenciais: 50, naoEssenciais: 30, investimentos: 20 },
      '70/20/10': { essenciais: 70, naoEssenciais: 20, investimentos: 10 },
      '80/20': { essenciais: 80, naoEssenciais: 15, investimentos: 5 },
      '60/20/20': { essenciais: 60, naoEssenciais: 20, investimentos: 20 },
      'personalizada': null
    },
    
    // Mapeia tipos de categoria (da estrutura) para buckets 50/30/20
    // Mantém comportamento atual: Dívidas entram como não-essenciais; Obrigações legais como essenciais
    TIPO_PARA_BUCKET: {
      'Essencial': 'essenciais',
      'Não essencial': 'naoEssenciais',
      'Investimento': 'investimentos',
      'Dívida': 'naoEssenciais',
      'Obrigação legal': 'essenciais'
    }
  },

  categorias: {
    // Categorias consideradas "fixas" (mantêm valor integral)
    FIXAS: [
      'moradia','aluguel','financiamento','condominio','condomínio',
      'faculdade','educacao','educação','internet','agua','água','luz','gas','gás'
    ],
    
    // Tipos de expense_type
    EXPENSE_TYPES: {
      FIXED: 'fixed',
      VARIABLE: 'variable',
      OCCASIONAL: 'occasional'
    },

    // Estrutura completa para baseline financeiro
    // Hierarquia: nature → category → subcategory → expense_type
    BASELINE: {
      // ========================================
      // RECEITAS (nature: credit)
      // ========================================
      receitas: {
        nature: 'credit',
        titulo: '🟦 RECEITAS (ENTRADAS)',
        ordem: 1,
        categorias: {
          trabalho: {
            titulo: '💰 Receitas',
            index: 1,
            itens: [
              { nome: 'renda', expenseType: 'fixed', essentiality: true, pergunta: 'Qual o valor da sua renda mensal (líquida)? Adicione vale alimentação/refeição e/ou outras entradas. \n\n _Se compartilha com alguém, informe o valor total._' },
            ]
          }
        }
      },

      /* reserva: {
        nature: 'investment',
        titulo: '🟦 RESERVA',
        index: 2,
        ordem: 1.5,
        categorias: {
          reservas: {
            titulo: '💰 Reservas',
            index: 2,
            itens: [
              { nome: 'reserva', expenseType: 'fixed', essentiality: false, pergunta: 'Possui reserva financeira? Qual o valor?' }
            ]
          }
        }
      }, */
                
      // ========================================
      // DESPESAS ESSENCIAIS (nature: debit)
      // ========================================
      despesas_essenciais: {
        nature: 'debit',
        titulo: '🟩 DESPESAS ESSENCIAIS',
        ordem: 2,
        categorias: {
          moradia: {
            titulo: '🏠 Moradia',
            index: 3,
            itens: [
              { nome: 'moradia', expenseType: 'fixed', essentiality: true, pergunta: 'Paga aluguel, taxa de condomínio ou financiamento de moradia? Qual o valor mensal?' },
            ]
          },
            utilidades: {
            titulo: 'Utilidades',
            index: 4,
            itens: [
              { nome: 'utilidades', expenseType: 'variable', essentiality: true, pergunta: 'Qual a média mensal de gasto com água/luz/gás/internet e telefone?' },
            ]
          },
          alimentacao: {
            titulo: '🍽️ Alimentação',
            index: 5,
            itens: [
              { nome: 'alimentação', expenseType: 'variable', essentiality: true, pergunta: 'Em média qual o gasto mensal com alimentação (supermercado, delivery, restaurante)?' }
            ]
          },
          transporte: {
            titulo: '🚌 Transporte',
            index: 6,
            itens: [
              { nome: 'transporte', expenseType: 'variable', essentiality: true, pergunta: 'Em média qual o gasto mensal com transporte (combustível, Uber/99, transporte público, estacionamento, pedágio)?' }
            ]
          },
          educacao: {
            titulo: '🎓 Educação',
            index: 7,
            itens: [
              { nome: 'educação', expenseType: 'fixed', essentiality: true, pergunta: 'Tem algum gasto recorrente com material didático, cursos, faculdade? Quanto?' }
            ]
          },
         /*  saude: {
            titulo: '🩺 Saúde',
            index: 8,
            itens: [
              { nome: 'despesas com saúde', expenseType: 'fixed', essentiality: true, pergunta: 'Tem plano de saúde? Paga algum tratamento? Gastos recorrentes em fármacia? Qual o valor?' },
            ]
          },*/
          pet: {
            titulo: '🐶 Pet',
            index: 9,
            itens: [
              { nome: 'pet', expenseType: 'variable', essentiality: true, pergunta: 'Tem pet? Sabe a média de gasto mensal?' },
            ]
          } 
        }
      },
      
      // ========================================
      // DESPESAS NÃO ESSENCIAIS (nature: debit)
      // ========================================
      despesas_nao_essenciais: {
        nature: 'debit',
        titulo: '🟧 DESPESAS NÃO ESSENCIAIS',
        ordem: 3,
        categorias: {
          lazer: {
            titulo: '🎉 Lazer e entretenimento',
            index: 10,
            itens: [
              { nome: 'lazer e entretenimento', expenseType: 'variable', essentiality: false, pergunta: 'Sabe a média de gasto mensal com lazer e entretenimento (cinema, passeios, netflix, spotify)?' },
            ]
          },
          /*  assinaturas: {
            titulo: 'Assinaturas',
            index: 11,
            itens: [
              { nome: 'streaming', expenseType: 'fixed', essentiality: false, pergunta: 'E gastos com Netflix, Spotify? Qual o valor total?' }
            ]
          }, */
          cuidados_pessoais: {
            titulo: '💆 Cuidados pessoais',
            index: 11,
            itens: [
              { nome: 'cuidados pessoais', expenseType: 'variable', essentiality: false, pergunta: 'Custo com academia, cabelo, estética, saúde? Qual o valor mensal?' }
            ]
          },
          compras_pessoais: {
            titulo: '💆 Compras pessoais',
            index: 12,
            itens: [
              { nome: 'compras pessoais', expenseType: 'variable', essentiality: false, pergunta: 'Roupas, acessórios? Qual o valor mensal?' }
            ]
          }
        }
      },
      
      // ========================================
      // FINANCEIRO - Dívidas (nature: debit)
      // ========================================
      financeiro: {
        nature: 'debit',
        titulo: '🟥 FINANCEIRO',
        ordem: 4,
        categorias: {
          dividas: {
            titulo: '🏦 Dívidas',
            index: 13,
            itens: [
              { nome: 'dívidas', expenseType: 'fixed', essentiality: true, pergunta: 'Tem empréstimo, financiamento de carro, alguma parcela em andamento? De quanto?' }
            ]
          }
        }
      },
      
      // ========================================
      // DÍVIDA ATIVA - Patrimônio negativo (nature: active_debt)
      // ========================================
    /*   divida_ativa: {
        nature: 'active_debt',
        titulo: '💳 DÍVIDA ATIVA',
        ordem: 4.5,
        categorias: {
          divida_ativa: {
            titulo: '💳 Dívida ativa',
            index: 14,
            itens: [
              { nome: 'dívida ativa', expenseType: 'occasional', essentiality: true, pergunta: 'Tem dívida ativa que ainda precisa negociar (compõe patrimônio negativo)? Qual o valor total atualizado?' }
            ]
          }
        }
      }, */
      
      // ========================================
      // OBRIGAÇÕES LEGAIS (nature: debit)
      // ========================================
      obrigacoes_legais: {
        nature: 'debit',
        titulo: '🟨 OBRIGAÇÕES LEGAIS',
        ordem: 5,
        categorias: {
          impostos: {
            titulo: '🧾 Impostos',
            index: 15,
            itens: [
              { nome: 'impostos', expenseType: 'fixed', essentiality: true, pergunta: 'Paga IPTU/IPVA? Qual o valor mensal?' }
            ]
          },
        }
      },
      
      // ========================================
      // INVESTIMENTOS (nature: debit)
      // ========================================
    /*   investimentos: {
        nature: 'debit',
        titulo: '🟦 INVESTIMENTOS',
        ordem: 6,
        categorias: {
          aportes: {
            titulo: '📈 Aportes',
            index: 16,
            itens: [
              { nome: 'aporte', expenseType: 'variable', essentiality: false, pergunta: 'Faz aportes mensais? Quanto em média?' }
            ]
          },
        }
      } */
    },
    
    // Estrutura hierárquica de categorias (entrada/saída) com tipo e emoji
    // MANTIDO PARA COMPATIBILIDADE COM CÓDIGO EXISTENTE
    ESTRUTURA: {
      entrada: {
        'Salário': { tipo: 'Renda fixa', emoji: '💰' },
        'Prestação de serviços': { tipo: 'Renda variável', emoji: '💼' },
        'Venda de produtos': { tipo: 'Renda variável', emoji: '📦' },
        'Reembolso': { tipo: 'Renda variável', emoji: '🔄' },
        'Resgate': { tipo: 'Investimento', emoji: '❓' },
        'Outros': { tipo: 'Renda variável', emoji: '❓' }
      },
      saida: {
        // Essencial
        'Moradia': { tipo: 'Essencial', emoji: '🏠' },
        'Utilidades': { tipo: 'Essencial', emoji: '💡' },
        'Alimentação': { tipo: 'Essencial', emoji: '🍎' },
        'Transporte': { tipo: 'Essencial', emoji: '🚗' },
        'Educação': { tipo: 'Essencial', emoji: '📚' },
        'Saúde': { tipo: 'Essencial', emoji: '🏥' },
        'Pet': { tipo: 'Essencial', emoji: '🐶' },
        // Não essencial
        'Lazer e entretenimento': { tipo: 'Não essencial', emoji: '🎯' },
        'Compras pessoais': { tipo: 'Não essencial', emoji: '🛍️' },
       // 'Compras de internet': { tipo: 'Não essencial', emoji: '🌐' },
        'Cuidados pessoais': { tipo: 'Não essencial', emoji: '💅' },

        // Dívida
        //'Cartão de crédito': { tipo: 'Dívida', emoji: '💳' },
        'Empréstimos': { tipo: 'Dívida', emoji: '🏦' },
        'Financiamentos': { tipo: 'Dívida', emoji: '📊' },
        'Juros e tarifas': { tipo: 'Dívida', emoji: '💸' },

        // Obrigação legal
        'Impostos': { tipo: 'Obrigação legal', emoji: '⚖️' },
        'Contribuições': { tipo: 'Obrigação legal', emoji: '📋' },
        'Custos administrativos': { tipo: 'Obrigação legal', emoji: '📑' },

        // Investimento
        'Aportes': { tipo: 'Investimento', emoji: '📈' },
        'Fundos': { tipo: 'Investimento', emoji: '🏛️' },
        'Previdência': { tipo: 'Investimento', emoji: '👵' },
        'Ativos': { tipo: 'Investimento', emoji: '💎' },

        'Outros': { tipo: 'Não essencial', emoji: '❓' }
      }
    }
  },

  // Normalização e sinônimos de fluxo
  fluxo: {
    SINONIMOS: {
      saida: ['saída', 'saida', 'saíd', 'pagamento', 'pagto', 'paguei', 'gastei', 'gasto', 'gastos', 'desconto', 'debito automatico', 'debito', 'débito automatico', 'débito', 'taxa', 'tarifa', 'compra', 'comprei', 'boleto', 'pix enviado', 'transferencia enviada', 'transferência enviada', 'pagamento de boleto', 'boleto efetuado', 'boleto pago', 'pix pago', 'pix efetuado', 'pix realizado', 'cobrança', 'cobranca', 'estabelecimento'],
      entrada: ['entrada', 'entrad', 'recebida', 'recebido', 'recebi', 'ganhei', 'estorno', 'reembolso', 'ajuste', 'pix recebido', 'transferencia recebida', 'transferência recebida', 'deposito', 'depósito', 'creditado', 'salario', 'salário', 'receita', 'entrada', 'provento']
    },
    normalizar(valor) {
      if (!valor) return 'saida';
      const v = String(valor).toLowerCase();
      if (this.SINONIMOS.saida.some(s => v.includes(s))) return 'saida';
      if (this.SINONIMOS.entrada.some(s => v.includes(s))) return 'entrada';
      return v;
    }
  },

  ui: {
    usarEmojis: true,
  },

  features: {
    habilitarGastosCommand: true,
  },

  categorizacao: {
    // 🚪 GATEKEEPER - Indicadores de fatura de cartão
    indicadoresFatura: [
      /\bfatura\s+(cartao|cartão)\b/i,
      /\bcartao\s+de\s+credito\b/i,
      /\bparcela\s+\d+\s*\/\s*\d+/i,
      /\bvencimento\s+\d{2}\/\d{2}/i,
      /\bestorno\s+cartao/i,
      /\bcredicard|mastercard|visa|elo\b/i,
      /\bcompra\s+parcelada/i,
      /\bminha\s+fatura/i
    ],

    // 💡 CONTAS CONHECIDAS (Água, Luz, Internet)
    contasConhecidas: {
      'CEMIG': { categoria: 'Utilidades', subcategoria: 'Energia Elétrica' },
      'ENEL': { categoria: 'Utilidades', subcategoria: 'Energia Elétrica' },
      'COPEL': { categoria: 'Utilidades', subcategoria: 'Energia Elétrica' },
      'CPFL': { categoria: 'Utilidades', subcategoria: 'Energia Elétrica' },
      'SANEAR': { categoria: 'Utilidades', subcategoria: 'Água e Esgoto' },
      'COPASA': { categoria: 'Utilidades', subcategoria: 'Água e Esgoto' },
      'SABESP': { categoria: 'Utilidades', subcategoria: 'Água e Esgoto' },
      'CAGEPA': { categoria: 'Utilidades', subcategoria: 'Água e Esgoto' },
      'VIVO': { categoria: 'Utilidades', subcategoria: 'Telefone/Internet' },
      'TIM': { categoria: 'Utilidades', subcategoria: 'Telefone/Internet' },
      'CLARO': { categoria: 'Utilidades', subcategoria: 'Telefone/Internet' },
      'OI': { categoria: 'Utilidades', subcategoria: 'Telefone/Internet' },
      'NET': { categoria: 'Utilidades', subcategoria: 'Internet' },
      'OI FIBRA': { categoria: 'Utilidades', subcategoria: 'Internet' }
    },

    // 📱 PIX - Palavras que indicam empresa
    palavrasEmpresa: ['ltda', 'me', 'eireli', 'sa', 's.a.', 'empresa', 'comercio', 'comércio', 'servicos', 'serviços'],

    // 📱 PIX - Padrão regex para extrair nome comercial
    padraoNomePix: /(?:pix|transferencia|transferência)[\s-]+(?:enviada|enviado|recebida|recebido)[\s-]+(?:pelo|por|de)[\s-]+(.+?)(?:[\s-]+\d{2}\.\d{3}\.\d{3})/i,

    // 🎯 SISTEMA DE SCORE - Pesos para cálculo de precisão
    pesosScore: {
      cnaePrimario: 70,        // CNAE principal → 70% do peso
      cnaeSecundario: 20,      // CNAE secundário → 20% do peso
      nomeFantasia: 10,        // Nome fantasia → 10% do peso
      matchHistorico: 20,      // Match histórico → bônus
      matchPadroesDescricao: 15 // Padrões de descrição → bônus
    },

    // 🎯 SISTEMA DE SCORE - Limites de confiança
    limitesScore: {
      alto: 90,      // Score >= 90 → alta confiança (0.95)
      medio: 70,     // Score 70-89 → confiança média (0.8)
      baixo: 0       // Score < 70 → confiança baixa (0.6)
    },

    // 🎯 SISTEMA DE SCORE - Valores de confiança por faixa
    confiancaPorScore: {
      alto: 0.95,
      medio: 0.8,
      baixo: 0.6
    },

    // 🚪 GATEKEEPER - Valores de confiança/precisão
    confiancaGatekeeper: {
      cpf: 0.95,
      faturaCartao: 0.9,
      contaUtilidade: 0.95,
      pixPessoaFisica: 0.85,
      pixGenerico: 0.8
    },

    // 🎯 PRECISÃO MÍNIMA PARA USAR CATEGORIA DIRETAMENTE
    precisaoMinima: 0.9,  // 90%

    // 🛒 MARKETPLACES - Mapa unificado por descrição e CNPJ
    marketplaces: {
      // Mercado Livre / Mercado Pago
      'MERCADO LIVRE': {
        label: 'Mercado Livre',
        termos: ['mercado livre', 'mercadolivre', 'mercado pago', 'mercadopago'],
        cnpjs: [
          '10573521000191' // MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA
        ]
      },
      // Amazon Brasil
      'AMAZON': {
        label: 'Amazon',
        termos: ['amazon', 'amazon.com.br', 'amazon marketplace'],
        cnpjs: [
          '15436940000103' // AMAZON SERVICOS DE VAREJO DO BRASIL LTDA
        ]
      },
      // Magazine Luiza
      'MAGALU': {
        label: 'Magazine Luiza',
        termos: ['magalu', 'magazine luiza', 'magazineluiza'],
        cnpjs: []
      },
      // Americanas
      'AMERICANAS': {
        label: 'Americanas',
        termos: ['americanas', 'americanas.com'],
        cnpjs: []
      },
      // Submarino
      'SUBMARINO': {
        label: 'Submarino',
        termos: ['submarino'],
        cnpjs: []
      },
      // Shoptime
      'SHOPTIME': {
        label: 'Shoptime',
        termos: ['shoptime'],
        cnpjs: []
      },
      // AliExpress
      'ALIEXPRESS': {
        label: 'AliExpress',
        termos: ['aliexpress', 'ali express'],
        cnpjs: []
      },
      // Shopee
      'SHOPEE': {
        label: 'Shopee',
        termos: ['shopee'],
        cnpjs: []
      },
      // OLX
      'OLX': {
        label: 'OLX',
        termos: ['olx'],
        cnpjs: []
      },
      // Via Varejo / Casas Bahia / Ponto / Extra
      'VIA': {
        label: 'Via',
        termos: ['via', 'via varejo', 'casas bahia', 'ponto', 'pontofrio', 'extra'],
        cnpjs: []
      }
    },

    assinaturaStreamingCategoriaPadrao: {
      categoria: 'Lazer e entretenimento',
      subcategoria: 'Streaming'
    },

    assinaturasStreaming: [
      {
        label: 'Netflix',
        termos: ['netflix']
      },
      {
        label: 'Amazon Prime Video',
        termos: ['amazon prime video', 'prime video', 'primevideo', 'amazon prime', 'amazonvideo']
      },
      {
        label: 'Disney+',
        termos: ['disney+', 'disney plus', 'disneyplus', 'combo+', 'combo plus']
      },
      {
        label: 'Star+',
        termos: ['star+', 'star plus', 'starplus']
      },
      {
        label: 'HBO Max',
        termos: ['hbo max', 'hbomax', 'max app', 'max hbo']
      },
      {
        label: 'Paramount+',
        termos: ['paramount+', 'paramount plus', 'paramountplus']
      },
      {
        label: 'Apple TV+',
        termos: ['apple tv', 'apple tv+', 'apple tv plus', 'google apple tv']
      },
      {
        label: 'Globoplay',
        termos: ['globoplay']
      },
      {
        label: 'Lionsgate+',
        termos: ['lionsgate+', 'lionsgate plus', 'starzplay', 'starz play']
      },
      {
        label: 'MUBI',
        termos: ['mubi']
      },
      {
        label: 'Telecine Play',
        termos: ['telecine', 'telecine play', 'telecine app']
      }
    ],

    // 🧾 Regras específicas para categorizar compras de fatura usando somente a descrição
    regrasDescricaoFatura: [
      criarRegraDescricaoPorPadrao('Alimentação', {
        nome: 'Mercados locais',
        subcategoria: 'Supermercado',
        ignorarMarketplaces: true,
        termosExtras: ['hortifruti', 'mercearia', 'sacolao', 'sacolão']
      }),
      criarRegraDescricaoPorPadrao('Pet', {
        nome: 'Agropecuarias e pet shops',
        categoria: 'Pet',
        subcategoria: 'Pet',
        termosExtras: ['agropecuaria', 'agropecuária', 'agro santa', 'agropec', 'agro pet', 'agromaquinas', 'agromáquinas']
      }),
      criarRegraDescricaoPorPadrao('Moradia', {
        nome: 'Materiais de construção locais',
        subcategoria: 'Reforma',
        ignorarMarketplaces: true,
        termosExtras: ['mat construc', 'tintas', 'portas e janelas', 'ferragens', 'pisos e revestimentos', 'loja de construção', 'loja de construcao']
      }),
      criarRegraDescricaoPorPadrao('Compras pessoais', {
        nome: 'Óticas e acessórios',
        subcategoria: 'Acessórios',
        termosExtras: ['shopping dos oculos', 'óptica', 'otica', 'oculos']
      }),
      criarRegraDescricaoPorPadrao('Compras pessoais', {
        nome: 'Moda íntima e pijamas',
        subcategoria: 'Roupas',
        termosExtras: ['pijamas']
      }),
      criarRegraDescricaoPorPadrao('Saúde', {
        nome: 'Farmácias regionais',
        subcategoria: 'Medicamentos',
        termosExtras: ['drogaria', 'drogarias', 'drogaria araujo', 'drogaria araujo filial', 'pague menos a0561a']
      }),
      criarRegraDescricaoPorPadrao('Moradia', {
        nome: 'Serviços domésticos',
        subcategoria: 'Serviços residenciais',
        termosExtras: ['lavanderia']
      }),
      criarRegraDescricaoPorPadrao('Alimentação', {
        nome: 'Restaurantes locais',
        subcategoria: 'Restaurante',
        termosExtras: ['pizza', 'churrascaria', 'lanchonete', 'sorveteria', 'hamburgueria']
      }),
      // Transporte em fatura: Passaro Marron Web
      criarRegraDescricaoPorPadrao('Transporte', {
        nome: 'Passaro Marron Web',
        categoria: 'Transporte',
        subcategoria: 'Passaro Marrom',
        termosExtras: ['passaro marron web', 'passaro marrom', 'passaro marron']
      }),
      criarRegraDescricaoPorPadrao('Custos administrativos', {
        nome: 'Serviços e seguros financeiros',
        subcategoria: 'Serviços financeiros',
        termosExtras: ['seguro vida', 'plano nucel', 'nutag']
      }),
      criarRegraDescricaoPorPadrao('Compras pessoais', {
        nome: 'Estornos marketplace',
        subcategoria: 'Reembolsos',
        termosExtras: ['estorno']
      })
    ],

    // 🧠 INFERÊNCIA DE CATEGORIA POR RESPOSTA DO USUÁRIO
    // Mapeia palavras-chave da resposta do usuário para categoria/subcategoria
    inferenciaResposta: {
      // Livros e Educação
      livro: criarInferenciaPorPadrao({
        categoria: 'Educação',
        subcategoria: 'Livros',
        padroes: ['Educação'],
        palavrasExtras: ['livro', 'livros', 'ebook', 'biblioteca', 'leitura'],
        usarSomenteExtras: true
      }),
      educacao: criarInferenciaPorPadrao({
        categoria: 'Educação',
        subcategoria: 'Material educacional',
        padroes: ['Educação'],
        palavrasExtras: ['material escolar', 'caderno', 'caneta', 'lápis', 'mochila']
      }),
      
      // Moda e Vestuário
      moda: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Roupas',
        padroes: ['Compras pessoais'],
        palavrasExtras: ['moda', 'pijama', 'camisa', 'blusa', 'vestido', 'calça', 'short', 'bermuda', 'saia', 'casaco', 'jaqueta']
      }),
      calcados: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Calçados',
        padroes: ['Compras pessoais'],
        palavrasExtras: ['tenis', 'tênis', 'sapato', 'sandalia', 'sandália', 'chinelo', 'bota', 'sapatilha']
      }),
      acessorios: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Acessórios',
        padroes: ['Compras pessoais'],
        palavrasExtras: ['acessório', 'acessórios', 'bolsa', 'mochila', 'carteira', 'relogio', 'relógio', 'oculos', 'óculos', 'joia', 'jóia', 'cinto', 'lenço', 'lenço de bolso']
      }),
      
      // Eletrônicos
      eletronicos: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Eletrônicos',
        padroes: [],
        palavrasExtras: ['fone', 'headset', 'teclado', 'mouse', 'monitor', 'ssd', 'hd', 'pendrive', 'carregador', 'cabo', 'tablet', 'smartphone', 'celular'],
        usarSomenteExtras: true
      }),
      audio: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Áudio',
        padroes: [],
        palavrasExtras: ['fone bluetooth', 'caixa de som', 'alto-falante', 'microfone'],
        usarSomenteExtras: true
      }),
      
      // Pet
      pet: criarInferenciaPorPadrao({
        categoria: 'Pet',
        subcategoria: 'Pet',
        padroes: ['Pet'],
        palavrasExtras: ['ração', 'petisco', 'areia', 'brinquedo pet', 'coleira', 'guia', 'pet shop']
      }),
      
      // Beleza e Cuidados
      beleza: criarInferenciaPorPadrao({
        categoria: 'Cuidados pessoais',
        subcategoria: 'Beleza',
        padroes: ['Cuidados pessoais'],
        palavrasExtras: ['beleza', 'shampoo', 'condicionador', 'perfume', 'creme', 'maquiagem', 'batom', 'base', 'delineador', 'esmalte']
      }),
      cuidados: criarInferenciaPorPadrao({
        categoria: 'Cuidados pessoais',
        subcategoria: 'Higiene',
        padroes: ['Cuidados pessoais'],
        palavrasExtras: ['higiene', 'sabonete', 'desodorante', 'pasta de dente', 'escova de dente', 'fio dental']
      }),
      
      // Casa e Decoração
      casa: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Casa e decoração',
        padroes: ['Moradia'],
        palavrasExtras: ['casa e decoração', 'cadeira', 'mesa', 'prato', 'copos', 'panela', 'talher', 'toalha', 'lençol', 'travesseiro', 'cortina']
      }),
      jardim: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Jardim',
        padroes: [],
        palavrasExtras: ['jardim', 'planta', 'adubo', 'vaso', 'terra', 'semente', 'ferramenta jardim'],
        usarSomenteExtras: true
      }),
      
      // Crianças
      criancas: criarInferenciaPorPadrao({
        categoria: 'Compras pessoais',
        subcategoria: 'Infantil',
        padroes: ['Compras pessoais'],
        palavrasExtras: ['infantil', 'brinquedo', 'lego', 'boneca', 'carrinho', 'roupa criança', 'fralda', 'mamadeira']
      }),
      
      // Saúde e Fitness
      fitness: criarInferenciaPorPadrao({
        categoria: 'Cuidados pessoais',
        subcategoria: 'Fitness',
        padroes: ['Cuidados pessoais'],
        palavrasExtras: ['fitness', 'suplemento', 'whey', 'creatina', 'bcaa', 'proteina', 'pré-treino', 'roupa academia', 'equipamento academia']
      }),
      saude: criarInferenciaPorPadrao({
        categoria: 'Saúde',
        subcategoria: 'Medicamentos',
        padroes: ['Saúde'],
        palavrasExtras: ['medicamentos', 'remedio', 'remédio', 'vitamina', 'suplemento vitaminico']
      }),
      // Software/serviços corporativos
      software: criarInferenciaPorPadrao({
        categoria: 'Custos administrativos',
        subcategoria: 'Softwares e assinaturas',
        padroes: ['Custos administrativos'],
        palavrasExtras: [
          'software', 'plataforma', 'assinatura', 'licenca', 'licença',
          'erp', 'crm', 'sas', 'saas', 'ferramenta', 'aplicativo', 'app', 'licenciamento'
        ]
      })
    },

    // 🎯 PALAVRAS QUE INDICAM CATEGORIA DIRETA (não precisa perguntar)
    palavrasCategoriaDireta: [
      'farmacia', 'farmácia', 'drogaria', 'pet shop', 'petshop', 'supermercado', 'mercado',
      'posto', 'combustivel', 'combustível', 'restaurante', 'lanchonete', 'padaria',
      'academia', 'estética', 'salão', 'cabeleireiro', 'lavanderia', 'oficina'
    ]
  },

  padroes: padroesBase,
  
  // Exporta constantes de steps
  steps: STEPS,

  // =============================================
  // COMANDOS - Palavras-chave que acionam funcionalidades
  // =============================================
  comandos: {
    // Palavras para aceitar/iniciar (lead + usuário ativo)
    ACEITACAO: ['sim', 'iniciar', 'quero', 'começar', 'vamos', 'ativar', 'podes', 'ok', 'claro', 'comecar', 'começar'],
    
    // Palavras para iniciar baseline
    INICIAR_BASELINE: ['sim', 'iniciar', 'quero', 'começar', 'vamos', 'perguntas', 'baseline'],
    
    // Palavras para continuar baseline pausado
    CONTINUAR: ['continuar', 'retomar', 'vamos', 'sim', 'ok'],
    
    // Palavras para pausar baseline
    PAUSAR: ['pausar', 'parar', 'pausa'],
    
    // Palavras para iniciar planejamento
    PLANEJAMENTO: ['planejamento', 'plano', 'plan', 'planeje'],
    
    // Palavras para visualizar plano salvo
    VER_PLANO: ['ver plano', 'meu plano', 'mostrar plano', 'exibir plano', 'visualizar plano', 'plano salvo', 'plano aceito'],
    
    // Palavras para aceitar proposta de planejamento
    ACEITAR: ['aceitar', 'aceito', 'ok', 'confirmar', 'confirmo', 'aprovar', 'aprovo'],
    
    // Palavras para lançar transação
    LANCAR_TRANSACAO: ['gasto', 'gastei', 'comprei', 'paguei', 'recebi', 'recebimento', 'lancamento', 'lançamento', 'transacao', 'transação', 'despesa', 'receita'],
    
    // Palavras para editar baseline
    EDITAR: ['editar', 'edita', 'corrigir', 'corrige', 'alterar', 'altera', 'mudar', 'ajustar'],
    
    // Palavras para voltar ao resumo
    VOLTAR: ['voltar', 'volta', 'resumo', 'ver resumo'],
    
    // Comandos de ajuda/menu
    AJUDA: ['ajuda', 'help', 'menu', 'comandos', 'opcoes', 'opções'],
    
    // Palavras para gerar resumo mensal
    RESUMO: ['resumo mensal', 'resumo do mes', 'resumo do mês', 'relatorio', 'relatório', 'comparativo', 'resumo'],
    
    // Palavras para adicionar colaborador/contato secundário
    ADICIONAR_COLABORADOR: ['adicionar colaborador', 'add colaborador', 'novo colaborador', 'adicionar contato', 'add contato', 'novo contato', 'adicionar usuario', 'adicionar usuário', 'add usuario', 'add usuário', 'colaborador', 'contato adicional'],

    // Comando para enviar feedback sobre o produto
    FEEDBACK: ['feedback']
  },

  // 📊 DISTRIBUIÇÃO DETALHADA 50/30/20
  // Percentuais ideais por categoria conforme regra 50/30/20
  distribuicao503020: {
    // 🟦 NECESSIDADES - 50% da renda
    necessidades: {
      percentualTotal: 50,
      categorias: {
        moradia: { 
          percentual: 25,
          min: 20, 
          max: 30,
          descricao: 'Aluguel, financiamento, condomínio',
          inclui: ['moradia', 'aluguel', 'financiamento', 'condominio', 'condomínio', 'iptu']
        },
        utilidades: { 
          percentual: 4,
          min: 3, 
          max: 7,
          descricao: 'Água, luz, gás, internet básica',
          inclui: ['utilidades', 'agua', 'água', 'luz', 'energia', 'gas', 'gás', 'internet']
        },
        alimentacao: { 
          percentual: 8,
          min: 6, 
          max: 15,
          descricao: 'Alimentação essencial (supermercado, feira)',
          inclui: ['alimentacao', 'alimentação', 'supermercado', 'mercado', 'feira', 'restaurante', 'delivery']
        },
        transporte: { 
          percentual: 8,
          min: 5, 
          max: 12,
          descricao: 'Transporte essencial (público, combustível, manutenção mínima)',
          inclui: ['transporte', 'combustivel', 'combustível', 'gasolina', 'uber', 'onibus', 'ônibus', 'metro', 'metrô']
        },
        saude: { 
          percentual: 3,
          min: 2, 
          max: 8,
          descricao: 'Plano de saúde e remédios essenciais',
          inclui: ['saude', 'saúde', 'despesas com saude', 'despesas com saúde', 'plano de saude', 'plano de saúde', 'remedios', 'remédios', 'farmacia', 'farmácia']
        },
        educacao: { 
          percentual: 5,
          min: 1, 
          max: 10,
          descricao: 'Educação obrigatória',
          inclui: ['educacao', 'educação', 'escola', 'faculdade', 'curso', 'mensalidade']
        },
        pet: { 
          percentual: 5,
          min: 1, 
          max: 10,
          descricao: 'Cuidados com animais de estimação (parcelas mínimas)',
          inclui: ['pet', 'animal', 'animais', 'estimação', 'estimação', 'parcela']
        }
      }
    },
    
    // 🟧 DESEJOS - 30% da renda
    desejos: {
      percentualTotal: 30,
      categorias: {
        lazer: { 
          percentual: 5,
          min: 3, 
          max: 8,
          descricao: 'Lazer e entretenimento (cinema, shows, passeios)',
          inclui: ['lazer', 'entretenimento', 'lazer e entretenimento', 'cinema', 'show', 'passeio', 'evento']
        },
        compras: { 
          percentual: 5,
          min: 3, 
          max: 10,
          descricao: 'Compras pessoais (roupas, acessórios, eletrônicos não essenciais)',
          inclui: ['compras', 'compras pessoais', 'roupa', 'roupas', 'eletronicos', 'eletrônicos', 'shopping']
        },
        assinaturas: { 
          percentual: 2,
          min: 1, 
          max: 5,
          descricao: 'Assinaturas e streaming (Netflix, Spotify, apps)',
          inclui: ['streaming', 'netflix', 'spotify', 'assinatura', 'app']
        },
        cuidados_pessoais: { 
          percentual: 7,
          min: 1, 
          max: 10,
          descricao: 'Cuidados pessoais',
          inclui: ['cuidados pessoais', 'academia', 'esporte', 'hobby', 'curso livre', 'aula']
        },
      }
    },
    
    // 🟩 METAS FINANCEIRAS - 20% da renda
    metas: {
      percentualTotal: 20,
      categorias: {
        investimentos: { 
          percentual: 5,
          min: 3, 
          max: 10,
          descricao: 'Aportes em investimentos (CDB, Tesouro, ações, FIIs)',
          inclui: ['aporte', 'investimento', 'cdb', 'tesouro', 'acoes', 'ações', 'fii', 'fundo']
        },
        dividas: { 
          percentual: 5,
          min: 1, 
          max: 10,
          descricao: 'Amortização EXTRA de dívidas (além do mínimo)',
          inclui: ['amortizacao', 'amortização', 'quitacao', 'quitação', 'antecipacao', 'antecipação']
        },
      }
    }
  }
};

// =============================================
// FUNÇÕES DE APOIO À REGRA 50/30/20
// =============================================

function encontrarRecomendacaoPorCategoria(nomeCategoria) {
  if (!nomeCategoria) return null;

  const dist = AppVars.distribuicao503020;
  const nome = String(nomeCategoria).toLowerCase().trim();

  const buckets = [
    { bucket: 'necessidades', data: dist.necessidades },
    { bucket: 'desejos', data: dist.desejos },
    { bucket: 'metas', data: dist.metas }
  ];

  for (const { bucket, data } of buckets) {
    if (!data || !data.categorias) continue;

    for (const [key, cat] of Object.entries(data.categorias)) {
      const inclui = Array.isArray(cat.inclui) ? cat.inclui : [];
      const match = inclui.some(label => String(label).toLowerCase().trim() === nome);

      if (match) {
        return {
          bucket,
          key,
          ...cat
        };
      }
    }
  }

  return null;
}

function calcularFaixaIdeal(recom, receitaTotal) {
  const receita = Number(receitaTotal) || 0;

  if (!recom || receita <= 0) {
    return {
      valorMin: 0,
      valorMax: 0,
      percMin: 0,
      percMax: 0
    };
  }

  const percMin = (recom.min ?? recom.percentual ?? 0);
  const percMax = (recom.max ?? recom.percentual ?? 0);

  const valorMin = (receita * percMin) / 100;
  const valorMax = (receita * percMax) / 100;

  return {
    valorMin,
    valorMax,
    percMin,
    percMax
  };
}

// =============================================
// FUNÇÕES UTILITÁRIAS PARA CONVERSÃO DE CATEGORIAS
// =============================================

/**
 * Busca informações da categoria por nome/título (ASYNC - busca do banco)
 * @param {string} categoryName - Nome ou título da categoria
 * @returns {Promise<Object|null>} { index, titulo, essencial } ou null
 */
async function getCategoryByNameAsync(categoryName) {
  if (!categoryName) return null;
  
  const nameLower = categoryName.toLowerCase().trim();
  
  const categories = await loadCategoriesFromDB();
  const category = categories.find(cat => {
    const titleLower = cat.category_title.toLowerCase().trim();
    return titleLower === nameLower || titleLower.includes(nameLower) || nameLower.includes(titleLower);
  });
  
  if (category) {
    return {
      index: category.category_index,
      titulo: category.category_title,
      essencial: category.essential
    };
  }
  
  return null;
}

/**
 * Busca informações da categoria por nome/título (SYNC - busca BASELINE hardcoded)
 * @deprecated Usar getCategoryByNameAsync para buscar do banco
 * @param {string} categoryName - Nome ou título da categoria
 * @returns {Object|null} { index, titulo, nature, essentiality } ou null
 */
function getCategoryByName(categoryName) {
  if (!categoryName) return null;
  
  const nameLower = categoryName.toLowerCase().trim();
  
  for (const [grupoKey, grupo] of Object.entries(AppVars.categorias.BASELINE)) {
    if (!grupo.categorias) continue;
    
    for (const [catKey, categoria] of Object.entries(grupo.categorias)) {
      // Verifica título da categoria
      const tituloLimpo = categoria.titulo.replace(/[🏠🍽️🚌🎓🩺🐶🎉💆🏦🧾📈💰🟦🟩🟧🟥🟨]/g, '').trim().toLowerCase();
      
      if (tituloLimpo === nameLower || categoria.titulo.toLowerCase().includes(nameLower)) {
        return {
          index: categoria.index,
          titulo: categoria.titulo,
          nature: grupo.nature,
          essentiality: null // Será definido pelo item específico
        };
      }
      
      // Verifica itens da categoria
      if (categoria.itens) {
        for (const item of categoria.itens) {
          if (item.nome.toLowerCase() === nameLower) {
            return {
              index: categoria.index,
              titulo: categoria.titulo,
              nature: grupo.nature,
              essentiality: item.essentiality
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Carrega categorias do banco (com cache)
 */
async function loadCategoriesFromDB() {
  const now = Date.now();
  
  // Retorna cache se ainda válido
  if (categoriesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return categoriesCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('category_index, category_title, essential');
    
    if (error) throw error;
    
    // Atualiza cache
    categoriesCache = data || [];
    cacheTimestamp = now;
    
    return categoriesCache;
  } catch (error) {
    console.error('❌ Erro ao carregar categorias do banco:', error);
    return [];
  }
}

/**
 * Busca informações da categoria por index (ASYNC - busca do banco)
 * @param {number} categoryIndex - Index da categoria
 * @returns {Promise<Object|null>} { index, titulo, essential } ou null
 */
async function getCategoryByIndexAsync(categoryIndex) {
  if (!categoryIndex && categoryIndex !== '0' && categoryIndex !== 0) return null;
  
  const categories = await loadCategoriesFromDB();
  const category = categories.find(cat => String(cat.category_index) === String(categoryIndex));
  
  if (category) {
    return {
      index: category.category_index,
      titulo: category.category_title,
      essencial: category.essential
    };
  }
  
  return null;
}

/**
 * Busca informações da categoria por index (SYNC - busca do BASELINE hardcoded)
 * @deprecated Usar getCategoryByIndexAsync para buscar do banco
 * @param {number} categoryIndex - Index da categoria
 * @returns {Object|null} { index, titulo, nature } ou null
 */
function getCategoryByIndex(categoryIndex) {
  if (!categoryIndex && categoryIndex !== 0) return null;
  
  for (const [grupoKey, grupo] of Object.entries(AppVars.categorias.BASELINE)) {
    if (!grupo.categorias) continue;
    
    for (const [catKey, categoria] of Object.entries(grupo.categorias)) {
      if (categoria.index === categoryIndex) {
        return {
          index: categoria.index,
          titulo: categoria.titulo,
          nature: grupo.nature
        };
      }
    }
  }
  
  return null;
}

/**
 * Converte nome/título para index
 * @param {string} categoryName - Nome ou título da categoria
 * @returns {number|null} Index da categoria ou null
 */
function categoryNameToIndex(categoryName) {
  const info = getCategoryByName(categoryName);
  return info ? info.index : null;
}

/**
 * Converte index para título (SYNC - usa BASELINE hardcoded)
 * @deprecated Usar categoryIndexToTitleAsync para buscar do banco
 * @param {number} categoryIndex - Index da categoria
 * @returns {string|null} Título da categoria ou null
 */
function categoryIndexToTitle(categoryIndex) {
  const info = getCategoryByIndex(categoryIndex);
  return info ? info.titulo : null;
}

/**
 * Converte título/nome para index da categoria (SYNC)
 * @param {string} categoryTitle - Título ou nome da categoria
 * @returns {number|null} Index da categoria ou null
 */
function categoryTitleToIndex(categoryTitle) {
  const titleLower = categoryTitle.toLowerCase().trim();
  
  // Busca em todas as categorias
  const estrutura = AppVars.categorias?.BASELINE;
  if (!estrutura) return null;
  
  for (const grupo of Object.values(estrutura)) {
    if (grupo && grupo.categorias) {
      for (const categoria of Object.values(grupo.categorias)) {
        if (categoria && categoria.titulo) {
          const categoriaLower = categoria.titulo.toLowerCase().trim();
          
          // Match exato ou parcial
          if (categoriaLower === titleLower || categoriaLower.includes(titleLower) || titleLower.includes(categoriaLower)) {
            return categoria.index;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Converte index para título (ASYNC - busca do banco)
 * @param {number} categoryIndex - Index da categoria
 * @param {boolean} withEmoji - Se deve incluir emoji (padrão: true)
 * @returns {Promise<string|null>} Título da categoria ou null
 */
async function categoryIndexToTitleAsync(categoryIndex, withEmoji = true) {
  const info = await getCategoryByIndexAsync(categoryIndex);
  if (!info) return null;
  
  const emoji = withEmoji ? (CATEGORY_EMOJIS[String(categoryIndex)] || '') : '';
  const titulo = info.titulo.charAt(0).toUpperCase() + info.titulo.slice(1); // Capitaliza
  
  return emoji ? `${emoji} ${titulo}` : titulo;
}

module.exports = AppVars;
module.exports.getCategoryByName = getCategoryByName;
module.exports.getCategoryByNameAsync = getCategoryByNameAsync;
module.exports.getCategoryByIndex = getCategoryByIndex;
module.exports.getCategoryByIndexAsync = getCategoryByIndexAsync;
module.exports.categoryNameToIndex = categoryNameToIndex;
module.exports.categoryIndexToTitle = categoryIndexToTitle;
module.exports.categoryTitleToIndex = categoryTitleToIndex;
module.exports.categoryIndexToTitleAsync = categoryIndexToTitleAsync;
module.exports.loadCategoriesFromDB = loadCategoriesFromDB;
module.exports.CATEGORY_EMOJIS = CATEGORY_EMOJIS;
module.exports.encontrarRecomendacaoPorCategoria = encontrarRecomendacaoPorCategoria;
module.exports.calcularFaixaIdeal = calcularFaixaIdeal;
