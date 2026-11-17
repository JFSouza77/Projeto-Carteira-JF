// Tela do Mês (16/11, corte do app.js): planejamento, compromissos, planos e metas. Mudou só de arquivo.

import { $, cap, catById, dados, esc, srcById, state, renderizar } from '../estado.js';
import { SUGESTOES, conversar } from '../caos/index.js';
import { TIPOS_COMPROMISSO, accountLabel, analisarPlanejamento, createCompromisso, createMeta, createPlano, formatBRL, guardarNaMeta, lerMesAlvo, monthKey, monthLabel, parseAmount, progressoMeta, shiftMonth, simularCompra, situacaoCompromissos, sugerirCategoria, summarizeMonth, toISODate } from '../engine.js';
import { addMsg, renderChat } from './chat.js';
import * as db from '../db.js';
import { opcoesDeConta } from './contas.js';
import { textoMeta } from '../caos/conversa.js';
import { caosDiz, ic, icCat, narrate, toast } from '../app.js';
import { registrarGasto } from './lancar.js';

export function iniciarMeta(nome = null, { jaFalou = false } = {}) {
  state.metaFlow = { passo: nome ? 'quanto' : 'pra_que', dados: { nome } };
  if (location.hash.slice(1) !== 'conversa') location.hash = 'conversa';
  if (nome) caosDiz('meta_quanto', { meta: nome }, ['Cancelar']);
  else if (!jaFalou) caosDiz('meta_pra_que', {}, ['Reserva de emergência', 'Uma viagem', 'Um show', 'Cancelar']);
  else {
    const ult = [...state.chat].reverse().find(m => m.de === 'caos');
    if (ult) { ult.sugestoes = ['Reserva de emergência', 'Uma viagem', 'Um show', 'Cancelar']; renderChat(); }
  }
}

export async function metaResposta(t) {
  const f = state.metaFlow;
  const d = f.dados;
  addMsg({ de: 'eu', texto: t });
  if (/^(cancela|cancelar|deixa|esquece|depois)/i.test(t)) {
    state.metaFlow = null;
    addMsg({ de: 'caos', texto: 'Sem problema, deixei pra lá. Quando quiser, é só falar "quero montar uma meta".', sugestoes: SUGESTOES.slice(0, 5) });
    return;
  }
  if (f.passo === 'pra_que') {
    d.nome = t.replace(/^(pra|para)\s+(um|uma|o|a)?\s*/i, '').trim().slice(0, 60);
    d.nome = d.nome ? d.nome[0].toUpperCase() + d.nome.slice(1) : 'Minha meta';
    f.passo = 'quanto';
    caosDiz('meta_quanto', { meta: d.nome }, ['Cancelar']);
  } else if (f.passo === 'quanto') {
    const v = parseAmount(t.replace(/[a-z]/gi, ' '));
    if (!v) return addMsg({ de: 'caos', texto: 'Não peguei o valor. Manda só o número, tipo 600 ou 1.500,00.', sugestoes: ['Cancelar'] });
    d.alvoCents = v;
    f.passo = 'tem';
    caosDiz('meta_tem', {}, ['0', 'Cancelar']);
  } else if (f.passo === 'tem') {
    const v = /^\s*(0|zero|nada|nenhum)/i.test(t) ? 0 : parseAmount(t.replace(/[a-z]/gi, ' '));
    if (v == null) return addMsg({ de: 'caos', texto: 'Manda só o número que já tem guardado (ou 0).', sugestoes: ['0', 'Cancelar'] });
    d.guardadoCents = Math.min(v, d.alvoCents);
    f.passo = 'ate';
    caosDiz('meta_ate', {}, ['Em 6 meses', 'Fim do ano', 'Em 1 ano', 'Sem prazo']);
  } else if (f.passo === 'ate') {
    const semPrazo = /sem prazo|nao sei|não sei|tanto faz/i.test(t);
    const ate = semPrazo ? null : lerMesAlvo(t, toISODate());
    if (!ate && !semPrazo) return addMsg({ de: 'caos', texto: 'Não entendi o prazo. Pode ser "dezembro", "em 6 meses", "04/2027" ou "sem prazo".', sugestoes: ['Em 6 meses', 'Fim do ano', 'Sem prazo'] });
    state.metaFlow = null;
    try {
      const meta = createMeta({ nome: d.nome, alvoCents: d.alvoCents, guardadoCents: d.guardadoCents, ate });
      const p = progressoMeta(meta, toISODate());
      addMsg({ de: 'caos', texto: `Montei assim: ${textoMeta(p)} Posso salvar essa meta?`, acao: { tipo: 'criar_meta', meta } });
    } catch (e) {
      addMsg({ de: 'caos', texto: `Não consegui montar: ${e.message}`, sugestoes: ['Quero montar uma meta'] });
    }
  }
}

