// Tela de Lançar (16/11, corte do app.js): formulário de gasto e entrada, parcelas, racha, foto, editar e apagar.
// Mudou só de arquivo. Quem grava continua sendo a UI (via db.js).

import { $, catById, centsToInput, esc, state, renderizar } from '../estado.js';
import { transferenciasNaDataDoGasto, FORMAS_PAGAMENTO, INCOME_SOURCES, accountBalance, accountLabel, comReforco, createExpense, createIncome, createTransferencia, guardarACadaCompra, depoisDoSaldo, detectExpenseEvents, dividirIgual, editarLancamento, faturaDoCartao, formatBRL, juntarNomes, parseAmount, toISODate, valorForaDoComum, valorProprio } from '../engine.js';
import * as conta from '../conta.js';
import { corCategoria, corFonte, corForma } from '../cores.js';
import * as db from '../db.js';
import * as ia from '../ia.js';
import * as imagens from '../imagens.js';
import { opcoesDeConta, renderContas } from './contas.js';
import { rostoEspantado } from '../caos/index.js';
import { ICONE_FORMA, avatares, ic, icCat, icFonte, narrate, setRosto, toast } from '../app.js';
import { eventoOfensiva, ofensivaAgora } from './inicio.js';

// Valor fora do comum (13/11): o C.A.O.S. leva um susto (rosto espantado) e pergunta antes de gravar.
// Era um confirm() do navegador; o JF pediu o C.A.O.S. reagindo ("R$ 17 mil na Cacau Show?!").
export function confirmarEspanto(valorCents, ehGasto) {
  const dlg = $('#espanto-dialog');
  const nota = $('#note').value.trim();
  $('#espanto-titulo').textContent = `${formatBRL(valorCents)}?!`;
  $('#espanto-texto').textContent = `${ehGasto ? 'De gasto' : 'De entrada'}${nota ? ` em "${nota}"` : ''}? É bem mais que o seu normal. Confere se não faltou a vírgula dos centavos.`;
  setRosto($('#espanto-face'), rostoEspantado());
  avatares.espanto?.mostrar('surpreso', { imediato: true });
  return new Promise(resolve => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.returnValue = '';
    dlg.showModal();
  });
}

export function perguntarContaDoPix(nome, valorCents) {
  const contas = state.accounts.filter(a => a.tipo !== 'cartao');
  const dlg = $('#pix-dialog');
  $('#pix-texto').textContent = `${nome} te pagou ${formatBRL(valorCents)}. Em qual conta o dinheiro caiu?`;
  $('#pix-conta').innerHTML = opcoesDeConta(a => a.tipo !== 'cartao').replace('Sem conta', 'Não sei / dinheiro vivo');
  if (contas.length) $('#pix-conta').value = contas[0].id;
  return new Promise(resolve => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('#pix-conta').value : null), { once: true });
    dlg.returnValue = '';
    dlg.showModal();
  });
}

export function nomesDoRacha() {
  return $('#racha-nomes').value.split(/[,;\n]| e /).map(n => n.trim()).filter(Boolean);
}

export function previaRacha() {
  const nomes = nomesDoRacha();
  const total = parseAmount($('#amount').value);
  if (!nomes.length || !total) { $('#racha-previa').textContent = 'Digite o valor total que você pagou e os nomes. A conta é dividida por igual.'; return; }
  try {
    const partes = dividirIgual(total, nomes);
    const minha = total - partes.reduce((t, p) => t + p.valorCents, 0);
    $('#racha-previa').textContent = `${partes.length + 1} pessoas: cada amigo te paga ${formatBRL(partes[0].valorCents)}. No seu orçamento entra só a sua parte, ${formatBRL(minha)}.`;
  } catch (er) {
    $('#racha-previa').textContent = er.message;
  }
}

