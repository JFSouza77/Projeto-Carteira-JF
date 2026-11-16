// Moedas de jogo (JF, 15/11/2026): "o C.A.O.S. entende as moedas dos jogos, como um colega que entende de jogo".
// Só leitura e funções puras. Ele sabe qual é a moeda de cada jogo, onde comprar com segurança e faz a conta do
// preço por unidade de um pacote. O preço de HOJE muda toda hora: quem busca é a IA online (é assunto de dinheiro).

export const ATUALIZADO_EM = '15 de novembro de 2026';

const LOJA = 'na loja do próprio jogo (Pix ou cartão)';
const GIFT = 'ou com gift card oficial, vendido em lojas e sites confiáveis';

// 15 jogos (quantidade terminando em 0 ou 5, como as falas)
export const MOEDAS_JOGOS = Object.freeze([
  { jogo: 'Valorant', moeda: 'Valorant Points (VP)', chaves: ['valorant', 'vp', 'valorant points'], onde: `${LOJA}, ${GIFT} (cartão da Riot)`, extra: 'A Radianita (RP) você ganha jogando ou no passe; skin é com VP.' },
  { jogo: 'League of Legends', moeda: 'Riot Points (RP)', chaves: ['league of legends', 'riot points'], onde: `${LOJA}, ${GIFT} (cartão da Riot)` },
  { jogo: 'Free Fire', moeda: 'Diamantes', chaves: ['free fire', 'freefire', 'ff'], onde: 'no site oficial de recarga da Garena, na loja do jogo ou com gift card da Garena', extra: 'Recarregando pelo site oficial costuma vir bônus de diamantes.' },
  { jogo: 'Roblox', moeda: 'Robux', chaves: ['roblox', 'robux'], onde: `${LOJA} ou no site da Roblox, ${GIFT} (gift card Roblox)`, extra: 'O Roblox Premium dá Robux todo mês, como assinatura.' },
  { jogo: 'Fortnite', moeda: 'V-Bucks', chaves: ['fortnite', 'vbucks', 'v bucks', 'v-bucks'], onde: `${LOJA}, ${GIFT} (cartão de V-Bucks)`, extra: 'O Fortnite Crew é assinatura com V-Bucks todo mês.' },
  { jogo: 'Minecraft', moeda: 'Minecoins', chaves: ['minecraft', 'minecoins', 'minecoin'], onde: `no Marketplace do jogo, ${GIFT}` },
  { jogo: 'Genshin Impact', moeda: 'Cristais Gênesis (viram Primogemas)', chaves: ['genshin', 'primogema', 'primogemas', 'cristais genesis'], onde: `${LOJA} ou em sites de recarga confiáveis`, extra: 'A Bênção Lunar é a opção mais barata por dia pra quem joga sempre.' },
  { jogo: 'Honkai: Star Rail', moeda: 'Fragmentos Oníricos (viram Jade Estelar)', chaves: ['star rail', 'honkai', 'jade estelar'], onde: `${LOJA} ou em sites de recarga confiáveis` },
  { jogo: 'Clash Royale', moeda: 'Gemas', chaves: ['clash royale'], onde: `${LOJA} ou na loja oficial da Supercell (costuma ter bônus)` },
  { jogo: 'Clash of Clans', moeda: 'Gemas', chaves: ['clash of clans'], onde: `${LOJA} ou na loja oficial da Supercell (costuma ter bônus)` },
  { jogo: 'Brawl Stars', moeda: 'Gemas', chaves: ['brawl stars', 'brawl'], onde: `${LOJA} ou na loja oficial da Supercell (costuma ter bônus)` },
  { jogo: 'PUBG Mobile', moeda: 'UC (Unknown Cash)', chaves: ['pubg', 'uc', 'unknown cash'], onde: `${LOJA} ou em sites de recarga oficiais` },
  { jogo: 'Call of Duty', moeda: 'COD Points (CP)', chaves: ['call of duty', 'cod points', 'warzone', 'cod mobile'], onde: `${LOJA}, ${GIFT}` },
  { jogo: 'EA Sports FC', moeda: 'FC Points', chaves: ['ea fc', 'ea sports fc', 'fc points', 'fifa points'], onde: `${LOJA} ou na loja do console/PC, ${GIFT}` },
  { jogo: 'Steam', moeda: 'saldo da Carteira Steam (não é moeda de jogo, mas serve pra comprar jogos e itens)', chaves: ['steam'], onde: `no site ou app da Steam (Pix ou cartão), ${GIFT} (cartão Steam)` },
]);

const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Acha o jogo falado na frase (pelo nome do jogo ou da moeda). */
export function acharMoedaJogo(texto) {
  const t = ` ${norm(texto).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  return MOEDAS_JOGOS.find(m => m.chaves.some(c => t.includes(` ${norm(c).replace(/[^a-z0-9 ]/g, ' ')} `))) || null;
}

/** "1000 robux por 50 reais" → { quantidade: 1000, reaisCents: 5000 } (a primeira quantidade e o valor em reais). */
export function lerPacote(texto) {
  const t = norm(texto).replace(/(\d)\.(\d{3})/g, '$1$2');
  const reais = t.match(/(?:r\$\s*|por\s+)(\d+(?:,\d{1,2})?)\s*(?:reais|real|conto|pila)?/) || t.match(/(\d+(?:,\d{1,2})?)\s*(?:reais|real|conto|pila)\b/);
  const qtd = t.match(/(\d+)\s*(?:robux|v ?-?bucks|vp|rp|diamantes?|minecoins?|gemas?|uc|cp|cristais|primogemas?|jades?|fragmentos?|points?|pontos)/);
  if (!reais || !qtd) return null;
  const reaisCents = Math.round(Number(reais[1].replace(',', '.')) * 100);
  const quantidade = Number(qtd[1]);
  return quantidade > 0 && reaisCents > 0 ? { quantidade, reaisCents } : null;
}

export const DICA_SEGURANCA = 'Cuidado com site de "moeda grátis" ou gerador de código: é golpe. Compre só na loja oficial ou gift card de loja confiável, e nunca passe sua senha nem o código do cartão pra ninguém.';
