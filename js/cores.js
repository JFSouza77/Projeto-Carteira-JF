// Cores por categoria, fonte de entrada, forma de pagamento e banco (V2 do AI Studio, 13/11).
// Só dados e funções puras: devolvem variáveis do CSS (--cyan, --violet…), que mudam sozinhas no claro e no escuro.

const CATEGORIA = Object.freeze({
  mercado: 'var(--ok)', delivery: 'var(--caos)', restaurante: 'var(--warn)', transporte: 'var(--cyan)',
  moradia: 'var(--indigo)', contas: 'var(--accent)', saude: 'var(--coral)', lazer: 'var(--violet)',
  streaming: 'var(--violet)', compras: 'var(--caos)', outros: 'var(--cyan)',
});

const FONTE = Object.freeze({
  salario: 'var(--ok)', freela: 'var(--cyan)', rendimento: 'var(--accent)', presente: 'var(--violet)', outros: 'var(--indigo)',
});

const FORMA = Object.freeze({ pix: 'var(--cyan)', credito: 'var(--violet)', debito: 'var(--indigo)', dinheiro: 'var(--ok)' });

// Banco → cor principal e de apoio (faixa do cartão, sigla). Ordem importa: a primeira regra que bate vence.
const BANCOS = Object.freeze([
  { re: /nubank|roxinho/i, cor: 'var(--violet)', apoio: 'var(--caos)' },
  { re: /ita[úu]|inter\b|laranja/i, cor: 'var(--warn)', apoio: 'var(--coral)' },
  { re: /santander|bradesco|digio/i, cor: 'var(--coral)', apoio: 'var(--caos)' },
  { re: /mercado pago|btg|xp\b|caixa|safra|genial|wise|nomad|revolut/i, cor: 'var(--cyan)', apoio: 'var(--indigo)' },
  { re: /picpay|sicredi|sicoob|neon|next|c6|original|carteira|dinheiro/i, cor: 'var(--ok)', apoio: 'var(--cyan)' },
  { re: /banco do brasil|\bbb\b|caju|swile/i, cor: 'var(--accent)', apoio: 'var(--warn)' },
]);

export const corCategoria = id => CATEGORIA[id] || 'var(--cyan)';
export const corFonte = id => FONTE[id] || 'var(--indigo)';
export const corForma = id => FORMA[id] || 'var(--cyan)';

/** Tema do banco: { cor, apoio, sigla }. "Carteira"/"Dinheiro" vira "R$". */
export function temaBanco(nome) {
  const limpo = String(nome || 'Conta').trim() || 'Conta';
  const palavras = limpo.replace(/[()]/g, '').split(/\s+/).filter(Boolean);
  const sigla = /carteira|dinheiro/i.test(limpo) ? 'R$'
    : palavras.length >= 2 ? `${palavras[0][0]}${palavras[1][0]}`.toUpperCase() : limpo.slice(0, 2).toUpperCase();
  const r = BANCOS.find(b => b.re.test(limpo));
  return { cor: r ? r.cor : 'var(--indigo)', apoio: r ? r.apoio : 'var(--cyan)', sigla };
}