export function renderLancar() {
  const gasto = state.kind === 'gasto';
  const semConta = !state.accounts.some(a => a.tipo !== 'cartao');
  $('#lancar-trava').hidden = !semConta;
  $('#entry-form').closest('.card').hidden = semConta;
  $('#mes-sem-entrada').hidden = gasto;
  $('#dia-sem-gasto').hidden = !gasto;
  const opcoes = gasto ? state.categories : INCOME_SOURCES;
  const sel = gasto ? state.selectedCategory : state.selectedSource;
  $('#category-chips').setAttribute('aria-label', gasto ? 'Categoria' : 'De onde veio');
  $('#racha-box').hidden = !gasto;
  $('#prevista-field').hidden = gasto;
  $('#category-chips').innerHTML = opcoes.map(c => `
    <button type="button" class="chip colorido" style="--cor-chip:${gasto ? corCategoria(c.id) : corFonte(c.id)}" role="radio" aria-checked="${c.id === sel}" data-cat="${esc(c.id)}">${gasto ? icCat(c) : icFonte(c)} ${esc(c.name)}</button>`).join('');
  $('#cat-label').textContent = gasto ? 'Categoria' : 'De onde veio';
  // 2.3.5.8 (JF: "deixar o De onde veio mais bonitinho, coloridinho, sem carnaval"): na entrada são só 10 opções,
  // então viram botões com ícone e cor (cada cor é um grupo); no gasto continua a lista, que é maior
  $('#category-chips').hidden = gasto;
  $('#category-select').hidden = !gasto;
  const tiposAux = ['Transporte', 'Alimentação', 'Refeição', 'Moradia', 'Saúde', 'Creche', 'Gás', 'Bolsa Família', 'BPC', 'Outro'];
  $('#auxilio-tipos').hidden = gasto || sel !== 'beneficio';
  $('#auxilio-tipos').innerHTML = '<span class="muted small">Qual auxílio?</span>' + tiposAux.map(x => `<button type="button" class="chip" data-aux="${esc(x)}">${esc(x)}</button>`).join('');
  $('#category-select').innerHTML = `<option value="">${gasto ? 'Escolha a categoria' : 'Escolha de onde veio'}</option>`
    + opcoes.map(c => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  $('#entry-form').dataset.kind = gasto ? 'gasto' : 'entrada';
  $('#submit-btn').textContent = gasto ? 'Adicionar gasto' : 'Adicionar entrada';
  // Pagou como? (P8): a forma escolhe que contas aparecem e o que mais perguntar
  const forma = gasto ? state.forma : null;
  $('#forma-field').hidden = !gasto;
  $('#forma-chips').innerHTML = Object.entries(FORMAS_PAGAMENTO).map(([id, nome]) =>
    `<button type="button" class="chip colorido" style="--cor-chip:${corForma(id)}" role="radio" aria-checked="${id === forma}" data-forma="${id}">${ic(ICONE_FORMA[id])} ${esc(nome.replace(/^\S+\s/, ''))}</button>`).join('');
  $('#forma-select').innerHTML = '<option value="">Escolha (opcional)</option>' + Object.entries(FORMAS_PAGAMENTO).map(([id, nome]) =>
    `<option value="${id}"${id === forma ? ' selected' : ''}>${esc(nome.replace(/^\S+\s/, ''))}</option>`).join('');
  const filtro = !gasto ? a => a.tipo !== 'cartao' // entrada não cai no cartão de crédito
    : forma === 'credito' ? a => a.tipo === 'cartao'
    : forma ? a => a.tipo !== 'cartao' : () => true;
  const cabem = state.accounts.filter(filtro);
  $('#account-field').hidden = cabem.length === 0;
  $('#account-label').textContent = forma === 'credito' ? 'Qual cartão?' : forma === 'pix' || forma === 'debito' ? 'De qual banco saiu?'
    : forma === 'dinheiro' ? 'Saiu de onde? (se quiser)' : 'Conta';
  const atual = $('#account-select').value;
  $('#account-select').innerHTML = opcoesDeConta(filtro);
  if (cabem.some(a => a.id === atual)) $('#account-select').value = atual;
  else if (forma === 'credito' && cabem.length === 1) $('#account-select').value = cabem[0].id;
  $('#parcelas-box').hidden = forma !== 'credito';
  if (!$('#parcelas-select').options.length) {
    $('#parcelas-select').innerHTML = '<option value="1">À vista (1x)</option>' +
      Array.from({ length: 23 }, (_, i) => `<option value="${i + 2}">Parcelado em ${i + 2}x</option>`).join('');
  }
  previaParcelas();
  $('#photo-ai').hidden = !(state.photo && state.settings.aiOn);
}

export function previaParcelas() {
  const n = Number($('#parcelas-select').value) || 1;
  $('#limite-modo-field').hidden = n < 2;
  const v = parseAmount($('#amount').value);
  if (n < 2 || !v) { $('#parcelas-previa').textContent = ''; return; }
  const parcela = Math.floor(v / n);
  const total = document.querySelector('input[name="limite-modo"]:checked')?.value !== 'parcela';
  $('#parcelas-previa').textContent = `${n}x de ${formatBRL(parcela)}. ` + (total
    ? `Agora o limite fica ${formatBRL(v)} menor e volta ${formatBRL(parcela)} a cada fatura paga.`
    : `Só ${formatBRL(parcela)} por mês ocupa o limite.`);
}

export function mostrarFoto() {
  const p = state.photo;
  $('#photo-preview').hidden = !p;
  if (p) $('#photo-img').src = p.url;
  $('#photo-ai').hidden = !(p && state.settings.aiOn);
}

export async function limparFoto({ apagar }) {
  if (state.photo) {
    URL.revokeObjectURL(state.photo.url);
    if (apagar) await imagens.apagar(state.photo.id).catch(() => {});
  }
  state.photo = null;
  $('#photo-input').value = '';
  mostrarFoto();
}

export async function registrarGasto({ amountCents, categoryId, note, date, accountId, imageId, compromissoId, rachaNomes = null, forma = null, parcelas = 1, limiteModo = 'total' }) {
  const ofAntes = ofensivaAgora();
  // escolheu um cartão sem dizer a forma: é crédito
  if (!forma && accountId && state.accounts.find(a => a.id === accountId)?.tipo === 'cartao') forma = 'credito';
  const expense = createExpense({ amountCents, categoryId, note, date, accountId, imageId, compromissoId, forma, parcelas, limiteModo }, { categories: state.categories });
  if (rachaNomes?.length) expense.racha = dividirIgual(amountCents, rachaNomes);
  const conta = accountId && state.accounts.find(a => a.id === accountId);
  const cartao = conta?.tipo === 'cartao';
  const antes = conta ? (cartao ? faturaDoCartao(comReforco(conta, state.accounts, state.expenses, state.incomes, state.transferencias), state.expenses, toISODate()).pct : accountBalance(conta, state.expenses, state.incomes, state.transferencias)) : null;
  await db.put(db.STORES.expenses, expense);
  avisarAntesDoSaldo(expense);
  state.expenses.push(expense);
  const events = detectExpenseEvents({ expenses: state.expenses, categories: state.categories, newExpense: expense });
  if (conta && cartao) {
    // passou de 80% ou de 100% do limite com esta compra: o C.A.O.S. avisa na hora
    const f = faturaDoCartao(comReforco(conta, state.accounts, state.expenses, state.incomes, state.transferencias), state.expenses, toISODate());
    if ((antes < 80 && f.pct >= 80) || (antes < 100 && f.pct >= 100)) {
      events.push({ type: 'cartao_limite', accountName: f.nome, pct: f.pct, amountCents: f.usadoCents, leftCents: f.disponivelCents, budgetCents: f.limiteCents });
    }
  } else if (conta) {
    const depois = accountBalance(conta, state.expenses, state.incomes, state.transferencias);
    if (antes >= 0 && depois < 0) events.push({ type: 'conta_negativa', accountName: accountLabel(conta), balanceCents: depois });
  }
  if (expense.racha) {
    const nomes = expense.racha.map(p => p.nome);
    events.push({ type: 'racha_cadastrada', amountCents: valorProprio(expense), totalCents: expense.amountCents - valorProprio(expense), count: nomes.length,
      quem: juntarNomes(nomes) });
  }
  events.push(...eventoOfensiva(ofAntes));
  // guardar a cada compra (JF, 16/11, como no Mercado Pago): o cofrinho recebe o valor combinado, saindo da conta
  // de origem. Fica ligado ao gasto (autoDe): apagar o gasto apaga o que foi guardado por causa dele.
  const guardas = guardarACadaCompra(expense, state.accounts, state.expenses, state.incomes, state.transferencias);
  if (guardas.length) {
    const novas = guardas.map(gd => ({ ...createTransferencia({ deId: gd.deId, paraId: gd.cofrinhoId, amountCents: gd.amountCents, date: expense.date,
      note: 'Guardado a cada compra' }, { accounts: state.accounts }), autoDe: expense.id }));
    state.transferencias = [...state.transferencias, ...novas];
    await db.setMeta('transferencias', state.transferencias);
    const nomes = guardas.map(gd => `${formatBRL(gd.amountCents)} em ${accountLabel(state.accounts.find(a => a.id === gd.cofrinhoId))}`).join(' e ');
    setTimeout(() => toast(`Guardei ${nomes}, como você combinou no banco.`), 1200);
  }
  state.viewMonth = expense.month;
  renderizar();
  return events;
}

export function avisarAntesDoSaldo(item) {
  const conta = item.accountId && state.accounts.find(a => a.id === item.accountId && a.tipo !== 'cartao');
  if (!conta || depoisDoSaldo(item, conta) || location.hash === '#conversa') return; // na conversa, o C.A.O.S. explica
  const dia = new Date(conta.balanceAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  setTimeout(() => toast(`Anotado com a data certa. O saldo de ${accountLabel(conta)} que você informou em ${dia} já inclui esse valor, então o saldo não mudou.`), 900);
}

export async function registrarEntrada({ amountCents, sourceId, note, date, accountId, prevista = false }) {
  const ofAntes = ofensivaAgora();
  const income = createIncome({ amountCents, sourceId, note, date, accountId, prevista });
  await db.put(db.STORES.incomes, income);
  if (prevista) { // 15/11 (JF): fica na lista do "a receber" até a pessoa tocar em Recebi
    state.previstas.push(income);
    renderizar();
    toast(`Anotado como previsto: ${formatBRL(amountCents)} pra ${date.slice(8, 10)}/${date.slice(5, 7)}. Quando cair, toca em "Recebi" na aba Entradas.`);
    return [];
  }
  state.incomes.push(income);
  avisarAntesDoSaldo(income);
  state.viewMonth = income.month;
  renderizar();
  return [{ type: 'entrada_cadastrada', amountCents, sourceId }, ...eventoOfensiva(ofAntes)];
}

export async function onSubmit(ev) {
  ev.preventDefault();
  const err = $('#form-error');
  err.hidden = true;
  try {
    const amountCents = parseAmount($('#amount').value);
    if (!amountCents) throw new Error('Digite um valor, tipo 25,90.');
    // valor muito acima do normal (13/11): pergunta antes, pra um 124,50 não virar 12.450,00
    const ehGasto = state.kind === 'gasto';
    if (valorForaDoComum(amountCents, ehGasto ? state.expenses : state.incomes, { tipo: ehGasto ? 'gasto' : 'entrada' })
      && !(await confirmarEspanto(amountCents, ehGasto))) { $('#amount').focus(); return; }
    const base = { amountCents, note: $('#note').value, date: $('#date').value, accountId: $('#account-select').value || null };
    let events;
    if (state.kind === 'gasto') {
      if (!state.selectedCategory) throw new Error('Escolha uma categoria.');
      const rachaNomes = $('#racha-box').open ? nomesDoRacha() : null;
      if ($('#racha-box').open && !rachaNomes.length) throw new Error('Escreva o nome de quem vai te pagar, ou feche o "Dividir com amigos".');
      const forma = state.forma;
      const parcelas = forma === 'credito' ? Number($('#parcelas-select').value) || 1 : 1;
      const limiteModo = document.querySelector('input[name="limite-modo"]:checked')?.value || 'total';
      if (forma === 'credito' && !base.accountId && state.accounts.some(a => a.tipo === 'cartao')) throw new Error('Qual cartão? Escolha ali em cima.');
      events = await registrarGasto({ ...base, categoryId: state.selectedCategory, imageId: state.photo?.id, rachaNomes, forma, parcelas, limiteModo });
      $('#parcelas-select').value = '1';
      await limparFoto({ apagar: false });
      $('#racha-nomes').value = '';
      $('#racha-box').open = false;
      previaRacha();
    } else {
      if (!state.selectedSource) throw new Error('Escolha de onde veio o dinheiro.');
      const prevista = $('#entrada-prevista').checked;
      if (prevista && base.date < toISODate()) throw new Error('Entrada prevista é pra uma data que ainda vai chegar.');
      events = await registrarEntrada({ ...base, sourceId: state.selectedSource, prevista });
      $('#entrada-prevista').checked = false;
      await limparFoto({ apagar: true });
    }
    $('#amount').value = '';
    $('#note').value = '';
    state.catSugerida = false;
    state.selectedCategory = null; // o próximo lançamento começa livre pra o C.A.O.S. sugerir pela descrição
    $('#cat-sugestao').hidden = true;
    renderLancar();
    const fala = narrate(events);
    toast(fala ? fala.texto : 'Salvo!');
  } catch (e) {
    err.textContent = e.message || 'Não deu para salvar.';
    err.hidden = false;
  }
}

export async function onFoto(arquivo) {
  try {
    await limparFoto({ apagar: true });
    const img = await imagens.guardar(arquivo, 'comprovante');
    state.photo = { id: img.id, url: URL.createObjectURL(img.blob) };
    mostrarFoto();
    if (state.settings.aiOn) toast('Foto anexada. Toque em "Ler com IA" para preencher sozinho.');
  } catch (e) {
    toast(e.message || 'Não deu para anexar a foto.');
  }
}

export async function lerFotoComIA() {
  const btn = $('#photo-ai');
  try {
    btn.disabled = true;
    btn.textContent = 'Lendo…';
    const img = await imagens.pegar(state.photo.id);
    const r = await ia.lerImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), categorias: state.categories });
    if (r.valor_centavos > 0) $('#amount').value = centsToInput(r.valor_centavos);
    if (/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) $('#date').value = r.data;
    if (r.estabelecimento && !$('#note').value) $('#note').value = r.estabelecimento.slice(0, 120);
    if (r.categoria && catById(r.categoria)) {
      state.kind = 'gasto';
      document.querySelector('input[name="kind"][value="gasto"]').checked = true;
      state.selectedCategory = r.categoria;
    }
    renderLancar();
    toast(r.confianca === 'baixa' ? 'Li, mas com pouca certeza. Confere os campos!' : 'Pronto! Confere e toca em Adicionar.');
  } catch (e) {
    toast(e.message || 'Não consegui ler a foto.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${ic('i-ia')} Ler com IA`;
  }
}

