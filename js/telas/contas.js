// Tela de Contas (16/11, corte do app.js): bancos, contas, cartões, raio-X do banco, investimentos e transferência
// entre contas. Mudou só de arquivo, o jeito de funcionar é o mesmo.

import { $, centsToInput, esc, state, renderizar } from '../estado.js';
import { faturasFuturas, monthLabel, BANKS, TIPOS_CONTA, TIPOS_INVESTIMENTO, accountBalance, accountLabel, agruparPorBanco, atualizarInvestimento, comReforco, createAccount, createCartao, createExpense, createIncome, createInvestimento, createTransferencia, diferencaDoSaldo, editarConta, faturaDoCartao, folgaDoPiso, formatBRL, parseAmount, parseSignedAmount, raioXCartao, rendimentoEstimado, QUANDO_GUARDA, resumoInvestimentos, toISODate, totalBalance } from '../engine.js';
import * as db from '../db.js';
import { temaBanco } from '../cores.js';
import { ic, narrate, pintarOlhos, saldoTxt, saldoVisivel, toast } from '../app.js';
import { renderLancar } from './lancar.js';

export function renderTransf() {
  const contas = state.accounts.filter(a => a.tipo !== 'cartao' && !a.paraQuem); // dinheiro de outra pessoa não entra (achado do GPT, 13/11)
  $('#transf-card').hidden = contas.length < 2;
  const opts = opcoesDeConta(a => a.tipo !== 'cartao').replace('<option value="">Sem conta</option>', '');
  for (const sel of ['#transf-de', '#transf-para']) { const v = $(sel).value; $(sel).innerHTML = opts; if (contas.some(a => a.id === v)) $(sel).value = v; }
  if ($('#transf-de').value === $('#transf-para').value && contas[1]) $('#transf-para').value = contas[1].id;
  if (!$('#transf-data').value) $('#transf-data').value = toISODate();
}

export async function onTransferir(ev) {
  ev.preventDefault();
  const err = $('#transf-erro');
  err.hidden = true;
  try {
    const t = createTransferencia({ deId: $('#transf-de').value, paraId: $('#transf-para').value, amountCents: parseAmount($('#transf-valor').value) || 0, date: $('#transf-data').value },
      { accounts: state.accounts });
    const de = state.accounts.find(a => a.id === t.deId), para = state.accounts.find(a => a.id === t.paraId);
    if (!confirm(`Transferir ${formatBRL(t.amountCents)} de ${accountLabel(de)} para ${accountLabel(para)}?`)) return;
    state.transferencias = [...state.transferencias, t];
    await db.setMeta('transferencias', state.transferencias);
    $('#transf-valor').value = '';
    renderContas(); renderizar();
    toast(`Pronto, anotei: ${formatBRL(t.amountCents)} foram de ${accountLabel(de)} pra ${accountLabel(para)}.`);
  } catch (e) {
    err.textContent = e.message; err.hidden = false;
  }
}

