// Tela de Início (16/11, corte do app.js): painel do C.A.O.S., abas Gasto/Entradas/Transferir, dá pra gastar,
// orçamento do dia, últimos lançamentos, a receber, ofensiva e o passo a passo. Mudou só de arquivo.

import { $, cap, catById, centsToInput, dados, esc, srcById, state, renderizar } from '../estado.js';
import { MARCOS_OFENSIVA, aReceber, accountLabel, analyze, calendarioOfensiva, formatBRL, marcarRecebido, mensagemCobranca, monthKey, ofensiva, podeGastar, progressoOrcamentoDiario, resumoEntradas, toISODate, totalBalance } from '../engine.js';
import * as conta from '../conta.js';
import { corCategoria } from '../cores.js';
import * as db from '../db.js';
import { emocaoDoMomento, nomeAlerta } from '../caos/index.js';
import { formaPara, rostoDaForma } from '../avatar.js';
import { intensidade } from '../caos/emocoes.js';
import { perguntarContaDoPix, renderLancar } from './lancar.js';
import { MENOS_MOVIMENTO, barStyle, ic, icCat, icFonte, narrate, nomeForma, setRosto, toast } from '../app.js';

export const PERGUNTAS_PAINEL = ['Vai dar até o fim do mês?', 'Onde estou gastando mais?', 'O que tenho pra pagar?'];

export function renderPainel() {
  if (!$('#painel-caos')) return;
  const oculto = !!state.settings.painelOculto;
  document.body.classList.toggle('sem-painel', oculto);
  $('#painel-mostrar').hidden = !oculto;
  const m = emocaoDoMomento(state.caosMemory, state.settings.mood);
  const r = m.rosto || m.aparencia;
  const forma = formaPara({ rosto: r });
  if (r?.quadros) setRosto($('#painel-face'), rostoDaForma(forma, r)); // 2.1.3.2: segue o avatar
  $('#painel-mood').textContent = nomeForma(forma);
  const pct = Math.round(intensidade(state.caosMemory?.emocoes, m.emocao) * 100);
  $('#painel-int').style.width = `${pct}%`;
  $('#painel-int-barra').setAttribute('aria-label', `Intensidade da emoção: ${pct}%`);
  $('#painel-int-txt').textContent = `Intensidade emocional: ${pct}%`;
  $('#painel-obs').textContent = $('#caos-line').textContent;
  const radar = analyze(dados(), toISODate()).slice(0, 3);
  $('#painel-radar').innerHTML = radar.length
    ? radar.map(a => `<li class="${esc(a.severity)}">${esc(cap(nomeAlerta(a)))}</li>`).join('')
    : '<li class="muted">Nada pedindo atenção agora.</li>';
  $('#painel-perguntas').innerHTML = PERGUNTAS_PAINEL.map(q => `<button type="button" class="chip" data-pergunta="${esc(q)}">${esc(q)}</button>`).join('');
  // menu lateral: saudação, saldo e foguinho
  $('#nav-ola').textContent = state.perfil?.apelido ? `Olá, ${state.perfil.apelido}` : 'Olá!';
  $('#nav-saldo').textContent = state.accounts.some(a => a.tipo !== 'cartao') ? formatBRL(totalBalance(state.accounts, state.expenses, state.incomes, state.transferencias)) : '—';
  $('#nav-fogo').textContent = ''; // 15/11: ofensiva fora da tela até ser repensada
}

