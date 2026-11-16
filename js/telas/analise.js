// Análise do mês (16/11, corte do app.js): gráficos feitos à mão, lista de lançamentos, busca e exportar CSV/PDF.

import { $, cap, catById, esc, srcById, state } from '../estado.js';
import { accountLabel, formatBRL, gastoPorDia, incomeIn, monthKey, monthLabel, parseAmount, serieMensal, summarizeMonth, toISODate, valorProprio } from '../engine.js';
import * as conta from '../conta.js';
import { corCategoria } from '../cores.js';
import { toast } from '../app.js';

export const brlCurto = c => (c >= 100000 ? `R$ ${(c / 100000).toFixed(1).replace('.', ',')} mil` : formatBRL(c).replace(',00', ''));

// Gráficos vivos (V2 do AI Studio, 13/11): cada um tem dois jeitos de ver e mostra o detalhe ao tocar/passar o cursor.
export const grafico = { ritmo: 'acum', meses: 'comparar', cat: 'barras', diaSel: null, mesSel: null };

export function marcarSeg(attr, valor) {
  for (const b of document.querySelectorAll(`[data-${attr}]`)) b.setAttribute('aria-pressed', String(b.dataset[attr] === valor));
}

export function renderGraficos() {
  const card = $('#graficos-card');
  if (!card) return;
  const temAlgo = state.expenses.length + state.incomes.length > 0;
  card.hidden = !temAlgo;
  if (!temAlgo) return;
  renderMeses();
  renderRitmo();
  // Calendário de calor: quanto mais forte a cor, mais gasto no dia
  const dias = gastoPorDia(state.expenses, state.viewMonth);
  const topo = Math.max(...dias);
  const primeiro = new Date(`${state.viewMonth}-01T12:00:00`).getDay(); // 0 = domingo
  const vazio = Array(primeiro).fill('<span class="vazio"></span>').join('');
  const nivel = v => (!v ? 0 : Math.min(4, 1 + Math.floor((v / topo) * 3.999)));
  $('#grafico-calor').innerHTML = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span class="sem">${d}</span>`).join('') + vazio
    + dias.map((v, i) => `<span class="dia n${nivel(v)}" title="Dia ${i + 1}: ${formatBRL(v)}" aria-label="Dia ${i + 1}: ${v ? formatBRL(v) : 'sem gasto'}">${i + 1}</span>`).join('');
  const maior = dias.indexOf(topo);
  $('#calor-titulo').textContent = `Dias com mais gasto em ${nomeMesCurto(state.viewMonth)}`;
  $('#calor-legenda').textContent = topo ? `O dia mais pesado foi o ${maior + 1}: ${formatBRL(topo)}.` : 'Nenhum gasto neste mês ainda.';
}

export function renderMeses() {
  const serie = serieMensal(state.expenses, state.incomes, state.viewMonth, 6);
  const modo = grafico.meses;
  marcarSeg('meses', modo);
  const W = 320, H = 150, P = { l: 6, r: 6, t: 14, b: 22 };
  const larg = (W - P.l - P.r) / serie.length;
  const temEntrada = serie.some(m => m.entradasCents > 0);
  const sel = serie.find(m => m.month === grafico.mesSel) ? grafico.mesSel : serie[serie.length - 1].month;
  let corpo = '';
  if (modo === 'saldo') {
    const saldos = serie.map(m => m.entradasCents - m.gastosCents);
    // o zero fica onde a proporção pede: sem mês no vermelho, ele vai lá pra baixo e as barras usam a altura toda
    const maxPos = Math.max(0, ...saldos), maxNeg = Math.max(0, ...saldos.map(v => -v));
    const util = H - P.t - P.b, soma = Math.max(1, maxPos + maxNeg);
    const zero = P.t + util * (maxPos / soma);
    const bw = Math.min(26, larg * 0.55);
    corpo = `<line x1="${P.l}" x2="${W - P.r}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}" class="eixo"/>` + serie.map((m, i) => {
      const v = saldos[i], h = Math.max(1, (Math.abs(v) / soma) * util), cx = P.l + larg * i + larg / 2;
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(v >= 0 ? zero - h : zero).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" class="${v >= 0 ? 'b-pos' : 'b-neg'}${m.month === sel ? ' sel' : ''}"/>`
        + `<text x="${cx.toFixed(1)}" y="${H - 6}" text-anchor="middle" class="${m.month === sel ? 'sel' : ''}">${nomeMesCurto(m.month)}</text>`;
    }).join('');
  } else {
    const max = Math.max(1, ...serie.flatMap(m => [m.gastosCents, m.entradasCents]));
    const bw = Math.min(16, larg / 3);
    const alt = v => (v / max) * (H - P.t - P.b);
    const barra = (x, v, cls) => v ? `<rect x="${x.toFixed(1)}" y="${(H - P.b - alt(v)).toFixed(1)}" width="${bw}" height="${Math.max(1, alt(v)).toFixed(1)}" rx="3" class="${cls}"/>` : '';
    corpo = `<line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" class="eixo"/>` + serie.map((m, i) => {
      const cx = P.l + larg * i + larg / 2;
      return (m.month === sel ? `<rect x="${(cx - larg / 2 + 2).toFixed(1)}" y="${P.t - 8}" width="${(larg - 4).toFixed(1)}" height="${H - P.b - P.t + 8}" rx="8" class="foco"/>` : '')
        + (temEntrada ? barra(cx - bw - 1, m.entradasCents, 'b-entrada') + barra(cx + 1, m.gastosCents, 'b-gasto') : barra(cx - bw / 2, m.gastosCents, 'b-gasto'))
        + `<text x="${cx.toFixed(1)}" y="${H - 6}" text-anchor="middle" class="${m.month === sel ? 'sel' : ''}">${nomeMesCurto(m.month)}</text>`;
    }).join('');
  }
  // faixas invisíveis pra tocar em cada mês
  const alvos = serie.map((m, i) => `<rect x="${(P.l + larg * i).toFixed(1)}" y="0" width="${larg.toFixed(1)}" height="${H}" class="alvo" data-mes="${m.month}"/>`).join('');
  const desc = `Últimos 6 meses: ${serie.map(m => `${nomeMesCurto(m.month)} entradas ${formatBRL(m.entradasCents)}, gastos ${formatBRL(m.gastosCents)}`).join('; ')}.`;
  $('#grafico-meses').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="g-linha g-barras" role="img" aria-label="${esc(desc)}">${corpo}${alvos}</svg>`;
  const m = serie.find(x => x.month === sel);
  const saldo = m.entradasCents - m.gastosCents;
  const poupado = m.entradasCents > 0 && saldo > 0 ? ` · ${Math.round((saldo / m.entradasCents) * 100)}% poupado` : '';
  $('#meses-info').innerHTML = `<strong>${nomeMesCurto(m.month)}</strong>: entrou ${formatBRL(m.entradasCents)}, saiu ${formatBRL(m.gastosCents)} · saldo <span class="${saldo < 0 ? 'bad' : 'ok'}">${formatBRL(saldo)}</span>${poupado}`;
  $('#meses-legenda').innerHTML = modo === 'saldo'
    ? '<span class="ponto pos"></span>Sobrou <span class="ponto neg"></span>Faltou'
    : `<span class="ponto entrada"></span>Entradas <span class="ponto gasto"></span>Gastos`;
  $('#meses-legenda').hidden = modo === 'comparar' && !temEntrada;
}

export function renderRitmo() {
  const mes = state.viewMonth;
  const dias = gastoPorDia(state.expenses, mes);
  const total = dias.length;
  const hojeISO = toISODate();
  const ate = monthKey(hojeISO) === mes ? Number(hojeISO.slice(8, 10)) : mes < monthKey(hojeISO) ? total : 0;
  const orc = state.categories.reduce((t, c) => t + (c.budgetCents || 0), 0);
  const base = orc || incomeIn(state.incomes, mes);
  const fig = $('#ritmo-fig');
  fig.hidden = !ate || !base;
  if (fig.hidden) return;
  const modo = grafico.ritmo;
  marcarSeg('ritmo', modo);
  const acum = []; dias.reduce((t, v, i) => (acum[i] = t + v), 0);
  const W = 320, H = 140, P = { l: 6, r: 6, t: 14, b: 20 };
  const passo = (W - P.l - P.r) / total;
  const xc = d => P.l + passo * (d - 0.5); // centro da coluna do dia
  const porDiaIdeal = base / total;
  const sel = grafico.diaSel && grafico.diaSel <= total ? grafico.diaSel : ate;
  const ideal = Math.round((base * ate) / total);
  const gasto = acum[ate - 1] || 0;
  const acima = gasto > ideal;
  let corpo;
  if (modo === 'dia') {
    const max = Math.max(porDiaIdeal * 1.2, ...dias.slice(0, ate), 1);
    const y = v => P.t + (1 - v / max) * (H - P.t - P.b);
    const bw = Math.max(2, passo * 0.62);
    corpo = `<line x1="${P.l}" x2="${W - P.r}" y1="${y(0)}" y2="${y(0)}" class="eixo"/>`
      + dias.slice(0, ate).map((v, i) => v ? `<rect x="${(xc(i + 1) - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y(0) - y(v)).toFixed(1)}" rx="2" class="b-dia${v > porDiaIdeal ? ' acima' : ''}${i + 1 === sel ? ' sel' : ''}"/>` : '').join('')
      + `<line x1="${P.l}" x2="${W - P.r}" y1="${y(porDiaIdeal).toFixed(1)}" y2="${y(porDiaIdeal).toFixed(1)}" class="l-media"/>`;
  } else {
    const max = Math.max(base, gasto, 1);
    const y = v => P.t + (1 - v / max) * (H - P.t - P.b);
    const pts = acum.slice(0, ate).map((v, i) => `${xc(i + 1).toFixed(1)},${y(v).toFixed(1)}`);
    const real = `M${pts.join(' L')}`;
    const area = `${real} L${xc(ate).toFixed(1)},${y(0).toFixed(1)} L${xc(1).toFixed(1)},${y(0).toFixed(1)} Z`;
    corpo = `<defs><linearGradient id="grad-ritmo" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="var(--cyan)"/><stop offset=".6" stop-color="var(--accent)"/><stop offset="1" stop-color="${acima ? 'var(--caos)' : 'var(--accent)'}"/></linearGradient></defs>`
      + `<line x1="${P.l}" x2="${W - P.r}" y1="${y(0)}" y2="${y(0)}" class="eixo"/>`
      + `<path d="M${xc(1)},${y(0)} L${xc(total)},${y(base)}" class="l-ideal"/>`
      + `<path d="${area}" class="a-real"/><path d="${real}" class="l-real" style="stroke:url(#grad-ritmo)"/>`
      + (sel <= ate ? `<line x1="${xc(sel).toFixed(1)}" x2="${xc(sel).toFixed(1)}" y1="${P.t}" y2="${y(0)}" class="guia"/><circle cx="${xc(sel).toFixed(1)}" cy="${y(acum[sel - 1]).toFixed(1)}" r="4.5" class="p-real"/>` : '');
  }
  const alvos = dias.map((_, i) => `<rect x="${(P.l + passo * i).toFixed(1)}" y="0" width="${passo.toFixed(2)}" height="${H}" class="alvo" data-dia="${i + 1}"/>`).join('');
  $('#ritmo-titulo').textContent = `Ritmo de gastos no mês: dia ${ate}, ${formatBRL(gasto)} de ${formatBRL(ideal)} ideais`;
  $('#grafico-ritmo').innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="g-linha g-ritmo ${acima ? 'acima' : ''}" role="img"
      aria-label="${esc(`Até o dia ${ate}, você gastou ${formatBRL(gasto)}. No ritmo ideal (${orc ? 'orçamento' : 'entradas'} de ${formatBRL(base)} no mês), seriam ${formatBRL(ideal)}.`)}">
      ${corpo}${alvos}
      <text x="${P.l}" y="${H - 4}">dia 1</text><text x="${W - P.r}" y="${H - 4}" text-anchor="end">dia ${total}</text>
    </svg>`;
  const idealAte = Math.round(porDiaIdeal * sel);
  $('#ritmo-info').innerHTML = sel > ate
    ? `<strong>Dia ${sel}</strong>: ainda não chegou. O ideal até lá é ${formatBRL(idealAte)}.`
    : `<strong>Dia ${sel}</strong>: ${formatBRL(dias[sel - 1])} no dia · acumulado ${formatBRL(acum[sel - 1])} · ideal ${formatBRL(idealAte)}`;
  $('#ritmo-legenda').innerHTML = modo === 'dia'
    ? '<span class="ponto gasto"></span>Gasto do dia <span class="traco ideal"></span>Média ideal por dia'
    : '<span class="traco real"></span>Gasto acumulado <span class="traco ideal"></span>Ritmo ideal';
}

