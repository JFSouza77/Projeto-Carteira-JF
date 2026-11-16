// Tela de Ajustes (16/11, corte do app.js): orçamentos, ajustes, lembretes, backup, glossário, calculadora e
// Novidades. Mudou só de arquivo.

import { $, catById, centsToInput, esc, state, renderizar } from '../estado.js';
import { ATUALIZADO_EM, GLOSSARIO, GLOS_TEMAS, temaDoTermo } from '../caos/glossario.js';
import { CAOS_VERSAO, IDENTIDADE, MOODS } from '../caos/index.js';
import { NOVIDADES, VERSAO_APP, partesDoItem, temNovidade } from '../novidades.js';
import { NUCLEO } from '../caos/nucleo.js';
import { calcularJuros } from '../caos/conversa.js';
import * as db from '../db.js';
import { ditadoDisponivel, vozDisponivel } from '../voz.js';
import { formatBRL, parseAmount, toISODate, validarBackup, zerarSaldos } from '../engine.js';
import * as lembretes from '../notificacoes.js';
import { prepararFormCompromisso, renderMetas } from './mes.js';
import { renderInvestimentos } from './contas.js';
import { renderLancar } from './lancar.js';
import { MENOS_MOVIMENTO, icCat, renderPerfil, toast } from '../app.js';

export function alternarEstudio(ligar = $('#estudio').hidden) {
  $('#estudio').hidden = !ligar;
  $('#tela-conversa').classList.toggle('modo-estudio', ligar);
  $('#estudio-btn').setAttribute('aria-pressed', String(ligar));
  // dica do Code (13/11): deixar claro como voltar pra conversa
  $('#estudio-btn').innerHTML = ligar ? '← Conversa' : '<svg class="ico" aria-hidden="true"><use href="#i-livro"/></svg> Glossário';
  if (ligar) { renderEstudio(); window.scrollTo(0, 0); }
}

export let estudioMontado = false;

export function renderEstudio() {
  renderGlossario();
}

// 15/11 (Anne): leis e linha do tempo moram nos Ajustes ("Mais sobre o C.A.O.S."); a calculadora, em Contas
export function montarInfoCaos() {
  if (!estudioMontado) {
    estudioMontado = true;
    // núcleo 1.3.0: cada lei tem o sentido geral e a frase de cada casa (aqui, a da Carteira)
    $('#leis').innerHTML = NUCLEO.leis.map(l => `<li><strong>${esc(String(l.lei || l).replace(/^\d+ª:\s*/, ''))}</strong>${l.carteira ? `<small>${esc(l.carteira)}</small>` : ''}</li>`).join('');
    const dataBR = iso => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
    $('#linha-tempo').innerHTML = NUCLEO.vida.map(v => `<li><small>${dataBR(v.data)}</small>${esc(v.fato)}</li>`).join('');
  }
  renderCalculadora();
}

export const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export let glosTema = '';

export const GLOS_TEMA_DE = new Map(GLOSSARIO.map(g => [g, temaDoTermo(g)]));

export function renderGlossario() {
  const q = semAcento($('#glos-busca').value.trim());
  const chips = $('#glos-temas');
  if (chips && !chips.childElementCount) {
    // 14/11 (JF: "mais lúdico, com coresinhas"): um chip colorido por tema, que filtra a lista
    chips.innerHTML = [{ id: '', nome: 'Todos', cor: 'outros' }, ...GLOS_TEMAS].map(t =>
      `<button type="button" class="glos-chip" data-tema="${t.id}" style="--tema:var(--cat-${t.cor})" aria-pressed="${t.id === glosTema}">${esc(t.nome)}</button>`).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('.glos-chip');
      if (!b) return;
      glosTema = b.dataset.tema;
      chips.querySelectorAll('.glos-chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      renderGlossario();
    });
  }
  const achados = GLOSSARIO.filter(g => (!glosTema || GLOS_TEMA_DE.get(g) === glosTema)
    && (!q || semAcento(g.termo).includes(q) || g.chaves.some(k => semAcento(k).includes(q)) || semAcento(g.adulto).includes(q)));
  $('#glos-total').textContent = q || glosTema ? `${achados.length} de ${GLOSSARIO.length} termos.` : `${GLOSSARIO.length} termos.`;
  const corDe = id => GLOS_TEMAS.find(t => t.id === id)?.cor || 'outros';
  $('#glos-lista').innerHTML = achados.length ? achados.map(g => {
    const tema = GLOS_TEMA_DE.get(g);
    return `
    <details style="--tema:var(--cat-${corDe(tema)})"><summary><span class="glos-bola" aria-hidden="true">${esc(g.termo[0])}</span>${esc(g.termo)}</summary>
      <div class="glos-corpo">
        <p>${esc(g.adulto)}</p>
        ${g.crianca ? `<p class="glos-crianca"><b>Bem simples:</b> ${esc(g.crianca)}</p>` : ''}
        <p class="mais">${esc(g.mais)}</p>
        ${g.governo ? `<p class="mais">Regra de ${esc(ATUALIZADO_EM)}: confira no canal oficial, porque muda com o tempo.</p>` : ''}
      </div>
    </details>`;
  }).join('') : '<p class="muted">Não achei esse termo. Tente outra palavra ou pergunte pro C.A.O.S. na conversa.</p>';
}