export function renderResumoEntradas() {
  const modo = state.resumoModo || 'gasto';
  $('#resumo-card').dataset.modo = modo;
  $('#resumo-gasto').hidden = modo !== 'gasto';
  $('#resumo-entrada').hidden = modo !== 'entrada';
  $('#resumo-transf').hidden = modo !== 'transf';
  for (const b of document.querySelectorAll('[data-resumo]')) b.setAttribute('aria-pressed', String(b.dataset.resumo === modo));
  // fileira de baixo (rascunho do GPT): semana, mês e saldo; gasto em laranja, entrada em verde
  const hojeISO = toISODate();
  const [y, m, d] = hojeISO.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // segunda = 0
  const iniSemana = toISODate(new Date(y, m - 1, d - dow));
  const lista = modo === 'entrada' ? state.incomes : modo === 'transf' ? state.transferencias : state.expenses;
  const semana = lista.filter(x => x.date >= iniSemana && x.date <= hojeISO).reduce((t, x) => t + x.amountCents, 0);
  const doMes = lista.filter(x => (x.month || monthKey(x.date)) === state.viewMonth).reduce((t, x) => t + x.amountCents, 0);
  const cor = modo === 'entrada' ? 'ok' : modo === 'transf' ? '' : 'warn';
  $('#stat-semana-tit').textContent = modo === 'entrada' ? 'Entradas' : modo === 'transf' ? 'Transferido' : 'Gastos';
  $('#stat-mes-tit').textContent = modo === 'entrada' ? 'Entradas do mês' : modo === 'transf' ? 'Transferido no mês' : 'Gastos do mês';
  // Transferências (Anne, 15/11): o que mudou de um banco pro outro no mês; transferir de verdade é em Contas
  const nome = id => { const c = state.accounts.find(a => a.id === id); return c ? accountLabel(c) : 'conta apagada'; };
  const tMes = state.transferencias.filter(t => (t.month || monthKey(t.date)) === state.viewMonth).sort((a, b) => b.date.localeCompare(a.date));
  $('#transf-total').textContent = formatBRL(tMes.reduce((t, x) => t + x.amountCents, 0));
  $('#transf-sub').textContent = tMes.length
    ? `${tMes.length} ${tMes.length === 1 ? 'transferência' : 'transferências'} neste mês. Dinheiro que só mudou de lugar: não é gasto nem entrada.`
    : 'Nenhuma transferência neste mês. Pra transferir, vá em Contas → Transferir entre contas.';
  $('#transf-lista').innerHTML = tMes.slice(0, 8).map(t => `<li><span>${t.date.slice(8, 10)}/${t.date.slice(5, 7)} · ${esc(nome(t.deId))} → ${esc(nome(t.paraId))}${t.note ? ` <small>${esc(t.note)}</small>` : ''}</span><span class="num">${formatBRL(t.amountCents)}</span></li>`).join('');
  $('#stat-semana').textContent = formatBRL(semana);
  $('#stat-mes').textContent = formatBRL(doMes);
  $('#stat-semana').className = `num ${cor}`;
  $('#stat-mes').className = `num ${cor}`;
  pintarTerceiroQuadrinho(modo);
  const r = resumoEntradas(state.incomes, state.expenses, state.viewMonth);
  $('#entrada-total').textContent = formatBRL(r.totalCents);
  const semEntrada = (state.perfil?.mesesSemEntrada || []).includes(state.viewMonth);
  $('#entrada-sub').textContent = !r.quantas && semEntrada ? 'Você marcou que este mês não entrou nada. Tudo certo, anotado.' : r.quantas ? `${r.quantas} ${r.quantas === 1 ? 'entrada' : 'entradas'} neste mês. Toque em "Entradas do mês" embaixo pra ver o relatório.` : 'Nenhuma entrada neste mês ainda. Quando receber, use o botão Lançar.';
  // previstas (15/11): o que ainda vai cair, do mais perto pro mais longe, com o botão Recebi
  const prev = [...state.previstas].sort((a, b) => a.date.localeCompare(b.date));
  $('#previstas-box').hidden = !prev.length;
  $('#previstas-lista').innerHTML = prev.map(p => `<li><span>${p.date.slice(8, 10)}/${p.date.slice(5, 7)} · ${esc(srcById(p.sourceId)?.name || 'Entrada')}${p.note ? ` <small>${esc(p.note)}</small>` : ''}</span>`
    + `<span class="num">${formatBRL(p.amountCents)}</span><button type="button" class="ghost small" data-recebi="${esc(p.id)}">Recebi</button>`
    // 2.3.6.2 (pendência de 15/11): a prevista também se edita e se apaga (antes só tinha "Recebi")
    + `<button type="button" class="ghost small icone-so" data-prev-editar="${esc(p.id)}" aria-label="Editar">${ic('i-editar')}</button>`
    + `<button type="button" class="ghost small icone-so" data-prev-apagar="${esc(p.id)}" aria-label="Apagar">${ic('i-limpar')}</button></li>`).join('');
  const box = $('#falta-receber');
  const doMesPrev = prev.filter(p => p.date.slice(0, 7) === state.viewMonth);
  if (doMesPrev.length) { // com previsto, o "falta receber" usa o que você lançou, não o mês passado
    const tot = doMesPrev.reduce((t, p) => t + p.amountCents, 0);
    const ult = doMesPrev[doMesPrev.length - 1].date;
    box.hidden = false;
    $('#falta-titulo').textContent = 'Falta receber';
    $('#falta-valor').textContent = formatBRL(tot);
    $('#falta-ate').textContent = `até o dia ${Number(ult.slice(8, 10))}`;
    $('#falta-sub').textContent = `Já entrou ${formatBRL(r.totalCents)}; com o previsto, o mês fecha em ${formatBRL(r.totalCents + tot)} de entradas.`;
    return;
  }
  box.hidden = !r.passadoCents;
  if (!r.passadoCents) return;
  if (r.faltaCents) {
    $('#falta-titulo').textContent = 'Falta receber';
    $('#falta-valor').textContent = formatBRL(r.faltaCents);
    $('#falta-ate').textContent = 'pra igualar o mês passado';
    $('#falta-sub').textContent = `O mês passado entrou ${formatBRL(r.passadoCents)}; este já recebeu ${formatBRL(r.totalCents)}.`;
  } else {
    $('#falta-titulo').textContent = 'Acima do mês passado';
    $('#falta-valor').textContent = formatBRL(r.acimaCents);
    $('#falta-ate').textContent = `(o mês passado entrou ${formatBRL(r.passadoCents)})`;
    $('#falta-sub').textContent = r.acimaCents ? 'Já entrou mais do que no mês passado.' : 'Igualzinho ao mês passado.';
  }
  if (r.aReceberCents) $('#falta-sub').textContent += ` Fora isso, ${formatBRL(r.aReceberCents)} pra receber de amigos.`;
}