export function renderRosca(rows) {
  const el = $('#cat-rosca');
  const com = rows.filter(r => r.spentCents > 0);
  const total = com.reduce((t, r) => t + r.spentCents, 0);
  if (!total) { el.innerHTML = '<p class="muted">Sem gastos ainda.</p>'; return; }
  // neon vazado (JF, 13/11): faixa translúcida + borda acesa por dentro e por fora + brilho, igual aos botões
  const ANEIS = [{ r: 52, cls: 'fatia' }, { r: 62, cls: 'borda' }, { r: 42, cls: 'borda' }];
  const GAP = com.length > 1 ? 3 : 0; // espacinho entre as fatias (em graus)
  let ac = 0;
  const fatias = com.map(r => {
    const frac = r.spentCents / total;
    const ativa = state.filtroCat === r.id ? ' ativa' : '';
    const g = ANEIS.map(({ r: raio, cls }) => {
      const C = 2 * Math.PI * raio, gap = (GAP / 360) * C, len = Math.max(0.5, frac * C - gap);
      return `<circle cx="70" cy="70" r="${raio}" class="${cls}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-(ac * C + gap / 2)).toFixed(2)}"/>`;
    }).join('');
    ac += frac;
    return `<g class="neon-fatia${ativa}" style="--cor:${corCategoria(r.id)}" data-filtra-cat="${esc(r.id)}"><title>${esc(r.name)}: ${formatBRL(r.spentCents)}</title>${g}</g>`;
  }).join('');
  const foco = com.find(r => r.id === state.filtroCat) || com[0];
  el.innerHTML = `
    <svg viewBox="0 0 140 140" class="rosca" role="img" aria-label="${esc(com.map(r => `${r.name} ${Math.round((r.spentCents / total) * 100)}%`).join(', '))}">
      <g transform="rotate(-90 70 70)">${fatias}</g>
      <text x="70" y="64" class="r-nome">${esc(foco.name)}</text>
      <text x="70" y="82" class="r-valor">${Math.round((foco.spentCents / total) * 100)}%</text>
    </svg>
    <ul class="rosca-leg">${com.map(r => `<li data-filtra-cat="${esc(r.id)}" role="button" tabindex="0" class="${state.filtroCat === r.id ? 'ativa' : ''}"><span class="ponto neon" style="--cor:${corCategoria(r.id)}"></span>${esc(r.name)} <span class="num">${Math.round((r.spentCents / total) * 100)}%</span></li>`).join('')}</ul>`;
}

