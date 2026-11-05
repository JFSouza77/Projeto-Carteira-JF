// Importa os rostos do C.A.O.S. do Perfil JF para a Carteira (uso único; rode de novo se o Perfil ganhar rostos novos).
// Uso: node ferramentas/importar_rostos_perfil.cjs <pasta do Projeto_Perfil_JF> js/caos/rostos-dados.js
const fs = require('fs'), vm = require('vm');
const P = process.argv[2], OUT = process.argv[3];
const dados = fs.readFileSync(P + '/src/dados/01-emocoes-do-caos.js', 'utf8');
const conf = fs.readFileSync(P + '/src/js/01-configuracao.js', 'utf8');
const viz = conf.slice(conf.indexOf('const CAOS_EMO_VIZ = {'), conf.indexOf('};', conf.indexOf('const CAOS_EMO_VIZ = {')) + 2);
const ctx = {};
vm.runInNewContext(dados + '\n' + viz + '\nthis.E=CAOS_EMOS;this.M=CAOS_MISTURA_ROSTOS;this.V=CAOS_EMO_VIZ;', ctx);
const QUERO = ['calmo','pensando','espiando','julgando','deboche','raiva','recompondo','tedio','ombros','preocupado','triste','orgulho','festa','carinho','surpresa','alivio'];
const E = {};
for (const k of QUERO) { if (!ctx.E[k]) throw new Error('falta ' + k); const e = ctx.E[k]; E[k] = { nome: e.nome, cor: e.cor, bg: e.bg, per: e.per, amp: e.amp, fr: e.fr, niv: e.niv }; }
const V = {};
for (const k of QUERO) V[k] = ctx.V[k].split(' ').filter(x => QUERO.includes(x));
const M = { acuado: ctx.M.acuado, 'riso sem graça': ctx.M['riso sem graça'], 'elogio contrariado': ctx.M['elogio contrariado'] };
const out = `// Rostos do C.A.O.S. (dados): trazidos do Perfil JF (src/dados/01-emocoes-do-caos.js e CAOS_EMO_VIZ),
// sem alteração nos rostos. Só as emoções que a Carteira usa. Gerado por ferramentas/importar_rostos_perfil.cjs.
// Cada emoção: nome, cor, fundo (bg), período do balanço (per), amplitude (amp), tempo de cada quadro (fr) e
// níveis (niv) do mais leve ao mais intenso; cada rosto é uma lista de quadros da animação.

export const EMOS = ${JSON.stringify(E, null, 1)};

// Vizinhos (a "escada de rostos"): ele só passa de um rosto pra outro vizinho, nunca pula direto.
export const VIZINHOS = ${JSON.stringify(V)};

// Rostos de mistura (duas emoções altas ao mesmo tempo). Nunca no humor Suave.
export const MISTURAS = ${JSON.stringify(M, null, 1)};
`;
fs.writeFileSync(OUT, out);
console.log('ok', Object.keys(E).length, 'emoções,', Object.values(E).reduce((s, e) => s + e.niv.flat().length, 0), 'rostos,', (out.length / 1024).toFixed(1), 'KB');