export async function salvarMetas(lista) {
  state.metas = lista;
  await db.setMeta('metas', lista);
  renderMetas();
}

// Anel de progresso das metas (V2 do AI Studio, 13/11): SVG simples, sem D3. Enche do valor anterior pro novo.
export const ANEL_R = 26, ANEL_C = 2 * Math.PI * ANEL_R;

export const pctAnteriorMeta = new Map();

export const anelMeta = (pct, batida, pctInicio) => `
  <svg class="anel${batida ? ' batida' : ''}" viewBox="0 0 64 64" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${pct}% da meta">
    <circle class="anel-fundo" cx="32" cy="32" r="${ANEL_R}"/>
    <circle class="anel-valor" cx="32" cy="32" r="${ANEL_R}" stroke-dasharray="${ANEL_C.toFixed(2)}" stroke-dashoffset="${(ANEL_C * (1 - pctInicio / 100)).toFixed(2)}" data-alvo="${(ANEL_C * (1 - pct / 100)).toFixed(2)}"/>
    <text x="32" y="32" class="anel-txt">${pct}%</text>
  </svg>`;

export function renderMetas() {
  const el = $('#meta-list');
  if (!el) return;
  const hoje = toISODate();
  const nM = state.metas.length;
  if ($('#res-metas')) $('#res-metas').textContent = nM ? `${nM} ${nM === 1 ? 'meta' : 'metas'}` : 'juntar dinheiro';
  el.innerHTML = state.metas.map(m => {
    const p = progressoMeta(m, hoje);
    const antes = pctAnteriorMeta.has(m.id) ? pctAnteriorMeta.get(m.id) : p.pct;
    pctAnteriorMeta.set(m.id, p.pct);
    return `<li class="meta-item">
      ${anelMeta(p.pct, p.batida, antes)}
      <div class="meta-corpo">
        <strong>${ic(p.batida ? 'i-trofeu' : 'i-meta')} ${esc(m.nome)}</strong>
        <small class="muted">${esc(p.batida ? `Meta batida! ${formatBRL(m.alvoCents)} guardados. 🎉` : textoMeta(p))}</small>
        <div class="account-actions">
          ${p.batida ? '' : `<button class="ghost" data-meta-guardar="${esc(m.id)}">＋ Guardar</button>`}
          <button class="ghost" data-meta-del="${esc(m.id)}">Remover</button>
        </div>
      </div>
    </li>`;
  }).join('') || '<li class="muted small">Nenhuma meta ainda. Monta uma com o C.A.O.S.!</li>';
  // dois quadros depois, o anel anda do valor anterior pro novo (a transição do CSS faz o resto)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const c of el.querySelectorAll('.anel-valor')) c.setAttribute('stroke-dashoffset', c.dataset.alvo);
  }));
}

export async function guardarEmMeta(id, valorCents) {
  const m = state.metas.find(x => x.id === id);
  if (!m) return;
  const { meta, batidaAgora } = guardarNaMeta(m, valorCents);
  await salvarMetas(state.metas.map(x => (x.id === id ? meta : x)));
  const p = progressoMeta(meta, toISODate());
  if (batidaAgora) {
    caosDiz('meta_batida', { meta: meta.nome, nome: state.perfil?.apelido || 'você' }, ['Quero montar uma meta']);
    $('#caos-line').textContent = `Meta ${meta.nome} batida! 🎉`;
  } else {
    caosDiz('meta_guardou', { meta: meta.nome, valor: formatBRL(valorCents), pct: p.pct, resta: formatBRL(p.faltaCents) });
  }
}

export const nomeMes = k => cap(monthLabel(k));