export function renderContas() {
  renderInvestimentos();
  renderTransf();
  $('#bank-total').textContent = saldoTxt(totalBalance(state.accounts, state.expenses, state.incomes, state.transferencias));
  pintarOlhos();
  const gruposBanco = agruparPorBanco(state.accounts);
  $('#res-bancos').textContent = gruposBanco.length ? `${gruposBanco.length} ${gruposBanco.length === 1 ? 'banco' : 'bancos'}` : 'nenhum ainda';
  $('#account-list').innerHTML = gruposBanco.map(g => {
    const dinheiro = g.contas.filter(a => a.tipo !== 'cartao' && !a.paraQuem).reduce((t, a) => t + accountBalance(a, state.expenses, state.incomes, state.transferencias), 0);
    const temDinheiro = g.contas.some(a => a.tipo !== 'cartao');
    const tema = temaBanco(g.bank === 'Outro' ? (g.contas[0]?.nickname || 'Outro') : g.bank);
    return `
    <li class="banco-grupo" style="--banco-cor:${tema.cor};--banco-apoio:${tema.apoio};--banco-fundo:${tema.fundo};--banco-letra:${tema.letra}">
      <button type="button" class="banco-head" data-banco-abre="${esc(g.bank)}" aria-expanded="${bancosAbertos.has(g.bank)}">
        <strong><span class="banco-sigla" aria-hidden="true">${esc(tema.sigla)}</span>${esc(g.bank === 'Outro' ? 'Outros' : g.bank)}</strong>
        <span class="banco-dir">${temDinheiro ? `<span class="num muted">${saldoTxt(dinheiro)}</span>` : ''}<span class="rx-seta" aria-hidden="true">${bancosAbertos.has(g.bank) ? '▴' : '▾'}</span></span>
      </button>
      ${bancosAbertos.has(g.bank) ? `<button type="button" class="ghost small raiox-btn" data-raiox="${esc(g.bank)}" aria-expanded="${raioXAberto.has(g.bank)}">${raioXAberto.has(g.bank) ? 'Fechar o raio-X' : 'Ver por dentro (raio-X)'}</button>` : ''}
      ${bancosAbertos.has(g.bank) && raioXAberto.has(g.bank) ? raioXDoBanco(g) : ''}
      ${bancosAbertos.has(g.bank) && !raioXAberto.has(g.bank) ? `<ul class="banco-partes">${g.contas.map(a => (a.tipo === 'cartao' ? itemCartao(a) : itemConta(a))).join('')}</ul>` : ''}
    </li>`;
  }).join('');
  if (!$('#bank-select').options.length) {
    $('#bank-select').innerHTML = BANKS.map(b => `<option>${esc(b)}</option>`).join('');
    $('#card-bank').innerHTML = BANKS.filter(b => !/dinheiro vivo/.test(b)).map(b => `<option>${esc(b)}</option>`).join('');
  }
  renderFormConta();
}