export function renderCalculadora() {
  const valor = parseAmount($('#calc-valor').value) || 0;
  const pct = Math.max(0, Math.min(100, Number(String($('#calc-taxa').value).replace(',', '.')) || 0)) / 100;
  const meses = Number($('#calc-meses').value);
  const anual = $('#calc-periodo').value === 'ano';
  $('#calc-meses-txt').textContent = meses % 12 === 0 && meses >= 12 ? `${meses} meses (${meses / 12} ${meses === 12 ? 'ano' : 'anos'})` : `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  if (!valor) { $('#calc-res').innerHTML = '<p class="muted">Digite um valor.</p>'; return; }
  // mesma regra da conversa: ao ano vira mensal equivalente no composto e ÷12 no simples
  const s = calcularJuros({ tipo: 'simples', valor, taxa: anual ? pct / 12 : pct, meses });
  const c = calcularJuros({ tipo: 'compostos', valor, taxa: anual ? Math.pow(1 + pct, 1 / 12) - 1 : pct, meses });
  const dif = c.finalCents - s.finalCents;
  $('#calc-res').innerHTML = `
    <div><small>Juros simples</small><b>${formatBRL(s.finalCents)}</b><small>+ ${formatBRL(s.jurosCents)} de juros</small></div>
    <div><small>Juros compostos</small><b>${formatBRL(c.finalCents)}</b><small>+ ${formatBRL(c.jurosCents)} de juros</small></div>
    <p class="dif">${dif > 0 ? `A bola de neve dos compostos dá ${formatBRL(dif)} a mais. Ótimo quando você investe, perigoso quando você deve.` : 'Com esses números, as duas contas dão igual.'}</p>`;
}

export function renderBudgets() {
  $('#budget-list').innerHTML = state.categories.map(c => `
    <li>
      <label for="b-${esc(c.id)}">${icCat(c)} ${esc(c.name)}</label>
      <span class="amount small"><span>R$</span>
        <input id="b-${esc(c.id)}" data-budget="${esc(c.id)}" type="text" inputmode="decimal" placeholder="sem limite" value="${centsToInput(c.budgetCents)}">
      </span>
    </li>`).join('');
}

export async function renderSettings() {
  prepararFormCompromisso();
  $('#mood-options').innerHTML = Object.entries(MOODS).map(([id, label]) => `
    <label><input type="radio" name="mood" value="${id}" ${state.settings.mood === id ? 'checked' : ''}><span>${label}</span></label>`).join('');
  $('#voice-toggle').checked = state.settings.voice;
  for (const r of document.querySelectorAll('input[name="letra"]')) r.checked = r.value === (state.settings.letra || 'normal');
  for (const r of document.querySelectorAll('input[name="tema"]')) r.checked = r.value === (state.settings.tema || 'auto');
  for (const r of document.querySelectorAll('input[name="estilo"]')) r.checked = r.value === (state.settings.estilo || 'atual');
  $('#estilo-desc').textContent = ESTILO_DESC[state.settings.estilo || 'atual'];
  $('#voz-vel').value = state.settings.vozVel ?? 1;
  $('#voz-vel-out').textContent = `${Number(state.settings.vozVel ?? 1).toFixed(1).replace('.', ',')}×`;
  $('#menos-mov').checked = MENOS_MOVIMENTO.matches;
  $('#voice-toggle').closest('label').hidden = !vozDisponivel();
  $('#caos-version').textContent = `${IDENTIDADE.nome} ${CAOS_VERSAO} (núcleo ${IDENTIDADE.nucleo}) · ${IDENTIDADE.sigla}. ${IDENTIDADE.slogan} Criado por ${IDENTIDADE.criador}, veio do ${IDENTIDADE.origem}.`;
  $('#ai-toggle').checked = state.settings.aiOn;
  $('#ai-url').value = state.settings.aiUrl;
  $('#chat-mic').hidden = !ditadoDisponivel();
  const lem = await lembretes.config().catch(() => ({}));
  $('#remind-toggle').checked = !!lem.ativo;
  $('#remind-time').value = lem.hora || '20:30';
  $('#remind-status').textContent = lem.ativo ? lembretes.descreverModo(lem.modo) : 'Desligado.';
}

export async function onBudgetChange(input) {
  const cat = catById(input.dataset.budget);
  if (!cat) return;
  const raw = input.value.trim();
  const cents = raw === '' ? 0 : parseAmount(raw);
  if (cents === null) { toast('Valor de orçamento inválido.'); input.value = ''; return; }
  const updated = { ...cat, budgetCents: cents };
  await db.put(db.STORES.categories, updated);
  state.categories = state.categories.map(c => (c.id === cat.id ? updated : c));
  input.value = centsToInput(cents);
  renderizar();
  toast(cents ? `Orçamento de ${cat.name}: ${formatBRL(cents)}` : `${cat.name} sem limite.`);
}

// abrir vê meu saldo") ----------
// Cada seção grande vira um bloco que abre e fecha (<details data-bloco>); o app lembra do jeito que a pessoa deixou.
// Saldo das contas começa escondido (R$ ••••); o olhinho mostra.
// Estilo do app (Anne, 14/11): Atual (a cara C.A.O.S.), Limpo (sem brilho neon, menos cor) e Direto (só o essencial)
export const ESTILO_DESC = {
  atual: 'A cara do C.A.O.S.: neon, cores por categoria e tudo à mão.',
  limpo: 'Sem brilho neon e com menos cor. Tudo continua lá, mais calmo.',
  direto: 'Só o que você precisa: resumo, lançar e a lista. Gráficos e extras somem do Início e do Mês.',
};

export async function onRemindToggle(e) {
  const box = e.target;
  try {
    const c = box.checked
      ? await lembretes.ativar({ hora: $('#remind-time').value || '20:30', servidor: state.settings.aiOn ? state.settings.aiUrl : '' })
      : await lembretes.desativar({ servidor: state.settings.aiUrl });
    $('#remind-status').textContent = c.ativo ? lembretes.descreverModo(c.modo) : 'Desligado.';
  } catch (err) {
    box.checked = false;
    $('#remind-status').textContent = err.message;
  }
}

export async function onRemindTime() {
  const c = await lembretes.config();
  if (!c.ativo) return db.setMeta('lembrete', { ...c, hora: $('#remind-time').value });
  // inscreve de novo com o horário novo
  try {
    const n = await lembretes.ativar({ hora: $('#remind-time').value, servidor: state.settings.aiOn ? state.settings.aiUrl : '' });
    $('#remind-status').textContent = lembretes.descreverModo(n.modo);
    toast(`Lembrete às ${n.hora}.`);
  } catch (err) {
    $('#remind-status').textContent = err.message;
  }
}

export function exportBackup() {
  const data = {
    app: 'carteira-jf', version: 3, exportedAt: new Date().toISOString(),
    categories: state.categories, expenses: state.expenses, incomes: state.incomes, accounts: state.accounts,
    compromissos: state.compromissos, planos: state.planos, perfil: state.perfil, metas: state.metas, investimentos: state.investimentos, transferencias: state.transferencias,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carteira-backup-${toISODate()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importBackup(file) {
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('Arquivo grande demais para ser um backup.');
    let bruto;
    try { bruto = JSON.parse(await file.text()); } catch { throw new Error('Esse arquivo não parece um backup do C.A.O.S. Finanças.'); }
    // Valida TUDO antes de perguntar e antes de gravar: se algo estiver errado, nada muda.
    const v = validarBackup(bruto);
    if (!v.ok) throw new Error(`Não importei: ${v.erros[0]}`);
    const d = v.dados;
    if (!confirm(`Substituir os dados atuais por ${d.expenses.length} gastos, ${d.incomes.length} entradas, ${d.accounts.length} contas e ${d.compromissos.length} compromissos do backup?`)) return;
    // tudo numa gravação só (achado do GPT, 13/11): ou entra o backup inteiro, ou nada muda; a tela só troca depois
    await db.replaceAll({ expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos },
      { perfil: d.perfil, metas: d.metas, investimentos: d.investimentos, transferencias: d.transferencias || [] });
    Object.assign(state, { expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos,
      metas: d.metas, investimentos: d.investimentos, transferencias: d.transferencias || [] });
    // backup sem perfil (decisão do Wally, 13/11): mantém quem você é neste aparelho (nome, aniversário, selo)
    if (d.perfil) { state.perfil = d.perfil; renderPerfil(); }
    renderMetas(); renderInvestimentos();
    renderLancar();
    renderBudgets();
    renderizar();
    toast('Backup restaurado.');
  } catch (e) {
    toast(e.message || 'Não deu para importar.');
  }
}

export function itemNovidade(item) {
  const p = partesDoItem(item);
  if (!p.titulo) return `<li class="nov-solto">${esc(p.texto)}</li>`;
  const texto = p.texto.charAt(0).toUpperCase() + p.texto.slice(1);
  return `<li><details class="nov-drop"><summary class="nov-tag">${esc(p.icone)} ${esc(p.titulo)}</summary>`
    + `<div class="nov-drop-txt">${esc(texto)}</div></details></li>`;
}

export function versaoNovidade(n, i) {
  return `<details class="nov-item"${i === 0 ? ' open' : ''}><summary>`
    + `<span class="nov-v">Versão ${esc(n.v)}${n.ate ? ` · até a ${esc(n.ate)}` : ''}</span>`
    + (n.nome ? `<span class="nov-nome">${esc(n.nome)}</span>` : '')
    + (n.data ? `<span class="nov-data">${esc(n.data)}</span>` : '')
    + `<span class="nov-t">${esc(n.t)}</span></summary>`
    + (n.itens.length ? `<ul>${n.itens.map(itemNovidade).join('')}</ul>` : '')
    + (n.qol.length ? `<div class="nov-qol">Ajustes e correções</div><ul>${n.qol.map(itemNovidade).join('')}</ul>` : '')
    + `</details>`;
}

export const NOV_A_MOSTRA = 3;

export function renderNovidades() {
  const antigas = NOVIDADES.length - NOV_A_MOSTRA;
  $('#novidades-lista').innerHTML =
    `<div class="nov-ic" aria-hidden="true">🆕</div><p class="nov-sub">O que mudou nas últimas versões. Toque num item pra ver a explicação.</p>`
    + NOVIDADES.slice(0, NOV_A_MOSTRA).map(versaoNovidade).join('')
    + (antigas > 0
      ? `<button type="button" class="ghost nov-antigas" id="novidades-antigas" aria-expanded="false">Ver versões antigas (${antigas})</button>`
        + `<div id="novidades-antigas-lista" class="nov-antigas-lista" hidden>${NOVIDADES.slice(NOV_A_MOSTRA).map((n, i) => versaoNovidade(n, i + NOV_A_MOSTRA)).join('')}</div>`
      : '');
}

export function alternarAntigas(b) {
  const l = $('#novidades-antigas-lista'), abrir = l.hidden;
  l.hidden = !abrir;
  b.setAttribute('aria-expanded', String(abrir));
  b.textContent = abrir ? 'Esconder versões antigas' : `Ver versões antigas (${NOVIDADES.length - NOV_A_MOSTRA})`;
}

export async function abrirNovidades() {
  renderNovidades();
  const dlg = $('#novidades-dialog');
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  state.novidadesVistas = VERSAO_APP;
  $('#novidade-aviso').hidden = true;
  await db.setMeta('novidadesVistas', VERSAO_APP).catch(() => {});
}

export function renderAvisoNovidade() {
  $('#novidade-aviso').hidden = !temNovidade(state.novidadesVistas);
  $('#novidades-versao').textContent = `Versão ${VERSAO_APP} · o que mudou no app`;
}

// ---------- Recomeçar (JF, 16/11: "zerar os valores dos bancos sem apagar os bancos; vou começar de verdade em dezembro") ----------
// Duas opções. As duas mantêm bancos, cartões, pisos, contas fixas, planos, metas, categorias e ajustes.
// Quem grava é a UI (via db.js); cada mudança é marcada pra sincronizar com a conta, se tiver.
export async function zerarSaldosDosBancos({ perguntar = true } = {}) {
  if (!state.accounts.length) { toast('Ainda não tem banco cadastrado.'); return false; }
  if (perguntar && !confirm('Zerar os saldos de todos os bancos e o "já usado" dos cartões? Os bancos continuam; os lançamentos ficam no histórico. Depois é só atualizar o saldo de cada um.')) return false;
  const novos = zerarSaldos(state.accounts);
  await db.putMany(db.STORES.accounts, novos);
  state.accounts = novos;
  return true;
}

export async function comecarDoZero() {
  if (!confirm('Começar do zero? Os saldos zeram e TODOS os gastos, entradas (inclusive as previstas) e transferências são apagados. Bancos, cartões, contas fixas, planos e metas continuam.')) return false;
  if (!confirm('Tem certeza? Isso não dá pra desfazer (a não ser com um backup).')) return false;
  const [gastos, entradas] = await Promise.all([db.getAll(db.STORES.expenses), db.getAll(db.STORES.incomes)]);
  for (const g of gastos) await db.remove(db.STORES.expenses, g.id);
  for (const e of entradas) await db.remove(db.STORES.incomes, e.id);
  await db.setMeta('transferencias', []);
  if (state.perfil) { state.perfil = { ...state.perfil, diasSemGasto: [], mesesSemEntrada: [] }; await db.setMeta('perfil', state.perfil); }
  Object.assign(state, { expenses: [], incomes: [], previstas: [], transferencias: [] });
  await zerarSaldosDosBancos({ perguntar: false });
  return true;
}