export function renderPodeGastar(isCurrent) {
  const box = $('#pode-gastar');
  const p = isCurrent ? podeGastar(dados(), toISODate()) : null;
  box.hidden = !p;
  // sem orçamento, o "Defina orçamentos…" some quando já tem o número principal (menos texto na tela)
  $('#total-sub').hidden = !!p && $('#total-bar-wrap').hidden;
  if (!p) return;
  const [, mm, dd] = p.ate.split('-');
  const ate = p.diaSalario ? `até o salário (dia ${Number(dd)})` : 'até o fim do mês';
  $('#pode-valor').textContent = formatBRL(Math.max(0, p.sobraCents));
  $('#pode-valor').className = `num ${p.sobraCents > 0 ? 'ok' : 'bad'}`;
  $('#pode-ate').textContent = ate;
  $('#pode-dia').textContent = p.sobraCents > 0
    ? `≈ ${formatBRL(p.porDiaCents)} por dia nos próximos ${p.dias} ${p.dias === 1 ? 'dia' : 'dias'}`
    : `O mês já passou ${formatBRL(-p.sobraCents)} do que entrou, contando o que ainda vai sair.`;
  // previsto (15/11): o que ainda vai cair até lá entra só como aviso, não no número grande (dinheiro que não caiu não se gasta)
  const vem = state.previstas.filter(x => x.date <= p.ate);
  if (vem.length) {
    const tot = vem.reduce((t, x) => t + x.amountCents, 0);
    $('#pode-dia').textContent += ` · Com os ${formatBRL(tot)} que você vai receber, sobe pra ${formatBRL(Math.max(0, p.sobraCents) + tot)}.`;
  }
  box.dataset.mes = mm;
}