// 2.3.6.2 (pendência de 15/11): a entrada prevista também se edita, com a mesma janela (kind 'prevista')
const listaDo = kind => (kind === 'prevista' ? state.previstas : kind === 'entrada' ? state.incomes : state.expenses);

export async function editar(id, kind) {
  const entrada = kind === 'entrada' || kind === 'prevista';
  const x = listaDo(kind).find(i => i.id === id);
  if (!x) return;
  const dlg = $('#editar-dialog');
  $('#editar-titulo').textContent = kind === 'prevista' ? 'Editar entrada prevista' : entrada ? 'Editar entrada' : 'Editar gasto';
  $('#ed-valor').value = centsToInput(x.amountCents);
  const rachada = Array.isArray(x.racha) && x.racha.length > 0;
  $('#ed-valor').disabled = rachada;
  $('#ed-data').value = x.date;
  $('#ed-nota').value = x.note || '';
  $('#ed-cat-rotulo').textContent = entrada ? 'De onde veio' : 'Categoria';
  $('#ed-cat').innerHTML = (entrada ? INCOME_SOURCES : state.categories).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#ed-cat').value = entrada ? x.sourceId : x.categoryId;
  const avisos = [];
  if (rachada) avisos.push('Essa conta foi dividida com amigos: o valor fica travado (pra mudar, apague e lance de novo).');
  if (x.parcelas > 1) avisos.push(`Parcelado em ${x.parcelas}x: o valor é o total da compra.`);
  $('#ed-aviso').hidden = !avisos.length;
  $('#ed-aviso').textContent = avisos.join(' ');
  $('#ed-erro').hidden = true;
  dlg.dataset.id = id;
  dlg.dataset.kind = kind;
  dlg.returnValue = '';
  dlg.showModal();
}

