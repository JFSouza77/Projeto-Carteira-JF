// Estado compartilhado da tela (16/11, corte do app.js sugerido pelo Code do Perfil).
// Um objeto `state` só, mutável, que todas as telas leem e mexem direto (como o 02-estado.js do Perfil).
// Aqui não tem gravação: quem grava continua sendo o app (via db.js).

import { INCOME_SOURCES, monthKey, toISODate } from './engine.js';
import { DEFAULT_MOOD, memoriaInicial } from './caos/index.js';

export const $ = sel => document.querySelector(sel);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const centsToInput = c => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

// Servidor do C.A.O.S. Finanças (publicado com o JF em 14/11/2026). Vem ligado pra todo mundo: conta, sincronização e
// mercado funcionam sem configurar nada. A IA online continua desligada até a pessoa ligar em Ajustes.
export const SERVIDOR_PADRAO = 'https://carteira-jf.caos-financas.workers.dev';

export const state = {
  categories: [],
  expenses: [],
  incomes: [],
  previstas: [], // entradas que ainda vão cair (15/11); ficam no mesmo armazém, com prevista: true
  accounts: [],
  settings: { mood: DEFAULT_MOOD, voice: false, aiOn: true, iaV: 1, aiUrl: SERVIDOR_PADRAO, servidorV: 1, letra: 'normal', tema: 'escuro', temaV: 2, vozVel: 1, menosMov: null },
  caosMemory: memoriaInicial(),
  viewMonth: monthKey(toISODate()),
  kind: 'gasto',
  selectedCategory: null,
  forma: null, // pagou como (P8): dinheiro, pix, debito, credito
  selectedSource: null,
  photo: null, // { id, url } da foto anexada no formulário
  chat: [],
  compromissos: [],
  planos: [],
  perfil: null, // { nome, apelido, tratamento, foco[] } (primeiro acesso)
  metas: [], // meta/metas (1.8.0)
  transferencias: [], // meta/transferencias (13/11): entre contas suas, não é gasto nem entrada
  investimentos: [], // meta/investimentos (app 1.8)
  metaFlow: null, // perguntas da meta nova em andamento
  onboarding: null, // { passo, dados } enquanto o C.A.O.S. está conhecendo a pessoa
  catSugerida: false,
  mercado: null, // resumo do mercado vindo do servidor (guardado pra usar offline)
};

export const dados = () => ({
  expenses: state.expenses, incomes: state.incomes, previstas: state.previstas, categories: state.categories, accounts: state.accounts,
  diasSemGasto: state.perfil?.diasSemGasto || [], mesesSemEntrada: state.perfil?.mesesSemEntrada || [],
  compromissos: state.compromissos, planos: state.planos, mercado: state.mercado, metas: state.metas, investimentos: state.investimentos, transferencias: state.transferencias,
});
export const catById = id => state.categories.find(c => c.id === id);
export const srcById = id => INCOME_SOURCES.find(s => s.id === id);

// As telas chamam renderizar() sem importar o app.js (assim não vira import circular): o app registra o render dele.
let renderGeral = () => {};
export function definirRender(fn) { renderGeral = fn; }
export function renderizar(...args) { return renderGeral(...args); }