export function renderHoje() {
  const o = progressoOrcamentoDiario(state.expenses, state.perfil?.orcamentoDiarioCents, toISODate());
  const lanc = `${o.countHoje} ${o.countHoje === 1 ? 'gasto' : 'gastos'} hoje`;
  $('#hoje-gasto').textContent = formatBRL(o.gastoHojeCents);
  $('#res-hoje').textContent = o.limiteCents ? `${formatBRL(o.gastoHojeCents)} de ${formatBRL(o.limiteCents)}` : formatBRL(o.gastoHojeCents);
  $('#hoje-card').dataset.status = o.status;
  $('#hoje-ajustar').textContent = o.limiteCents ? 'Ajustar' : 'Definir limite';
  $('#hoje-remover').hidden = !o.limiteCents;
  $('#hoje-bar-wrap').hidden = !o.limiteCents;
  if (!o.limiteCents) {
    $('#hoje-de').textContent = '';
    $('#hoje-sub').textContent = `${lanc}. Defina um limite por dia pra eu te mostrar quanto ainda dá.`;
    return;
  }
  $('#hoje-de').textContent = `de ${formatBRL(o.limiteCents)}`;
  $('#hoje-bar').setAttribute('style', barStyle(o.gastoHojeCents / o.limiteCents));
  $('#hoje-sub').textContent = o.status === 'estourado'
    ? `${lanc} · passou ${formatBRL(o.excedidoCents)} do limite (${o.pct}%).`
    : `${lanc} · restam ${formatBRL(o.restanteCents)} (${o.pct}% usado).`;
}

export function abrirLimiteDiario(abrir = $('#hoje-form').hidden) {
  $('#hoje-form').hidden = !abrir;
  $('#hoje-ajustar').setAttribute('aria-expanded', String(abrir));
  $('#hoje-erro').hidden = true;
  if (abrir) { $('#hoje-limite').value = centsToInput(state.perfil?.orcamentoDiarioCents || 0); $('#hoje-limite').focus(); }
}

export async function salvarLimiteDiario(cents) {
  state.perfil = { ...(state.perfil || {}), orcamentoDiarioCents: cents || null };
  await db.setMeta('perfil', state.perfil);
  abrirLimiteDiario(false);
  renderHoje();
  toast(cents ? `Limite de hoje em diante: ${formatBRL(cents)} por dia.` : 'Limite diário removido.');
}

export function mostrarEntradas() {
  state.filtroTipo = 'entrada';
  state.filtroCat = null;
  location.hash = 'analise';
  renderizar();
}

export function atalho(tipo) {
  if (tipo === 'entradas') return mostrarEntradas(); // 15/11 (JF + Anne): mostra ali mesmo o que entrou no mês
  if (tipo === 'transf') {
    location.hash = 'contas';
    setTimeout(() => { const t = $('#transf-card'); t.open = true; t.scrollIntoView({ block: 'start' }); }, 50);
    return;
  }
  const r = document.querySelector(`input[name="kind"][value="${tipo}"]`);
  r.checked = true; state.kind = tipo;
  location.hash = 'lancar';
  renderLancar();
  setTimeout(() => $('#amount').focus(), 50);
}