export async function salvarEdicao(ev) {
  const dlg = $('#editar-dialog');
  if (ev.submitter?.value !== 'ok') return; // Cancelar fecha sozinho
  ev.preventDefault();
  const tipo = ['entrada', 'prevista'].includes(dlg.dataset.kind) ? dlg.dataset.kind : 'gasto';
  const kind = tipo === 'gasto' ? 'gasto' : 'entrada';
  const lista = listaDo(tipo);
  const id = dlg.dataset.id;
  const x = lista.find(i => i.id === id);
  if (!x) return dlg.close();
  try {
    const valor = $('#ed-valor').disabled ? x.amountCents : parseAmount($('#ed-valor').value);
    const novo = editarLancamento(x, {
      amountCents: valor ?? 0, note: $('#ed-nota').value, date: $('#ed-data').value,
      ...(kind === 'entrada' ? { sourceId: $('#ed-cat').value } : { categoryId: $('#ed-cat').value }),
    }, { kind, categories: state.categories });
    await db.put(kind === 'entrada' ? db.STORES.incomes : db.STORES.expenses, novo);
    if (tipo === 'prevista') state.previstas = state.previstas.map(i => (i.id === id ? novo : i));
    else if (kind === 'entrada') state.incomes = state.incomes.map(i => (i.id === id ? novo : i));
    else state.expenses = state.expenses.map(i => (i.id === id ? novo : i));
    // 2.3.6.2 (ideia de 17/11): o "guardar a cada compra" acompanha a data nova do gasto
    if (kind === 'gasto') {
      const tr = transferenciasNaDataDoGasto(state.transferencias, id, novo.date);
      if (tr !== state.transferencias) { state.transferencias = tr; await db.setMeta('transferencias', tr); }
    }
    dlg.close();
    renderizar();
    toast(tipo === 'prevista' ? 'Entrada prevista atualizada.' : kind === 'entrada' ? 'Entrada atualizada.' : 'Gasto atualizado.');
  } catch (e) {
    $('#ed-erro').textContent = e.message || 'Não deu para salvar.';
    $('#ed-erro').hidden = false;
  }
}

