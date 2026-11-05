// Espinha do C.A.O.S. (trazida do Perfil JF, 1.7.5.3, e adaptada à carteira).
// Ele é "caótico leal": fala o que quiser, do jeito dele, dentro de três leis que o código faz valer.
//
//   1ª lei · NUNCA MEXE NOS DADOS. Gastos, entradas, contas, orçamentos e categorias são da pessoa.
//            Ele só recebe cópias congeladas: se tentar mudar alguma coisa, dá erro e a 3ª lei segura.
//            Quando a conversa pede um registro ("gastei 30 no mercado"), ele PROPÕE; quem grava é o app,
//            depois que a pessoa toca em Confirmar.
//   2ª lei · NUNCA FALA O QUE A PESSOA PROIBIU. Humor Suave não recebe zoeira; voz desligada é silêncio.
//            (Filtros do gerador: pedaço ácido só sai com o humor Ácido.)
//   3ª lei · NUNCA TRAVA O APP. Erro dentro dele vira silêncio: a rotina devolve "nada" e o erro fica anotado.

const LOG_MAX = 30;
const log = [];

export function espinhaLog() {
  return log.slice();
}

function anotar(tipo, texto) {
  log.push(`${new Date().toISOString()} · ${tipo} · ${texto}`);
  if (log.length > LOG_MAX) log.shift();
}

/** Cópia profunda e congelada (1ª lei): o narrador lê, mas não consegue alterar. */
export function congelar(obj) {
  const copia = typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
  const fundo = o => {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      for (const v of Object.values(o)) fundo(v);
    }
    return o;
  };
  return fundo(copia);
}

/** 3ª lei: envolve uma rotina do narrador; se der erro, devolve `nada` e anota. */
export function protegido(nome, fn, nada = null) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      anotar('erro contido', `${nome}: ${e && e.message}`);
      return typeof nada === 'function' ? nada(...args) : nada;
    }
  };
}
