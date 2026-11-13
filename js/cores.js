// Cores por categoria, fonte de entrada, forma de pagamento e banco (V2 do AI Studio, 13/11).
// Só dados e funções puras: devolvem variáveis do CSS (--cyan, --violet…), que mudam sozinhas no claro e no escuro.

// 13/11 (Code + JF): paleta própria por categoria, conferida no claro e no escuro (tokens --cat-* no CSS).
// Regra da marca: cada cor quer dizer uma coisa, sempre a mesma; nada de cor só por enfeite.
const CATEGORIA = Object.freeze(Object.fromEntries(
  ['mercado', 'delivery', 'restaurante', 'transporte', 'moradia', 'contas', 'saude', 'lazer', 'streaming', 'compras', 'educacao', 'outros']
    .map(id => [id, `var(--cat-${id})`]),
));

const FONTE = Object.freeze({
  salario: 'var(--ok)', freela: 'var(--cyan)', rendimento: 'var(--accent)', presente: 'var(--violet)', outros: 'var(--indigo)',
});

const FORMA = Object.freeze({ pix: 'var(--cyan)', credito: 'var(--violet)', debito: 'var(--indigo)', dinheiro: 'var(--ok)' });

// Banco → as cores que o próprio banco usa (JF, 13/11: "o mais próximo possível dos bancos normais").
// fundo e letra = o "quadradinho" com a sigla; linha = a cor das faixas (pra banco preto, um cinza que aparece no escuro).
// Só cor e letras: nada de logotipo. Ordem importa: a primeira regra que bate vence.
const B = (re, sigla, fundo, letra, linha = fundo, apoio = letra) => ({ re, sigla, fundo, letra, linha, apoio });
const BANCOS = Object.freeze([
  // cartões de loja (13/11): antes das regras dos bancos, pra "Cartão Magalu" não virar outra coisa
  B(/cart[aã]o amazon|^amazon/i, 'a', '#232F3E', '#FF9900', '#FF9900', '#FFC266'),
  B(/cart[aã]o magalu|magalu|magazine luiza/i, 'M', '#0086FF', '#FFFFFF', '#2E9BFF', '#8CC8FF'),
  B(/cart[aã]o carrefour/i, 'C', '#004E9F', '#FFFFFF', '#2B74C7', '#E1000F'),
  B(/renner|realize/i, 'R', '#CC0000', '#FFFFFF', '#E02626', '#FF8A8A'),
  B(/riachuelo|midway/i, 'R', '#000000', '#FFFFFF', '#8A8F98', '#C9CDD3'),
  B(/nubank|roxinho/i, 'nu', '#820AD1', '#FFFFFF', '#9B3FE0', '#C77DFF'),
  B(/ita[úu]/i, 'itaú', '#EC7000', '#0A1E5E', '#EC7000', '#FFB25B'),
  B(/bradesco/i, 'B', '#CC092F', '#FFFFFF', '#E0263F', '#FF6B81'),
  B(/banco do brasil|^bb$/i, 'BB', '#FCFC30', '#465EFF', '#E8D200', '#465EFF'),
  B(/caixa/i, 'CX', '#005CA9', '#F39200', '#1A73C9', '#F39200'),
  B(/santander/i, 'S', '#EC0000', '#FFFFFF', '#F02B2B', '#FF7070'),
  B(/\binter\b/i, 'in', '#FF7A00', '#FFFFFF', '#FF7A00', '#FFB066'),
  B(/c6/i, 'C6', '#1E1E1E', '#FFFFFF', '#8A8F98', '#C9CDD3'),
  B(/picpay/i, 'Pic', '#21C25E', '#FFFFFF', '#21C25E', '#7BE3A4'),
  B(/mercado pago/i, 'MP', '#00B1EA', '#FFFFFF', '#00B1EA', '#7FD8F5'),
  B(/pagbank|pagseguro/i, 'PB', '#00A868', '#FFFFFF', '#00A868', '#F5D300'),
  B(/btg/i, 'BTG', '#0A1E3F', '#FFFFFF', '#3C5A9A', '#8FA6D6'),
  B(/^xp\b/i, 'XP', '#000000', '#FFC709', '#FFC709', '#FFE07A'),
  B(/sicoob/i, 'S', '#003641', '#7DB61C', '#00AE9D', '#7DB61C'),
  B(/sicredi|woop/i, 'S', '#3FA110', '#FFFFFF', '#3FA110', '#9AD66F'),
  B(/neon/i, 'N', '#00C2E8', '#0B1A3A', '#00C2E8', '#7FE3F5'),
  B(/next/i, 'N', '#00FF5F', '#000000', '#00D84F', '#7DFFAA'),
  B(/banrisul/i, 'B', '#0047BB', '#FFFFFF', '#2F6BD6', '#7FA6EA'),
  B(/banestes/i, 'B', '#00539F', '#FFFFFF', '#2A78C4', '#7DB0E3'),
  B(/brb/i, 'BRB', '#0A4DA2', '#FFFFFF', '#2D6FC4', '#7DA7DF'),
  B(/nordeste/i, 'BNB', '#A6192E', '#FFFFFF', '#C8314A', '#F08090'),
  B(/agibank/i, 'agi', '#1E4FD8', '#FFFFFF', '#3D6BE6', '#8FA9F2'),
  B(/will/i, 'W', '#FFD800', '#000000', '#E8C400', '#FFE873'),
  B(/original/i, 'O', '#00A651', '#FFFFFF', '#00A651', '#7DD9A6'),
  B(/safra/i, 'S', '#0F2B5B', '#C9A961', '#C9A961', '#E3CF9F'),
  B(/\bpan\b/i, 'pan', '#00ADEF', '#FFFFFF', '#00ADEF', '#7FD6F7'),
  B(/digio/i, 'D', '#1D2C5E', '#FFFFFF', '#4A5FA8', '#94A3D8'),
  B(/cora/i, 'C', '#FE3E6D', '#FFFFFF', '#FE3E6D', '#FF9AB3'),
  B(/hsbc/i, 'H', '#DB0011', '#FFFFFF', '#E8303D', '#FF8A92'),
  B(/nomad/i, 'N', '#FFD000', '#000000', '#E8BD00', '#FFE266'),
  B(/wise/i, 'W', '#9FE870', '#163300', '#7FCF4F', '#C6F5A6'),
  B(/revolut/i, 'R', '#000000', '#FFFFFF', '#8A8F98', '#C9CDD3'),
  B(/alelo/i, 'A', '#00843D', '#FFFFFF', '#00A04B', '#B5D334'),
  B(/vr benef/i, 'VR', '#00A651', '#FFE600', '#00A651', '#FFE600'),
  B(/pluxee|sodexo/i, 'P', '#221C46', '#00EB5E', '#00C94F', '#7DF5A8'),
  B(/ticket|edenred/i, 'T', '#E3001B', '#FFFFFF', '#E8303D', '#FF8A92'),
  B(/swile/i, 'S', '#5A3FFF', '#FFFFFF', '#6F57FF', '#B3A6FF'),
  B(/caju/i, 'C', '#FF4F2E', '#FFFFFF', '#FF6A4D', '#FFAE9E'),
  B(/carteira|dinheiro/i, 'R$', '#12814F', '#FFFFFF', '#3DDC97', '#9BEFC9'),
]);

export const corCategoria = id => CATEGORIA[id] || 'var(--cyan)';
export const corFonte = id => FONTE[id] || 'var(--indigo)';
export const corForma = id => FORMA[id] || 'var(--cyan)';

/** Tema do banco: { fundo, letra, cor (faixas), apoio, sigla }. Banco que não está na lista: sigla das iniciais e índigo. */
export function temaBanco(nome) {
  const limpo = String(nome || 'Conta').trim() || 'Conta';
  const r = BANCOS.find(b => b.re.test(limpo));
  if (r) return { fundo: r.fundo, letra: r.letra, cor: r.linha, apoio: r.apoio, sigla: r.sigla };
  const palavras = limpo.replace(/[()]/g, '').split(/\s+/).filter(Boolean);
  const sigla = palavras.length >= 2 ? `${palavras[0][0]}${palavras[1][0]}`.toUpperCase() : limpo.slice(0, 2).toUpperCase();
  return { fundo: 'var(--indigo)', letra: '#FFFFFF', cor: 'var(--indigo)', apoio: 'var(--cyan)', sigla };
}