export function renderUltimos() {
  const el = $('#ultimos-list');
  if (!el) return;
  const lista = [
    ...state.expenses.map(x => ({ ...x, kind: 'gasto' })),
    ...state.incomes.map(x => ({ ...x, kind: 'entrada' })),
  ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  $('#ultimos-card').hidden = !lista.length;
  // 2.3.3.2 (prints do JF): "5 mais recentes" apertava o título em duas linhas
  $('#res-ultimos').textContent = lista.length ? `${lista.length} itens` : '';
  el.innerHTML = lista.map(x => {
    const [, m, d] = x.date.split('-');
    const nome = x.kind === 'entrada' ? (x.note || srcById(x.sourceId)?.name || 'Entrada') : (x.note || catById(x.categoryId)?.name || 'Gasto');
    const ico = x.kind === 'entrada' ? icFonte(srcById(x.sourceId)) : icCat(catById(x.categoryId));
    return `<li class="${x.kind === 'entrada' ? 'entrada' : ''}">
      <span class="exp-emoji${x.kind === 'entrada' ? '' : ' cat'}" style="--cor-cat:${corCategoria(x.categoryId)}" aria-hidden="true">${ico}</span>
      <span class="exp-main"><span>${esc(nome)}</span><small>${d}/${m} · ${x.kind === 'entrada' ? 'entrada' : esc(catById(x.categoryId)?.name || '')}</small></span>
      <span class="num">${x.kind === 'entrada' ? '+' : ''}${formatBRL(x.amountCents)}</span>
      <button class="icon-btn edit" data-edit="${esc(x.id)}" data-kind="${x.kind}" aria-label="Editar">${ic('i-editar')}</button>
      <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="${x.kind}" aria-label="Apagar">×</button>
    </li>`;
  }).join('');
}

export function ofensivaAgora() {
  return ofensiva({ expenses: state.expenses, incomes: state.incomes, diasSemGasto: state.perfil?.diasSemGasto || [] }, toISODate());
}

export function renderOfensiva() {
  const o = ofensivaAgora();
  const dia = n => `${n} ${n === 1 ? 'dia seguido' : 'dias seguidos'}`;
  $('#ofensiva-card').classList.toggle('apagada', !o.dias);
  $('#ofensiva-dias').textContent = o.dias ? dia(o.dias) : 'Ofensiva zerada';
  $('#ofensiva-sub').textContent = o.dias
    ? (o.hojeFeito ? `Hoje já está garantido. Recorde: ${o.recorde}.` : 'Anote hoje pra não perder o foguinho!')
    : (o.recorde ? `Seu recorde é ${o.recorde}. Anote hoje pra recomeçar.` : 'Anote um gasto hoje pra acender o foguinho.');
  $('#sem-gasto').hidden = o.hojeFeito;
  // calendário dos últimos 28 dias (13/11)
  const cal = calendarioOfensiva({ expenses: state.expenses, incomes: state.incomes, diasSemGasto: state.perfil?.diasSemGasto || [] }, toISODate());
  const feitos = cal.filter(c => c.anotado).length;
  $('#ofensiva-cal').setAttribute('aria-label', `Últimos 28 dias: anotou em ${feitos}.`);
  $('#ofensiva-cal').innerHTML = cal.map(c => {
    const [, m, d] = c.data.split('-');
    const tipo = c.semGasto ? 'sem' : c.anotado ? 'feito' : '';
    return `<li class="${tipo}${c.hoje ? ' hoje' : ''}" title="${d}/${m}${c.semGasto ? ': sem gastos' : c.anotado ? ': anotou' : ''}"><span>${Number(d)}</span></li>`;
  }).join('');
}

export const OFENSIVA_DESLIGADA = true;

export function eventoOfensiva(antes) {
  if (OFENSIVA_DESLIGADA) return []; // 15/11 (Anne): sem comemoração vazia até a ofensiva ser repensada
  const depois = ofensivaAgora();
  if (!antes.hojeFeito && depois.hojeFeito && MARCOS_OFENSIVA.includes(depois.dias)) return [{ type: 'ofensiva_marco', days: depois.dias }];
  return [];
}

/** 2.3.3 (JF): marca um dia como sem gasto (comi fora mas me bancaram). O "Hoje não gastei" usa a mesma coisa. */
export async function marcarDiaSemGasto(dia = toISODate()) {
  const antes = ofensivaAgora();
  const dias = [...new Set([...(state.perfil?.diasSemGasto || []), dia])].sort().slice(-400);
  state.perfil = { ...(state.perfil || {}), diasSemGasto: dias };
  await db.setMeta('perfil', state.perfil);
  renderizar();
  return narrate(eventoOfensiva(antes));
}

export async function hojeNaoGastei() {
  const antes = ofensivaAgora();
  const hoje = toISODate();
  const dias = [...new Set([...(state.perfil?.diasSemGasto || []), hoje])].sort().slice(-400);
  state.perfil = { ...(state.perfil || {}), diasSemGasto: dias };
  await db.setMeta('perfil', state.perfil);
  renderizar();
  const fala = narrate(eventoOfensiva(antes));
  toast(fala ? fala.texto : 'Anotado: hoje sem gastos. O foguinho continua aceso.');
}

export function renderAReceber() {
  const r = aReceber(state.expenses);
  $('#receber-card').hidden = !r.itens.length;
  if (!r.itens.length) return;
  $('#receber-total').textContent = `· ${formatBRL(r.totalCents)}`;
  $('#receber-list').innerHTML = r.itens.map(x => {
    const [, m, d] = x.date.split('-');
    return `<li><span class="exp-main"><span>${esc(x.nome)}</span><small>${d}/${m}${x.note ? ` · ${esc(x.note)}` : ''}</small></span>
      <span class="num">${formatBRL(x.valorCents)}</span>
      <a class="ghost small btn-link" href="https://wa.me/?text=${encodeURIComponent(mensagemCobranca(x))}" target="_blank" rel="noopener" aria-label="Cobrar ${esc(x.nome)} no WhatsApp">Cobrar</a>
      <button type="button" class="ghost small" data-recebi="${esc(x.expenseId)}" data-pessoa="${esc(x.pessoaId)}" aria-label="Recebi de ${esc(x.nome)}">✓ Recebi</button></li>`;
  }).join('');
}

export async function recebi(expenseId, pessoaId) {
  const e = state.expenses.find(x => x.id === expenseId);
  if (!e) return;
  // rachadinha no cartão (13/11): o gasto foi no crédito, mas o Pix do amigo cai numa conta. Pergunta qual.
  const doGasto = e.accountId && state.accounts.find(a => a.id === e.accountId);
  let contaPix = null;
  if ((!doGasto || doGasto.tipo === 'cartao') && state.accounts.some(a => a.tipo !== 'cartao')) {
    const pessoa = e.racha.find(x => x.id === pessoaId);
    const escolha = await perguntarContaDoPix(pessoa.nome, pessoa.valorCents);
    if (escolha === null) return;
    contaPix = escolha || null;
  }
  const novo = marcarRecebido(e, pessoaId, Date.now(), contaPix);
  await db.put(db.STORES.expenses, novo);
  state.expenses = state.expenses.map(x => (x.id === expenseId ? novo : x));
  const p = novo.racha.find(x => x.id === pessoaId);
  const destino = p.contaId || e.accountId;
  const conta = destino && state.accounts.find(a => a.id === destino && a.tipo !== 'cartao');
  renderizar();
  toast(`Recebido: ${formatBRL(p.valorCents)} de ${p.nome}.${conta ? ` Voltou pro saldo de ${accountLabel(conta)}.` : ''}`);
}

export const GUIAS = {
  conta: { passo: 'Passo 1 de 5 · sua conta no app', hash: 'ajustes', abre: '#conta-card', foco: '#conta-card',
    texto: 'Aqui você cria seu login: escolha um apelido e uma senha. Com ele, seus dados aparecem no celular, no tablet e no computador, e sobem embaralhados com a sua senha (nem o servidor consegue ler). Prefere não criar? Pode pular: o app funciona só neste aparelho.' },
  banco: { passo: 'Passo 2 de 5 · seu banco', hash: 'contas', abre: '#add-conta-card', foco: '#add-conta-card',
    texto: 'Escolha o banco, o tipo de conta e coloque o saldo que aparece no app do banco. A gente nunca pede número de cartão, agência nem senha: só valores. O app não mexe no seu banco; o saldo é você que atualiza de vez em quando.' },
  entrada: { passo: 'Passo 3 de 5 · o que você recebe', kind: 'entrada', foco: '#entry-form',
    texto: 'Coloque quanto entrou (salário, freela, Pix) e em qual conta caiu. Se o dinheiro ainda vai cair, marque "Ainda vou receber". Se este mês não entrou nada, toque em "Este mês não entrou nada".' },
  gasto: { passo: 'Passo 4 de 5 · seu primeiro gasto', kind: 'gasto', foco: '#entry-form',
    texto: 'Valor, o que foi e como pagou. Mais rápido ainda: no Chat, escreva "gastei 30 no mercado" ou mande a foto do comprovante. Hoje não gastou nada? Toque em "Hoje não gastei nada".' },
  // 16/11 (JF): guias só da ajuda rápida (o "?"), fora do passo a passo
  cartao: { passo: 'Ajuda rápida · seu cartão de crédito', hash: 'contas', abre: '#add-cartao-card', foco: '#add-cartao-card',
    texto: 'Escolha o banco do cartão, o limite e os dias de fechamento e vencimento. Se já usou parte do limite, coloque quanto. Nada de número do cartão: só os valores. Depois, gasto no crédito vai direto pra fatura dele.' },
  transferir: { passo: 'Ajuda rápida · transferir entre contas', hash: 'contas', abre: '#transf-card', foco: '#transf-card',
    texto: 'Escolha de qual conta sai, pra qual vai e o valor. Transferência não é gasto nem entrada: o dinheiro só muda de lugar. Só aparece quando você tem 2 contas ou mais.' },
  chat: { passo: 'Passo 5 de 5 · converse comigo', hash: 'conversa', foco: '#chat-form',
    texto: 'Aqui você fala comigo: "quanto gastei este mês?", "dá pra gastar quanto até o salário?", "vou receber 500 dia 20". A IA online já vem ligada pra perguntas mais livres. Se travar, toca no "?" que eu ajudo.' },
};

export function guiar(id, { ajuda = false } = {}) {
  let g = GUIAS[id];
  if (!g) return;
  // pela ajuda rápida, o título diz "Ajuda rápida" em vez de "Passo 2 de 5" (16/11)
  if (ajuda && /^Passo/.test(g.passo)) g = { ...g, passo: `Ajuda rápida · ${g.passo.split(' · ')[1]}` };
  // transferir só existe com 2 contas ou mais: sem isso, leva pra cadastrar o banco
  if (id === 'transferir' && $('#transf-card')?.hidden) g = { ...GUIAS.banco, passo: 'Ajuda rápida · primeiro, 2 contas', texto: 'Pra transferir, você precisa de pelo menos 2 contas. Cadastre aqui a que falta (só o banco, o tipo e o saldo).' };
  if (g.kind) atalhoLancar(g.kind); else location.hash = g.hash;
  setTimeout(() => {
    const d = g.abre && $(g.abre);
    if (d && 'open' in d) d.open = true;
    document.querySelectorAll('.guia-foco').forEach(e => e.classList.remove('guia-foco'));
    const alvo = $(g.foco);
    if (alvo) { alvo.classList.add('guia-foco'); alvo.scrollIntoView({ behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth', block: 'start' }); }
    $('#guia-passo').textContent = g.passo;
    $('#guia-texto').textContent = g.texto;
    $('#guia-pular').hidden = id !== 'conta';
    $('#guia').hidden = false;
  }, 120);
}

export function fecharGuia() {
  $('#guia').hidden = true;
  document.querySelectorAll('.guia-foco').forEach(e => e.classList.remove('guia-foco'));
}

export function atalhoLancar(tipo) {
  const r = document.querySelector(`input[name="kind"][value="${tipo}"]`);
  if (r) { r.checked = true; state.kind = tipo; }
  location.hash = 'lancar';
  renderLancar();
}

export function renderComece() {
  const temBanco = state.accounts.some(a => a.tipo !== 'cartao');
  const passos = [
    { feito: !!state.temConta || !!state.settings.pulouConta, txt: 'Crie sua conta no app (ou pule)', ir: 'conta' },
    { feito: temBanco, txt: 'Cadastre a conta do seu banco', ir: 'banco' },
    { feito: state.incomes.length > 0 || state.previstas.length > 0 || (state.perfil?.mesesSemEntrada || []).length > 0, txt: 'Lance o que você recebe', ir: 'entrada' },
    { feito: state.expenses.length > 0 || (state.perfil?.diasSemGasto || []).length > 0, txt: 'Anote seu primeiro gasto', ir: 'gasto' },
    { feito: state.chat.some(m => m.de === 'eu'), txt: 'Converse com o C.A.O.S.', ir: 'chat' },
  ];
  const feitos = passos.filter(p => p.feito).length;
  $('#comece-card').hidden = feitos === passos.length;
  $('#comece-conta').textContent = `${feitos} de ${passos.length}`;
  $('#comece-lista').innerHTML = passos.map((p, i) => `
    <li class="${p.feito ? 'feito' : ''}">${p.feito
      ? `<span class="passo-n" aria-hidden="true">${ic('i-ok')}</span><span>${esc(p.txt)}</span>`
      : `<button type="button" data-guia="${p.ir}"><span class="passo-n" aria-hidden="true">${i + 1}</span><span>${esc(p.txt)}</span><span class="passo-seta" aria-hidden="true">›</span></button>`}</li>`).join('');
}

// 3º quadrinho do cartão (JF, 16/11, imagens do GPT): contraste com a aba. No Gasto, os dois primeiros são laranja e o
// 3º é a Sobra do mês (verde: entradas − gastos). Nas Entradas, os dois primeiros são verdes e o 3º é o "Já saiu" (era Déficit do mês até a 2.3.2.1)
// (laranja: o que já saiu das entradas, ou seja, os gastos do mês). Se saiu mais do que entrou, no Gasto ele vira
// "Déficit do mês" em laranja, com a diferença (a cor não esconde número ruim).
export function pintarTerceiroQuadrinho(modo = state.resumoModo || 'gasto') {
  const mes = state.viewMonth;
  const doMes = l => l.filter(x => (x.month || monthKey(x.date)) === mes).reduce((t, x) => t + x.amountCents, 0);
  const entrou = doMes(state.incomes), saiu = doMes(state.expenses);
  const box = $('#stat-net-box'); // na aba Transferir, fica a conta do Gasto (sobra ou déficit de verdade)
  let tit, valor, tipo;
  // 2.3.2.1 (JF): na aba Entradas o número é o que já saiu; "Déficit" confundia com o da aba Gasto
  if (modo === 'entrada') { tit = 'Já saiu'; valor = saiu; tipo = 'deficit'; }
  else if (saiu > entrou) { tit = 'Déficit do mês'; valor = saiu - entrou; tipo = 'deficit'; }
  else { tit = 'Sobra do mês'; valor = entrou - saiu; tipo = 'sobra'; }
  $('#stat-net-tit').textContent = tit;
  $('#stat-net').textContent = formatBRL(valor);
  $('#stat-net').className = `num ${tipo === 'deficit' ? 'warn' : 'ok'}`;
  box.classList.toggle('deficit', tipo === 'deficit');
  box.classList.toggle('sobra', tipo === 'sobra');
}
