// Gera js/caos/nucleo.js a partir do núcleo único do C.A.O.S. (o mesmo do Perfil, 12/11/2026).
// Fonte: docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json (o Code do Perfil atualiza; muda só com o ok do JF).
// Uso: node ferramentas/gerar_nucleo.js   (o teste tests/nucleo.test.js confere que a cópia está igual)
// É .js e não import de JSON porque o Safari antigo não aceita `import ... with { type: 'json' }`.
import { readFileSync, writeFileSync } from 'node:fs';

const fonte = new URL('../docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json', import.meta.url);
const destino = new URL('../js/caos/nucleo.js', import.meta.url);
const nucleo = JSON.parse(readFileSync(fonte, 'utf8'));
writeFileSync(destino, `// GERADO por ferramentas/gerar_nucleo.js a partir de docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json. Não edite à mão.
// Núcleo único do C.A.O.S. (igual no Perfil e na Carteira): quem ele é, a vida dele, datas, criador, leis, emoções.

const congelar = o => { if (o && typeof o === 'object') { Object.values(o).forEach(congelar); Object.freeze(o); } return o; };

export const NUCLEO = congelar(${JSON.stringify(nucleo, null, 2)});
`);
console.log(`nucleo.js gerado (núcleo ${nucleo.versao}).`);