// 2.3.3.6: { jaConfirmou } quando a pessoa já tocou em Confirmar no Chat (o C.A.O.S. propôs apagar)
export async function onDelete(id, kind, { jaConfirmou = false } = {}) {
  if (kind === 'transf') {
    const t = state.transferencias.find(x => x.id === id);
    if (!t || !confirm(`Apagar a transferência de ${formatBRL(t.amountCents)}?`)) return;
    state.transferencias = state.transferencias.filter(x => x.id !== id);
    await db.setMeta('transferencias', state.transferencias);
    renderizar(); renderContas();
    return toast('Transferência apagada.');
  }
  const lista = kind === 'entrada' ? state.incomes : state.expenses;
  const x = lista.find(i => i.id === id);
  if (!x || (!jaConfirmou && !confirm(`Apagar ${formatBRL(x.amountCents)}${x.note ? ` (${x.note})` : ''}?`))) return false;
  await db.remove(kind === 'entrada' ? db.STORES.incomes : db.STORES.expenses, id);
  if (x.imageId) await imagens.apagar(x.imageId).catch(() => {});
  // o que foi guardado no cofrinho por causa deste gasto sai junto (16/11)
  if (kind !== 'entrada' && state.transferencias.some(t => t.autoDe === id)) {
    state.transferencias = state.transferencias.filter(t => t.autoDe !== id);
    await db.setMeta('transferencias', state.transferencias);
  }
  if (kind === 'entrada') state.incomes = state.incomes.filter(i => i.id !== id);
  else state.expenses = state.expenses.filter(i => i.id !== id);
  renderizar();
  toast(kind === 'entrada' ? 'Entrada apagada.' : 'Gasto apagado.');
  return true;
}

export async function verFoto(id) {
  const img = await imagens.pegar(id);
  if (!img) return toast('Foto não encontrada.');
  const url = URL.createObjectURL(img.blob);
  $('#photo-dialog-img').src = url;
  const dlg = $('#photo-dialog');
  dlg.showModal();
  dlg.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
}
