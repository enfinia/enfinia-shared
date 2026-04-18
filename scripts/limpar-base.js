#!/usr/bin/env node
/**
 * limpar-base.js — Limpa todos os dados de usuário do banco Supabase
 *
 * Uso:
 *   node limpar-base.js [--force] [--dry-run] [--env=caminho/.env]
 *
 * Flags:
 *   --force    Pula confirmação interativa
 *   --dry-run  Mostra contagem mas não deleta nada
 *   --env=     Caminho para arquivo .env (padrão: raiz do monorepo)
 *
 * Tabelas preservadas (dados estáticos de config):
 *   category_keywords, ai_knowledge_documents, statement_layouts, cnpj_learning
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const envFlag = args.find(a => a.startsWith('--env='));

function resolverEnvPath(flag) {
  if (flag) return path.resolve(flag.replace('--env=', ''));

  // Tenta encontrar .env em ordem de preferência
  const candidatos = [
    path.join(__dirname, '..', '.env'),                                    // enfinia-shared/.env
    path.join(__dirname, '..', '..', '.env'),                              // raiz do monorepo
    path.join(__dirname, '..', '..', 'enfinia-conversational-ai-service', '.env'), // serviço com todas as vars
  ];

  const encontrado = candidatos.find(p => fs.existsSync(p));
  return encontrado || candidatos[0];
}

const envPath = resolverEnvPath(envFlag);
require('dotenv').config({ path: envPath });

const FORCE   = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

// ─── Ordem de deleção (respeita foreign keys) ─────────────────────────────────
//
// Hierarquia de dependência:
//   hash → leads → accounts → users
//                           ↘ transactions, financial_baseline, financial_plan,
//                              balance, account_goals, user_knowledge,
//                              categories_learning, invited_contacts, etc.
//
// Deletar filhos antes dos pais.

const TABELAS = [
  // Aprendizado e IA (sem FK para accounts em geral, ou FK fraca)
  { nome: 'ai_decision_events',          grupo: 'IA / Aprendizado' },
  { nome: 'transaction_learning_history', grupo: 'IA / Aprendizado' },
  { nome: 'transaction_dynamic_regex',    grupo: 'IA / Aprendizado' },
  { nome: 'transaction_learned_patterns', grupo: 'IA / Aprendizado' },
  { nome: 'categories_learning',          grupo: 'IA / Aprendizado' },
  { nome: 'user_knowledge',               grupo: 'IA / Aprendizado' },

  // Dados financeiros (FK: account_id → accounts.id)
  { nome: 'account_goals',     grupo: 'Financeiro' },
  { nome: 'balance',           grupo: 'Financeiro' },
  { nome: 'financial_plan',    grupo: 'Financeiro' },
  { nome: 'financial_plans',   grupo: 'Financeiro' },
  { nome: 'financial_baseline',grupo: 'Financeiro' },
  { nome: 'transactions',      grupo: 'Financeiro' },

  // Integrações e contatos
  { nome: 'pluggy_accounts',  grupo: 'Integrações' },
  { nome: 'puggly_users',     grupo: 'Integrações' },
  { nome: 'invited_contacts', grupo: 'Integrações' },

  // Estado de fluxo do bot
  { nome: 'flow_states',   grupo: 'Bot' },
  { nome: 'intention',     grupo: 'Bot' },
  { nome: 'user_intention',grupo: 'Bot' },

  // Núcleo de usuários (ordem: users → accounts → leads → hash)
  { nome: 'users',    grupo: 'Usuários' },
  { nome: 'accounts', grupo: 'Usuários' },
  { nome: 'leads',    grupo: 'Usuários' },
  { nome: 'hash',     grupo: 'Usuários' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function perguntar(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pergunta, (resp) => { rl.close(); resolve(resp.trim().toLowerCase()); });
  });
}

async function contar(supabase, nome) {
  const { count, error } = await supabase
    .from(nome)
    .select('*', { count: 'exact', head: true });
  if (error) return { count: null, erro: error.message };
  return { count: count || 0, erro: null };
}

async function deletar(supabase, nome) {
  // .not('id', 'is', null) funciona para id TEXT, BIGINT e UUID
  const { error } = await supabase
    .from(nome)
    .delete()
    .not('id', 'is', null);
  return error || null;
}

function pad(str, n) {
  return String(str).padEnd(n);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error('\n❌  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    console.error(`    .env procurado em: ${envPath}\n`);
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🗑️   LIMPEZA DE BASE — Plataforma Enfinia');
  if (DRY_RUN) console.log('  🔍  DRY RUN — nenhum dado será deletado');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Projeto: ${url}`);
  console.log(`  .env:    ${envPath}`);
  console.log(`  Chave:   ${key.slice(0, 20)}...\n`);

  // ── Teste de conexão ────────────────────────────────────────────────────────
  {
    const { error: pingError } = await supabase.from('hash').select('id').limit(1);
    if (pingError) {
      console.error(`❌  Falha na conexão com o Supabase: ${pingError.message}`);
      console.error('    Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env acima.\n');
      process.exit(1);
    }
  }

  // ── Contagem atual ──────────────────────────────────────────────────────────
  console.log('📊  Contagem atual:\n');

  let grupoAtual = '';
  const comDados = [];
  let totalGeral = 0;

  for (const t of TABELAS) {
    if (t.grupo !== grupoAtual) {
      console.log(`  ${t.grupo}`);
      grupoAtual = t.grupo;
    }

    const { count, erro } = await contar(supabase, t.nome);

    if (erro) {
      const motivo = erro.includes('does not exist') ? 'não existe' : erro;
      console.log(`    ${pad(t.nome, 32)} — ${motivo}`);
      continue;
    }

    const marcador = count > 0 ? '●' : '○';
    console.log(`    ${marcador} ${pad(t.nome, 30)} ${count > 0 ? count + ' registros' : '—'}`);

    if (count > 0) {
      comDados.push({ ...t, count });
      totalGeral += count;
    }
  }

  console.log(`\n  Total: ${totalGeral} registro(s) a remover\n`);

  if (totalGeral === 0) {
    console.log('✨  Base já está limpa!\n');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('🔍  Dry run concluído. Execute sem --dry-run para deletar.\n');
    process.exit(0);
  }

  // ── Confirmação ─────────────────────────────────────────────────────────────
  if (!FORCE) {
    console.log('⚠️   Esta ação é IRREVERSÍVEL e apagará todos os dados acima.\n');
    const resp = await perguntar('    Digite "sim" para confirmar: ');
    if (resp !== 'sim') {
      console.log('\n🚫  Operação cancelada.\n');
      process.exit(0);
    }
    console.log();
  }

  // ── Deleção ─────────────────────────────────────────────────────────────────
  console.log('🧹  Limpando...\n');

  const erros = [];
  let totalDeletado = 0;
  grupoAtual = '';

  for (const t of comDados) {
    if (t.grupo !== grupoAtual) {
      console.log(`  ${t.grupo}`);
      grupoAtual = t.grupo;
    }

    process.stdout.write(`    ${pad(t.nome, 32)}`);

    const erro = await deletar(supabase, t.nome);

    if (erro) {
      process.stdout.write(`❌  ${erro.message}\n`);
      erros.push({ nome: t.nome, mensagem: erro.message });
    } else {
      process.stdout.write(`✅  ${t.count} removidos\n`);
      totalDeletado += t.count;
    }
  }

  // ── Resumo ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (erros.length === 0) {
    console.log(`✨  Limpeza concluída! ${totalDeletado} registros removidos.\n`);
  } else {
    console.log(`⚠️   Limpeza parcial: ${totalDeletado} removidos, ${erros.length} erro(s):\n`);
    erros.forEach(e => console.log(`    ❌  ${e.nome}: ${e.mensagem}`));
    console.log();
  }

  process.exit(erros.length > 0 ? 1 : 0);
})();