export function renderInvestimentos() {
  const lista = state.investimentos || [];
  const r = resumoInvestimentos(lista);
  const el = $('#inv-resumo');
  $('#res-inv').textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'investimento' : 'investimentos'}` : 'nenhum';
  el.hidden = !lista.length;
  if (lista.length) {
    const cls = r.ganhoCents >= 0 ? 'ganho' : 'perda';
    el.innerHTML = `<p class="label">Total investido hoje</p><p class="big">${formatBRL(r.atualCents)}</p>
      <p class="small">Você aplicou ${formatBRL(r.aplicadoCents)} · <span class="${cls}">${r.ganhoCents >= 0 ? '+' : '−'}${formatBRL(Math.abs(r.ganhoCents))} (${r.rendimentoPct.toLocaleString('pt-BR')}%)</span></p>`;
  }
  const dia = ms => new Date(ms).toLocaleDateString('pt-BR');
  $('#inv-list').innerHTML = lista.map(i => {
    const g = i.atualCents - i.aplicadoCents;
    return `<li>
      <div class="account-head"><strong>${ic('e-rendimento')} ${esc(i.nome)}</strong><span class="num">${formatBRL(i.atualCents)}</span></div>
      <small class="muted">${esc(TIPOS_INVESTIMENTO[i.tipo] || 'Outro')}${i.instituicao ? ` · ${esc(i.instituicao)}` : ''} · aplicou ${formatBRL(i.aplicadoCents)} · <span class="${g >= 0 ? 'ganho' : 'perda'}">${g >= 0 ? '+' : '−'}${formatBRL(Math.abs(g))}</span> · valor de ${dia(i.valorEm)}</small>
      <div class="account-actions">
        <button class="ghost" data-inv-atualizar="${esc(i.id)}">Atualizar valor</button>
        <button class="ghost" data-inv-aporte="${esc(i.id)}">＋ Coloquei mais</button>
        <button class="ghost" data-inv-del="${esc(i.id)}">Remover</button>
      </div>
    </li>`;
  }).join('');
  if (!$('#inv-tipo').options.length) $('#inv-tipo').innerHTML = Object.entries(TIPOS_INVESTIMENTO).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
}

export async function salvarInvestimentos(lista) {
  state.investimentos = lista;
  await db.setMeta('investimentos', lista);
  renderInvestimentos();
}

export async function onAddInvestimento(ev) {
  ev.preventDefault();
  const err = $('#inv-error');
  err.hidden = true;
  try {
    const aplicado = parseAmount($('#inv-aplicado').value);
    const atualTxt = $('#inv-atual').value.trim();
    const atual = atualTxt ? parseSignedAmount(atualTxt) : null;
    const inv = createInvestimento({ nome: $('#inv-nome').value, tipo: $('#inv-tipo').value, instituicao: $('#inv-inst').value, aplicadoCents: aplicado, atualCents: atual });
    await salvarInvestimentos([...(state.investimentos || []), inv]);
    for (const id of ['#inv-nome', '#inv-inst', '#inv-aplicado', '#inv-atual']) $(id).value = '';
    toast(`${inv.nome} adicionado. Pergunte pro C.A.O.S.: "como estão meus investimentos?"`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

export async function acaoInvestimento(e) {
  const b = e.target.closest('[data-inv-atualizar],[data-inv-aporte],[data-inv-del]');
  if (!b) return;
  const id = b.dataset.invAtualizar || b.dataset.invAporte || b.dataset.invDel;
  const inv = state.investimentos.find(x => x.id === id);
  if (!inv) return;
  try {
    if (b.dataset.invDel) {
      if (!confirm(`Remover ${inv.nome} da lista? (Não mexe em nada no banco.)`)) return;
      return salvarInvestimentos(state.investimentos.filter(x => x.id !== id));
    }
    if (b.dataset.invAtualizar) {
      const r = prompt(`Quanto ${inv.nome} vale hoje? (olhe no app do banco)`, (inv.atualCents / 100).toFixed(2).replace('.', ','));
      if (r == null) return;
      const v = parseSignedAmount(r);
      if (v == null || v < 0) return toast('Valor inválido.');
      await salvarInvestimentos(state.investimentos.map(x => (x.id === id ? atualizarInvestimento(x, { atualCents: v }) : x)));
      return toast('Valor atualizado.');
    }
    const r = prompt(`Quanto você colocou a mais em ${inv.nome}?`);
    if (r == null) return;
    const v = parseAmount(r);
    if (!v) return toast('Valor inválido.');
    await salvarInvestimentos(state.investimentos.map(x => (x.id === id ? atualizarInvestimento(x, { atualCents: x.atualCents + v, aporteCents: v }) : x)));
    toast(`Aporte de ${formatBRL(v)} anotado.`);
  } catch (err) {
    toast(err.message);
  }
}

export function itemConta(a) {
  const bal = accountBalance(a, state.expenses, state.incomes, state.transferencias);
  const desde = new Date(a.balanceAt).toLocaleDateString('pt-BR');
  const reforca = a.reforcaCartaoId && state.accounts.find(c => c.id === a.reforcaCartaoId);
  // etiquetas (13/11): o que essa conta é, quanto rende, se aumenta limite, se o dinheiro é de outra pessoa
  const tags = [
    a.rendeCdiPct ? `<span class="tag rende">rende ${String(a.rendeCdiPct).replace('.', ',')}% do CDI</span>` : '',
    reforca ? `<span class="tag reforca">aumenta o limite do ${esc(accountLabel(reforca))}</span>` : '',
    a.paraQuem ? `<span class="tag outro">guardado pra ${esc(a.paraQuem)}</span>` : '',
    (() => { const p = folgaDoPiso(a, bal); if (!p) return '';
      return `<span class="tag ${p.abaixo ? 'piso-abaixo' : p.perto ? 'piso-perto' : 'piso-ok'}">${p.abaixo ? 'abaixo do piso' : `piso ${saldoVisivel() ? formatBRL(p.pisoCents) : '••••'}`}${!p.abaixo && saldoVisivel() ? ` · folga ${formatBRL(p.folgaCents)}` : ''}</span>`; })(),
  ].join('');
  return `
    <li class="${a.paraQuem ? 'de-outro' : ''}"><details class="conta-det"${contasAbertas.has(a.id) ? ' open' : ''} data-conta-det="${esc(a.id)}">
      <summary class="account-head"><strong>${iconeConta(a)} ${esc(accountLabel(a))}</strong><span class="num ${bal < 0 && saldoVisivel() ? 'bad' : ''}">${saldoTxt(bal)}</span></summary>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      <small class="muted">${saldoVisivel() ? `Saldo informado ${formatBRL(a.balanceCents)} em ${desde}${bal !== a.balanceCents ? ', mais os lançamentos desde então' : ''}.` : `Saldo atualizado em ${desde}. Toque no olhinho pra ver os valores.`}${a.paraQuem ? ' Não entra no seu saldo total.' : ''}</small>
      <div class="account-actions">
        <button class="ghost" data-acc-update="${esc(a.id)}">Atualizar saldo</button>
        <button class="ghost" data-acc-edit="${esc(a.id)}">Editar</button>
        <button class="ghost" data-acc-del="${esc(a.id)}">Remover</button>
      </div>
    </details></li>`;
}

// conta aberta continua aberta quando a lista é redesenhada
export const contasAbertas = new Set();

export const raioXAberto = new Set();

// 14/11 (Anne): banco fechado de começo; 1º toque mostra as contas dele, 2º abre a conta por dentro
export const bancosAbertos = new Set();

export function raioXDoBanco(g) {
  // CDI: o mais recente entre o que a pessoa digitou e o do servidor (mercado, atualizado todo dia útil)
  const manual = state.perfil?.cdiAnualPct ? { v: state.perfil.cdiAnualPct, em: state.perfil.cdiEm || 0 } : null;
  const doMercado = Number(state.mercado?.cdi?.valor) > 0 ? { v: Number(state.mercado.cdi.valor), em: Date.parse(state.mercado.atualizadoEm) || 0 } : null;
  const fonte = [manual, doMercado].filter(Boolean).sort((a, b) => b.em - a.em)[0] || null;
  const cdi = fonte?.v || null;
  // data do CDI (achado do GPT, 13/11): a taxa muda; depois de 30 dias avisa que pode estar velha
  const cdiEm = fonte?.em || null;
  const cdiVelho = !!(cdi && (!cdiEm || Date.now() - cdiEm > 30 * 864e5));
  const linhas = g.contas.map(a => {
    if (a.tipo === 'cartao') {
      const r = raioXCartao(a, state.accounts, state.expenses, state.incomes, state.transferencias);
      const f = faturaDoCartao(comReforco(a, state.accounts, state.expenses, state.incomes, state.transferencias), state.expenses, toISODate());
      return `<li class="rx-cartao"><strong>${ic('a-cartao')} ${esc(accountLabel(a))}</strong>
        <dl class="rx-conta">
          <dt>Limite do próprio cartão</dt><dd>${formatBRL(r.limiteCartaoCents)}</dd>
          ${r.cofrinhos.map(c => `<dt>+ do cofrinho ${esc(accountLabel(c.conta))}</dt><dd>${formatBRL(c.saldoCents)}</dd>`).join('')}
          <dt class="soma">= Limite que você vê</dt><dd class="soma">${formatBRL(r.limiteTotalCents)}</dd>
          <dt>Já usado</dt><dd>${formatBRL(f.usadoCents)}</dd>
          <dt>Livre agora</dt><dd>${formatBRL(f.disponivelCents)}</dd>
        </dl>
        ${r.cofrinhos.length ? `<small class="muted">Se tirar dinheiro do cofrinho, o limite diminui junto.</small>` : '<small class="muted">Nenhum cofrinho aumenta esse limite. Se um aumenta, toque em Editar no cofrinho.</small>'}</li>`;
    }
    const bal = accountBalance(a, state.expenses, state.incomes, state.transferencias);
    const rende = rendimentoEstimado(bal, a.rendeCdiPct, cdi);
    const reforca = a.reforcaCartaoId && state.accounts.find(c => c.id === a.reforcaCartaoId);
    return `<li><strong>${iconeConta(a)} ${esc(accountLabel(a))}</strong>
      <dl class="rx-conta">
        <dt>O que é</dt><dd>${esc(TIPOS_CONTA[a.subtipo || 'corrente'] || 'Conta')}</dd>
        <dt>Saldo</dt><dd>${formatBRL(bal)}</dd>
        <dt>Rendimento</dt><dd>${a.rendeCdiPct ? `${String(a.rendeCdiPct).replace('.', ',')}% do CDI${rende ? ` · ~${formatBRL(rende.mesCents)} por mês` : ''}` : '<span class="muted">não informado</span>'}</dd>
        ${reforca ? `<dt>Aumenta o limite de</dt><dd>${esc(accountLabel(reforca))}</dd>` : ''}
        ${a.guardaCompra ? `<dt>Guarda a cada compra</dt><dd>${formatBRL(a.guardaCompra.valorCents)} ${esc(QUANDO_GUARDA[a.guardaCompra.quando] || '')}</dd>` : ''}
        <dt>De quem é</dt><dd>${a.paraQuem ? `de ${esc(a.paraQuem)} (fora do seu saldo)` : 'seu'}</dd>
      </dl></li>`;
  }).join('');
  const temCdi = g.contas.some(a => a.rendeCdiPct);
  // 16/11 (JF): com o raio-X aberto, as linhas de sempre (cartão, saldo, botões) somem pra não repetir; o aviso diz como voltar
  return `<div class="raio-x" id="rx-${esc(g.bank)}">
    <ul class="rx-lista">${linhas}</ul>
    <p class="muted small rx-dica">Pra lançar, atualizar o saldo ou remover, feche o raio-X.</p>
    ${temCdi ? `<p class="rx-cdi muted${cdiVelho ? ' velho' : ''}">${cdi ? `Estimativa com o CDI de ${String(cdi).replace('.', ',')}% ao ano${cdiEm ? `, informado em ${new Date(cdiEm).toLocaleDateString('pt-BR')}` : ''}.${cdiVelho ? ' Faz mais de um mês: confira se mudou.' : ''}` : 'Pra eu estimar quanto rende, me diga o CDI de hoje.'} <button type="button" class="ghost small" data-cdi>${cdi ? 'Mudar o CDI' : 'Informar o CDI'}</button></p>` : ''}
  </div>`;
}

export function abrirEditarConta(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  const dlg = $('#conta-dialog');
  dlg.dataset.id = id;
  $('#cd-titulo').textContent = `Editar ${accountLabel(a)}`;
  $('#cd-apelido').value = a.nickname || '';
  $('#cd-tipo').value = a.subtipo || 'corrente';
  const cartoes = state.accounts.filter(c => c.tipo === 'cartao');
  $('#cd-reforca').innerHTML = '<option value="">Não aumenta limite</option>' + cartoes.map(c => `<option value="${esc(c.id)}">${esc(accountLabel(c))}</option>`).join('');
  $('#cd-reforca').value = a.reforcaCartaoId || '';
  // guardar a cada compra (16/11): a conta de origem é do mesmo banco primeiro
  const origens = state.accounts.filter(c => c.tipo !== 'cartao' && c.id !== a.id && !c.paraQuem)
    .sort((x, y) => (y.bank === a.bank) - (x.bank === a.bank));
  $('#cd-guarda-origem').innerHTML = origens.map(c => `<option value="${esc(c.id)}">${esc(accountLabel(c))}</option>`).join('');
  $('#cd-guarda').checked = !!a.guardaCompra;
  $('#cd-guarda-valor').value = a.guardaCompra ? centsToInput(a.guardaCompra.valorCents) : '';
  if (a.guardaCompra) $('#cd-guarda-origem').value = a.guardaCompra.origemId;
  $('#cd-guarda-quando').value = a.guardaCompra?.quando || 'todas';
  $('#cd-cdi').value = a.rendeCdiPct ? String(a.rendeCdiPct).replace('.', ',') : '';
  $('#cd-piso').value = a.pisoCents ? centsToInput(a.pisoCents) : '';
  $('#cd-outro').checked = !!a.paraQuem;
  $('#cd-quem').value = a.paraQuem || '';
  $('#cd-erro').hidden = true;
  mostrarCamposConta();
  dlg.returnValue = '';
  dlg.showModal();
}

export function mostrarCamposConta() {
  $('#cd-reforca-campo').hidden = $('#cd-tipo').value !== 'cofrinho' || !state.accounts.some(c => c.tipo === 'cartao');
  $('#cd-guarda-campo').hidden = $('#cd-tipo').value !== 'cofrinho' || !$('#cd-guarda-origem').options.length;
  $('#cd-guarda-det').hidden = !$('#cd-guarda').checked;
  $('#cd-quem-campo').hidden = !$('#cd-outro').checked;
}

export async function salvarConta(ev) {
  if (ev.submitter?.value !== 'ok') return;
  ev.preventDefault();
  const dlg = $('#conta-dialog');
  const a = state.accounts.find(x => x.id === dlg.dataset.id);
  if (!a) return dlg.close();
  try {
    const cdiTxt = $('#cd-cdi').value.trim().replace(',', '.').replace('%', '');
    if (cdiTxt && !Number.isFinite(Number(cdiTxt))) throw new Error('Rendimento: só o número, ex.: 102.');
    if ($('#cd-outro').checked && !$('#cd-quem').value.trim()) throw new Error('De quem é esse dinheiro?');
    const pisoTxt = $('#cd-piso').value.trim();
    const piso = pisoTxt ? parseAmount(pisoTxt) : null;
    if (pisoTxt && piso == null) throw new Error('Piso: digite um valor, ex.: 2.000,00.');
    let guardaCompra = null;
    if ($('#cd-tipo').value === 'cofrinho' && $('#cd-guarda').checked) {
      const v = parseAmount($('#cd-guarda-valor').value.trim());
      if (v == null || v <= 0) throw new Error('Quanto guardar a cada compra? Ex.: 5,00.');
      guardaCompra = { valorCents: v, origemId: $('#cd-guarda-origem').value, quando: $('#cd-guarda-quando').value };
    }
    const novo = editarConta(a, {
      pisoCents: piso, guardaCompra,
      nickname: $('#cd-apelido').value, subtipo: $('#cd-tipo').value, reforcaCartaoId: $('#cd-reforca').value || null,
      rendeCdiPct: cdiTxt ? Number(cdiTxt) : null, paraQuem: $('#cd-outro').checked ? $('#cd-quem').value : '',
    }, { accounts: state.accounts });
    await db.put(db.STORES.accounts, novo);
    state.accounts = state.accounts.map(x => (x.id === novo.id ? novo : x));
    dlg.close();
    renderContas(); renderLancar(); renderizar();
    toast(`${accountLabel(novo)} atualizada.`);
  } catch (e) {
    $('#cd-erro').textContent = e.message;
    $('#cd-erro').hidden = false;
  }
}

export async function informarCdi() {
  const atual = state.perfil?.cdiAnualPct;
  const r = prompt('CDI de hoje, em % ao ano (ex.: 10,65). Confira no site do Banco Central ou no app do seu banco:', atual ? String(atual).replace('.', ',') : '');
  if (r == null) return;
  const v = Number(r.trim().replace(',', '.').replace('%', ''));
  if (!(v > 0 && v < 100)) return toast('Digite só o número, ex.: 10,65.');
  state.perfil = { ...(state.perfil || {}), cdiAnualPct: Math.round(v * 100) / 100, cdiEm: Date.now() };
  await db.setMeta('perfil', state.perfil);
  renderContas();
  toast(`CDI anotado: ${String(state.perfil.cdiAnualPct).replace('.', ',')}% ao ano.`);
}

export function itemCartao(a) {
  const f = faturaDoCartao(comReforco(a, state.accounts, state.expenses, state.incomes, state.transferencias), state.expenses, toISODate());
  // 2.3.5.9 (André): o que já está agendado, mês a mês (pelo mês em que a fatura vence)
  const proximas = faturasFuturas(a, state.expenses, toISODate());
  const cls = f.pct >= 100 ? 'cheio' : f.pct >= 80 ? 'alto' : '';
  const dia = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
  const sit = f.pct >= 100 ? ['critico', 'Limite crítico'] : f.pct >= 80 ? ['atencao', 'Atenção'] : ['saudavel', 'Saudável'];
  return `
    <li class="cartao-item">
      <div class="account-head"><strong>${ic('a-cartao')} ${esc(accountLabel(a))} <span class="sit-limite ${sit[0]}">${sit[1]}</span></strong><span class="num ${f.pct >= 100 ? 'bad' : ''}">${formatBRL(f.disponivelCents)} livre</span></div>${f.reforcoCents ? `<small class="muted">Limite ${formatBRL(a.limiteCents)} + ${formatBRL(f.reforcoCents)} do cofrinho.</small>` : ''}
      <div class="limite-bar ${cls}" role="img" aria-label="${f.pct}% do limite usado"><i style="width:${Math.min(100, Math.max(0, f.pct))}%"></i></div>
      <small class="muted">Usado ${formatBRL(f.usadoCents)} de ${formatBRL(f.limiteCents)} (${f.pct}%). Fatura aberta ${formatBRL(f.abertaCents)}, fecha ${dia(f.fechamento)}.${f.fechadaCents ? ` Fatura fechada ${formatBRL(f.fechadaCents)} vence ${dia(f.vencimento)}.` : ''}${f.futurasCents ? ` Parcelas das próximas faturas: ${formatBRL(f.futurasCents)}${f.presoFuturoCents ? ` (${formatBRL(f.presoFuturoCents)} preso no limite)` : ''}.` : ''}</small>
      ${proximas.length ? `<small class="muted proximas-faturas">Próximas faturas (já parcelado): ${proximas.map(p => `${esc(monthLabel(p.mes).split(' ')[0].slice(0, 3))} ${formatBRL(p.valorCents)}`).join(' · ')}</small>` : ''}
      ${f.atrasada ? `<small class="bad">A fatura de ${formatBRL(f.fechadaCents)} venceu dia ${dia(f.vencimento)}. Já pagou? Marca aqui que ela sai do limite.</small>` : ''}
      <div class="account-actions">
        <button class="ghost" data-compra-cartao="${esc(a.id)}">＋ Lançar compra neste cartão</button>
        ${f.fechadaCents > 0 ? `<button class="ghost" data-fatura-paga="${esc(a.id)}">Paguei a fatura</button>` : ''}
        <button class="ghost" data-acc-del="${esc(a.id)}">Remover</button>
      </div>
    </li>`;
}

export function compraNoCartao(id) {
  document.querySelector('input[name="kind"][value="gasto"]').checked = true;
  state.kind = 'gasto';
  state.forma = 'credito';
  location.hash = 'lancar';
  renderLancar();
  const sel = $('#account-select');
  if ([...sel.options].some(o => o.value === id)) sel.value = id;
  setTimeout(() => $('#amount').focus(), 50);
}

export async function marcarFaturaPaga(id) {
  const cartao = state.accounts.find(a => a.id === id);
  if (!cartao) return;
  const f = faturaDoCartao(comReforco(cartao, state.accounts, state.expenses, state.incomes, state.transferencias), state.expenses, toISODate());
  if (!confirm(`Marcar a fatura de ${formatBRL(f.fechadaCents)} do ${accountLabel(cartao)} como paga?`)) return;
  const novo = { ...cartao, faturaPagaAte: f.ultimoFechamento };
  await db.put(db.STORES.accounts, novo);
  state.accounts = state.accounts.map(a => (a.id === id ? novo : a));
  renderizar();
  toast(`Pronto, anotei: fatura do ${accountLabel(cartao)} paga.`);
}

export async function onAddCartao(ev) {
  ev.preventDefault();
  const err = $('#card-error');
  err.hidden = true;
  try {
    const limite = parseAmount($('#card-limite').value);
    if (!limite) throw new Error($('#card-modalidade').value === 'parcelado' ? 'Qual o limite do crediário? (está no app da loja ou do banco)' : 'Qual o limite do cartão?');
    const usado = $('#card-usado').value.trim() ? parseSignedAmount($('#card-usado').value) : 0;
    if (usado == null || usado < 0) throw new Error('O valor já usado está estranho.');
    const c = createCartao({ bank: $('#card-bank').value, nickname: $('#card-nick').value, limiteCents: limite, fechamentoDia: Number($('#card-fecha').value), vencimentoDia: Number($('#card-vence').value), usadoCents: usado, modalidade: $('#card-modalidade').value });
    await db.put(db.STORES.accounts, c);
    state.accounts.push(c);
    for (const id of ['#card-nick', '#card-limite', '#card-fecha', '#card-vence', '#card-usado']) $(id).value = '';
    renderContas();
    renderLancar();
    renderizar();
    toast(`${c.modalidade === 'parcelado' ? 'Crediário' : 'Cartão'} ${accountLabel(c)} adicionado. Ao lançar, escolha ele em "Conta".`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

export const ICONE_CONTA = { corrente: 'i-contas', poupanca: 'a-poupanca', cofrinho: 'e-outros', cartao: 'a-cartao' };

export const iconeConta = a => ic(ICONE_CONTA[a.tipo === 'cartao' ? 'cartao' : a.subtipo || 'corrente']);

export function opcoesDeConta(filtro = () => true) {
  return '<option value="">Sem conta</option>' + agruparPorBanco(state.accounts.filter(filtro)).map(g =>
    `<optgroup label="${esc(g.bank)}">${g.contas.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('')}</optgroup>`).join('');
}

export function renderFormConta() {
  const cofrinho = $('#bank-subtipo').value === 'cofrinho';
  const cartoes = state.accounts.filter(a => a.tipo === 'cartao');
  $('#bank-reforco-field').hidden = !cofrinho || !cartoes.length;
  $('#bank-reforco-cartao').innerHTML = cartoes.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('');
  const doBanco = cartoes.find(a => a.bank === $('#bank-select').value);
  if (doBanco) $('#bank-reforco-cartao').value = doBanco.id;
}

export async function onAddAccount(ev) {
  ev.preventDefault();
  const err = $('#account-error');
  err.hidden = true;
  try {
    const bal = parseSignedAmount($('#bank-balance').value);
    if (bal == null) throw new Error('Digite o saldo atual (pode ser 0).');
    const subtipo = $('#bank-subtipo').value;
    const reforcaCartaoId = subtipo === 'cofrinho' && $('#bank-reforco').checked ? $('#bank-reforco-cartao').value || null : null;
    const acc = createAccount({ bank: $('#bank-select').value, nickname: $('#bank-nick').value, balanceCents: bal, subtipo, reforcaCartaoId });
    await db.put(db.STORES.accounts, acc);
    state.accounts.push(acc);
    $('#bank-nick').value = '';
    $('#bank-balance').value = '';
    $('#bank-subtipo').value = 'corrente';
    $('#bank-reforco').checked = false;
    renderFormConta();
    renderContas();
    renderLancar();
    renderizar();
    toast(`Pronto, anotei: ${accountLabel(acc)}.`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

export async function onUpdateAccount(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  const atual = accountBalance(a, state.expenses, state.incomes, state.transferencias);
  const r = prompt(`Saldo atual de ${accountLabel(a)} (como está no app do banco):`, centsToInput(atual) || '0');
  if (r == null) return;
  const bal = parseSignedAmount(r);
  if (bal == null) return toast('Valor inválido.');
  // 15/11 (JF): o saldo do banco não bate com o anotado? O C.A.O.S. avisa e oferece anotar a diferença.
  // A diferença é anotada ANTES do saldo novo, pra já ficar dentro dele (sem contar duas vezes).
  const dif = diferencaDoSaldo(atual, bal);
  let anotou = false;
  if (dif) {
    narrate([{ type: dif.tipo, accountName: accountLabel(a), valorCents: dif.valorCents }], { ignoreCooldown: true });
    const gasto = dif.tipo === 'saldo_sem_gasto';
    const pergunta = gasto
      ? `${accountLabel(a)} tem ${formatBRL(dif.valorCents)} a menos do que estava anotado. Pode ser um gasto que ficou sem anotar.\n\nQuer anotar ${formatBRL(dif.valorCents)} como gasto (em Outros)? Depois dá pra editar e escolher a categoria.`
      : `${accountLabel(a)} tem ${formatBRL(dif.valorCents)} a mais do que estava anotado. Pode ser uma entrada que ficou sem anotar.\n\nQuer anotar ${formatBRL(dif.valorCents)} como entrada (em Outros)? Depois dá pra editar.`;
    if (confirm(pergunta)) {
      const hoje = toISODate();
      if (gasto) {
        const e = createExpense({ amountCents: dif.valorCents, categoryId: 'outros', note: 'Gasto sem anotar (achado ao atualizar o saldo)', date: hoje, accountId: a.id }, { categories: state.categories });
        await db.put(db.STORES.expenses, e);
        state.expenses.push(e);
      } else {
        const i = createIncome({ amountCents: dif.valorCents, sourceId: 'outros', note: 'Entrada sem anotar (achada ao atualizar o saldo)', date: hoje, accountId: a.id });
        await db.put(db.STORES.incomes, i);
        state.incomes.push(i);
      }
      anotou = true;
    }
  }
  const upd = { ...a, balanceCents: bal, balanceAt: Date.now() };
  await db.put(db.STORES.accounts, upd);
  state.accounts = state.accounts.map(x => (x.id === id ? upd : x));
  renderContas();
  renderizar();
  toast(anotou ? 'Saldo atualizado, e a diferença ficou anotada.' : 'Saldo atualizado.');
}

export async function onRemoveAccount(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a || !confirm(`Remover ${accountLabel(a)}? Os lançamentos continuam, só deixam de contar no saldo.`)) return;
  await db.remove(db.STORES.accounts, id);
  state.accounts = state.accounts.filter(x => x.id !== id);
  // cartão removido: os cofrinhos que aumentavam o limite dele deixam de apontar pra ele (achado do GPT, 13/11)
  for (const c of state.accounts.filter(x => x.reforcaCartaoId === id)) {
    const solto = { ...c, reforcaCartaoId: null };
    await db.put(db.STORES.accounts, solto);
    state.accounts = state.accounts.map(x => (x.id === c.id ? solto : x));
  }
  renderContas();
  renderLancar();
  renderizar();
}