export function nomeMesCurto(month) {
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(month.slice(5, 7)) - 1];
}

export function lancamentosDoMes(mes = state.viewMonth) {
  return [
    ...state.expenses.filter(e => e.month === mes).map(e => ({ ...e, kind: 'gasto' })),
    ...state.incomes.filter(i => i.month === mes).map(i => ({ ...i, kind: 'entrada' })),
    ...(state.transferencias || []).filter(t => String(t.date).slice(0, 7) === mes).map(t => ({ ...t, kind: 'transf' })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export function exportarCSV(linhas = state.extratoVisivel || [], nomeArquivo = `caos-financas-${state.viewMonth}.csv`) {
  if (!linhas.length) return toast('Nada pra exportar com esse filtro.');
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const reais = c => (c / 100).toFixed(2).replace('.', ',');
  const corpo = linhas.map(x => {
    const conta = x.accountId && state.accounts.find(a => a.id === x.accountId);
    const tipo = x.kind === 'gasto' ? 'Gasto' : x.kind === 'entrada' ? 'Entrada' : 'Transferência';
    const cat = x.kind === 'gasto' ? catById(x.categoryId)?.name : x.kind === 'entrada' ? srcById(x.sourceId)?.name : '';
    const contaTxt = x.kind === 'transf'
      ? `${accountLabel(state.accounts.find(a => a.id === x.deId) || { bank: '?' })} → ${accountLabel(state.accounts.find(a => a.id === x.paraId) || { bank: '?' })}`
      : conta ? accountLabel(conta) : '';
    const valor = x.kind === 'gasto' ? -x.amountCents : x.amountCents;
    const parte = x.kind === 'gasto' ? -valorProprio(x) : valor;
    return [x.date, tipo, x.note || '', cat || '', contaTxt, x.forma || '', x.parcelas > 1 ? x.parcelas : '', reais(valor), reais(parte)].map(q).join(';');
  });
  const csv = '\ufeff' + ['Data;Tipo;Descrição;Categoria;Conta;Forma;Parcelas;Valor (R$);Sua parte (R$)', ...corpo].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Exportei ${linhas.length} ${linhas.length === 1 ? 'lançamento' : 'lançamentos'}.`);
}

export function exportarPDF() {
  const mes = state.viewMonth;
  const linhas = lancamentosDoMes(mes);
  if (!linhas.length) return toast('Nada lançado neste mês ainda.');
  const s = summarizeMonth(state.expenses, state.categories, mes);
  const entradas = incomeIn(state.incomes, mes);
  const cats = s.rows.filter(r => r.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents);
  const nomeLinha = x => x.kind === 'gasto' ? (x.note || catById(x.categoryId)?.name || 'Gasto')
    : x.kind === 'entrada' ? (x.note || srcById(x.sourceId)?.name || 'Entrada') : (x.note || 'Transferência');
  const valor = x => x.kind === 'gasto' ? `−${formatBRL(valorProprio(x))}` : x.kind === 'entrada' ? `+${formatBRL(x.amountCents)}` : formatBRL(x.amountCents);
  const el = document.createElement('div');
  el.id = 'relatorio-print';
  el.innerHTML = `
    <h1>C.A.O.S. Finanças · ${esc(cap(monthLabel(mes)))}</h1>
    <p class="r-sub">Resumo gerado em ${new Date().toLocaleDateString('pt-BR')}${state.perfil?.apelido ? ` para ${esc(state.perfil.apelido)}` : ''}.</p>
    <table class="r-tot"><tr><th>Entradas</th><th>Gastos</th><th>Saldo do mês</th></tr>
      <tr><td>${formatBRL(entradas)}</td><td>${formatBRL(s.totalCents)}</td><td>${formatBRL(entradas - s.totalCents)}</td></tr></table>
    <h2>Gastos por categoria</h2>
    <table><tr><th>Categoria</th><th>Gasto</th><th>Limite</th></tr>
      ${cats.map(r => `<tr><td>${esc(r.name)}</td><td>${formatBRL(r.spentCents)}</td><td>${r.budgetCents ? formatBRL(r.budgetCents) : '—'}</td></tr>`).join('')}</table>
    <h2>Lançamentos (${linhas.length})</h2>
    <table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr>
      ${linhas.map(x => `<tr><td>${x.date.slice(8)}/${x.date.slice(5, 7)}</td><td>${esc(nomeLinha(x))}</td><td>${x.kind === 'gasto' ? 'Gasto' : x.kind === 'entrada' ? 'Entrada' : 'Transf.'}</td><td>${valor(x)}</td></tr>`).join('')}</table>
    <p class="r-sub">Gasto em conta rachada aparece só com a sua parte.</p>`;
  document.body.append(el);
  document.body.classList.add('imprimindo');
  const limpar = () => { document.body.classList.remove('imprimindo'); el.remove(); };
  window.addEventListener('afterprint', limpar, { once: true });
  window.print();
  setTimeout(() => { if (document.body.contains(el) && !matchMedia('print').matches) limpar(); }, 60000);
}

export function filtroDeBusca(busca) {
  const n = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = n(busca);
  const valor = /^r?\$?\s*\d+([.,]\d{1,2})?$/.test(q) ? parseAmount(q.replace(/^r?\$?\s*/, '')) : null;
  const inteiro = valor != null && !/[.,]/.test(q);
  return x => {
    if (valor != null) return inteiro ? Math.floor(x.amountCents / 100) === valor / 100 : x.amountCents === valor;
    const conta = x.accountId && state.accounts.find(a => a.id === x.accountId);
    const nome = x.categoryId ? catById(x.categoryId)?.name : srcById(x.sourceId)?.name;
    return [x.note, nome, conta ? accountLabel(conta) : ''].some(t => n(t).includes(q));
  };
}