export function prepararFormCompromisso() {
  $('#comp-tipo').innerHTML = Object.entries(TIPOS_COMPROMISSO).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('');
  const hoje = monthKey(toISODate());
  $('#comp-inicio').innerHTML = [0, 1, 2, 3].map(i => {
    const k = shiftMonth(hoje, i);
    return `<option value="${k}">${i === 0 ? 'este mês' : i === 1 ? 'mês que vem' : nomeMes(k)}</option>`;
  }).join('');
  $('#comp-cat').innerHTML = state.categories.map(c => `<option value="${esc(c.id)}" ${c.id === 'contas' ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  $('#comp-conta-field').hidden = !state.accounts.length;
  $('#comp-conta').innerHTML = opcoesDeConta();
}

export function textoStatus(c) {
  if (!c.noMes) return `próxima vez: ${nomeMes(c.proximaVez).toLowerCase()}`;
  if (c.status === 'pago') return `pago este mês (${formatBRL(c.pagoCents)})`;
  const parcial = c.parcial ? ` · pagou ${formatBRL(c.pagoCents)}, falta ${formatBRL(c.faltaCents)}` : '';
  if (c.status === 'atrasado') return `venceu dia ${c.diaNoMes}${parcial}`;
  if (c.parcial) return `${c.diaNoMes ? `vence dia ${c.diaNoMes}` : 'é deste mês'}${parcial}`;
  if (c.status === 'pendente') return 'é deste mês';
  return c.diasParaVencer === 0 ? 'vence hoje' : c.diasParaVencer === 1 ? 'vence amanhã' : `vence dia ${c.diaNoMes} (em ${c.diasParaVencer} dias)`;
}

export function renderMes() {
  renderMetas();
  const hoje = toISODate();
  const a = analisarPlanejamento(dados(), hoje);
  $('#mes-titulo').textContent = `Planejamento · ${nomeMes(a.month)}`;
  const el = $('#plan-sobra');
  if (a.sobraCents == null) {
    // sem entrada nem orçamento: frase no lugar do "—" gigante (revisão do Code, 12/11)
    el.textContent = 'Lance sua entrada pra eu calcular';
    el.className = 'big vazio';
  } else {
    el.textContent = formatBRL(a.sobraCents);
    el.className = `big ${a.sobraCents < 0 ? 'bad' : 'ok'}`;
  }
  // 2.3.2.2 (JF): o cartão ganha um tom pelo resultado (verde sobrando, vermelho faltando)
  $('#plan-resumo').classList.toggle('pos', a.sobraCents != null && a.sobraCents >= 0);
  $('#plan-resumo').classList.toggle('neg', a.sobraCents != null && a.sobraCents < 0);
  // 15/11 (Anne): cada linha abre e mostra o que tem dentro (entradas do mês, onde gastou, o que falta pagar, os planos)
  const dm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const det = (itens, vazio) => itens.length
    ? `<ul class="plan-det">${itens.map(([k, v]) => `<li><span>${k}</span><span class="num">${esc(v)}</span></li>`).join('')}</ul>`
    : `<p class="muted small plan-det-vazio">${esc(vazio)}</p>`;
  const entradasMes = state.incomes.filter(i => monthKey(i.date) === a.month).sort((x, y) => y.date.localeCompare(x.date));
  const contaNome = id => { const c = state.accounts.find(x => x.id === id); return c ? accountLabel(c) : ''; };
  const itensEntrada = entradasMes.map(i => [`${dm(i.date)} · ${esc(srcById(i.sourceId)?.name || 'Entrada')}${i.note ? ` <small>${esc(i.note)}</small>` : ''}${i.accountId ? ` <small>${esc(contaNome(i.accountId))}</small>` : ''}`, formatBRL(i.amountCents)]);
  const porCat = summarizeMonth(state.expenses, state.categories, a.month).rows.filter(r => r.spentCents > 0).sort((x, y) => y.spentCents - x.spentCents);
  const itensGasto = porCat.map(r => [`${icCat(catById(r.id))} ${esc(r.name)}`, formatBRL(r.spentCents)]);
  const itensComp = a.compromissos.filter(c => c.status !== 'pago').map(c => [`${esc(c.nome)} <small>${esc(textoStatus(c))}</small>`, formatBRL(c.faltaCents)]);
  const itensPlanos = a.planos.filter(p => !p.feito).map(p => [esc(p.nome), formatBRL(p.valorCents)]);
  const linhas = [
    [a.baseTipo === 'orcamento' ? 'Orçamento do mês' : 'Entradas do mês', a.baseTipo ? formatBRL(a.baseCents) : 'nenhuma ainda', 'entrada',
      a.baseTipo === 'orcamento' && !entradasMes.length ? '<p class="muted small plan-det-vazio">Sem entrada lançada este mês: a conta usa a soma dos orçamentos.</p>' : det(itensEntrada, 'Nenhuma entrada este mês. Use o botão Lançar quando receber.')],
    ['Já saiu', `− ${formatBRL(a.gastosCents)}`, 'saiu', det(itensGasto, 'Nenhum gasto este mês.')],
    ['Compromissos a pagar', `− ${formatBRL(a.compPendentesCents)}`, 'comp', det(itensComp, 'Nada pendente este mês.')],
    ['Planos a fazer', `− ${formatBRL(a.planosPendentesCents)}`, 'planos', det(itensPlanos, 'Nenhum plano pendente.')],
  ];
  const abertas = new Set([...document.querySelectorAll('#plan-linhas details[open]')].map(d => d.dataset.linha));
  $('#plan-linhas').innerHTML = linhas.map(([k, v, id, corpo]) => `<li><details class="plan-linha" data-linha="${id}" ${abertas.has(id) ? 'open' : ''}><summary><span>${esc(k)}</span><span class="num">${esc(v)}</span></summary>${corpo}</details></li>`).join('');
  // a análise do C.A.O.S. (só leitura: não muda a memória dele)
  const { fala } = conversar('cabe no mês?', dados(), { mood: state.settings.mood, memory: state.caosMemory, perfil: state.perfil });
  $('#plan-caos').textContent = fala.texto;

  const sit = situacaoCompromissos(state.compromissos, state.expenses, hoje);
  $('#comp-list').innerHTML = sit.length ? sit.map(c => {
    const cat = catById(c.categoryId);
    const rep = c.cadaMeses === 1 ? 'todo mês' : c.cadaMeses === 12 ? 'todo ano' : `a cada ${c.cadaMeses} meses`;
    return `
    <li class="${c.status}">
      <span class="comp-info"><span>${icCat(cat)} ${esc(c.nome)}</span>
        <small>${esc(TIPOS_COMPROMISSO[c.tipo])} · ${rep}${c.dia ? ` · dia ${c.dia}` : ''} · ${esc(textoStatus(c))}</small></span>
      <span class="num">${formatBRL(c.valorCents)}</span>
      <span class="comp-acoes">
        ${c.noMes && c.status !== 'pago' ? `<button class="lancar" data-comp-lancar="${esc(c.id)}">Paguei · lançar</button>` : ''}
        <button data-comp-del="${esc(c.id)}">Remover</button>
      </span>
    </li>`;
  }).join('') : '<li class="muted">Nenhum compromisso ainda. Adicione contas fixas, faturas e assinaturas.</li>';

  const aPagar = sit.filter(c => c.noMes && c.status !== 'pago');
  $('#res-comp').textContent = sit.length ? (aPagar.length ? `${aPagar.length} a pagar · ${formatBRL(aPagar.reduce((t, c) => t + c.valorCents, 0))}` : 'tudo pago') : 'contas fixas';
  const pend = a.planos.filter(p => !p.feito);
  $('#res-planos').textContent = a.planos.length ? `${pend.length} a fazer` : 'o que vai comprar';
  $('#plan-list').innerHTML = a.planos.length ? a.planos.map(p => `
    <li class="${p.feito ? 'feito' : ''}">
      <label class="plan-info"><input type="checkbox" data-plan-feito="${esc(p.id)}" ${p.feito ? 'checked' : ''}><span>${esc(p.nome)}</span></label>
      <span class="num">${formatBRL(p.valorCents)} <button class="icon-btn del" data-plan-del="${esc(p.id)}" aria-label="Remover plano">×</button></span>
    </li>`).join('') : '<li class="muted">Nada planejado ainda. O que você quer comprar ou gastar este mês?</li>';
}

export function onSimular(ev) {
  ev.preventDefault();
  const out = $('#sim-resultado');
  const valor = parseAmount($('#sim-valor').value);
  if (!valor) { out.hidden = false; out.className = 'sim-resultado'; out.textContent = 'Digite o valor da compra.'; return; }
  const a = analisarPlanejamento(dados(), toISODate());
  const r = simularCompra({ valorCents: valor, parcelas: Number($('#sim-parcelas').value) }, a);
  const resto = r.parcelas > 1 ? ` Depois ainda vêm ${r.parcelas - 1} parcelas de ${formatBRL(r.parcelaCents)} nos próximos meses.` : '';
  const textos = {
    sem_base: 'Lance sua entrada do mês (ou um orçamento) pra eu comparar com a sobra.',
    folga: `Cabe com folga. A sobra prevista vai de ${formatBRL(a.sobraCents)} pra ${formatBRL(r.sobraDepoisCents)}.${resto}`,
    aperta: `Cabe, mas aperta: a sobra prevista fica em ${formatBRL(r.sobraDepoisCents)}. Qualquer imprevisto passa do limite.${resto}`,
    nao_cabe: `Não cabe este mês: falta ${formatBRL(r.faltaCents)}.${r.parcelasQueCabem ? ` Em ${r.parcelasQueCabem} vezes a parcela caberia, mas pense se vale prender os próximos meses.` : ' Que tal esperar o mês que vem?'}`,
  };
  out.hidden = false;
  out.className = `sim-resultado ${r.situacao}`;
  out.textContent = textos[r.situacao];
}

export async function onAddCompromisso(ev) {
  ev.preventDefault();
  const err = $('#comp-error');
  err.hidden = true;
  try {
    const valor = $('#comp-valor').value.trim() ? parseAmount($('#comp-valor').value) : 0;
    if (valor == null) throw new Error('Valor inválido.');
    const c = createCompromisso({
      nome: $('#comp-nome').value, valorCents: valor, tipo: $('#comp-tipo').value, categoryId: $('#comp-cat').value,
      dia: $('#comp-dia').value || null, cadaMeses: Number($('#comp-cada').value), inicioMes: $('#comp-inicio').value,
      accountId: $('#comp-conta').value || null,
    }, { categories: state.categories });
    await db.put(db.STORES.compromissos, c);
    state.compromissos.push(c);
    $('#comp-form').reset();
    prepararFormCompromisso();
    renderMes();
    renderizar();
    toast(`Pronto, anotei: ${c.nome}. Eu lembro quando chegar a hora.`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

export async function lancarCompromisso(id) {
  const c = state.compromissos.find(x => x.id === id);
  if (!c) return;
  const sit = situacaoCompromissos([c], state.expenses, toISODate())[0];
  let valor = sit?.faltaCents || c.valorCents;
  const r = prompt(`Quanto foi ${c.nome}? (confira o valor)`, (valor / 100).toFixed(2).replace('.', ','));
  if (r == null) return;
  valor = parseAmount(r);
  if (!valor) return toast('Valor inválido.');
  const events = await registrarGasto({ amountCents: valor, categoryId: c.categoryId, note: c.nome, date: toISODate(), accountId: c.accountId, compromissoId: c.id });
  const fala = narrate(events, { ignoreCooldown: true });
  renderMes();
  toast(fala ? fala.texto : `${c.nome} lançado.`);
}

export async function removerCompromisso(id) {
  const c = state.compromissos.find(x => x.id === id);
  if (!c || !confirm(`Remover o compromisso ${c.nome}? Os lançamentos já feitos continuam.`)) return;
  await db.remove(db.STORES.compromissos, id);
  state.compromissos = state.compromissos.filter(x => x.id !== id);
  renderMes();
  renderizar();
}

export async function onAddPlano(ev) {
  ev.preventDefault();
  const err = $('#plan-error');
  err.hidden = true;
  try {
    const nome = $('#plan-nome').value;
    const sug = sugerirCategoria(nome, state.expenses);
    const p = createPlano({ nome, valorCents: parseAmount($('#plan-valor').value) || 0, categoryId: sug?.categoryId || 'outros' });
    await db.put(db.STORES.planos, p);
    state.planos.push(p);
    $('#plan-nome').value = '';
    $('#plan-valor').value = '';
    renderMes();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

export async function marcarPlano(id, feito) {
  const p = state.planos.find(x => x.id === id);
  if (!p) return;
  if (feito) {
    // Cancelou? Nada muda: o plano continua pendente e nenhum gasto é gravado (revisão 06/11).
    if (!confirm(`Lançar ${formatBRL(p.valorCents)} de ${p.nome} como gasto agora?`)) { renderMes(); return; }
    try {
      const events = await registrarGasto({ amountCents: p.valorCents, categoryId: p.categoryId, note: p.nome, date: toISODate() });
      narrate(events);
    } catch (e) {
      toast(e.message || 'Não deu pra lançar. O plano continua pendente.');
      renderMes();
      return;
    }
  }
  const upd = { ...p, feito };
  await db.put(db.STORES.planos, upd);
  state.planos = state.planos.map(x => (x.id === id ? upd : x));
  renderMes();
}

export async function removerPlano(id) {
  const p = state.planos.find(x => x.id === id);
  if (!p || !confirm(`Remover o plano ${p.nome}?`)) return;
  await db.remove(db.STORES.planos, id);
  state.planos = state.planos.filter(x => x.id !== id);
  renderMes();
}
