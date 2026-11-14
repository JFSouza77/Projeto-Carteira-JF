// Avatar animado do C.A.O.S. (pedido do JF, 13/11: "cadê os avatares?").
// Veio do rascunho do Wally de 06/11 (caos-formas.html, mandado ao Perfil no PR #208), com as 44 formas: o C.A.O.S. é
// uma telinha neon que flutua, com pedacinhos do "caos" girando em volta; cada humor, momento ou reação vira uma FORMA
// (cor, acessórios, jeito do corpo, rosto e como os pedacinhos se mexem).
//
// Camada "navegador": só desenha. Quem decide a forma é o app (formaPara, logo abaixo, é função pura e tem teste).
// Cuidados do Code (13/11): um SVG só por lugar, trocando classes (não recria a cada fala); pausa quando a tela
// está escondida ou o avatar não aparece (bateria); "menos movimento" = parado. Um laço de animação só pra todos.

// ---------- Que forma combina com o momento (função pura) ----------
// rosto do C.A.O.S. (emo dos rostinhos) → forma do avatar
const POR_ROSTO = Object.freeze({
  calmo: 'calmo', pensando: 'pensando', espiando: 'detetive', julgando: 'desconfiado', deboche: 'tentado',
  raiva: 'perturbado', recompondo: 'envergonhado', tedio: 'sonolento', ombros: 'pensando', preocupado: 'preocupado',
  triste: 'triste', orgulho: 'orgulhoso', festa: 'feliz', carinho: 'parceiro', surpresa: 'surpreso', alivio: 'anjinho',
  espantado: 'surpreso', analista: 'detetive',
  // misturas
  acuado: 'medo', 'riso sem graça': 'envergonhado', 'elogio contrariado': 'orgulhoso',
});
// o assunto pesa mais que a emoção: dica = professor, piada = humorista, conta vencendo = despertador…
const POR_ASSUNTO = Object.freeze({
  piada: 'humorista', dica: 'professor', tutorial: 'professor', ajuda: 'professor', explicar_melhor: 'professor',
  limites: 'anjinho', como_funciona: 'pensando', previsao: 'vidente', onde_mais: 'detetive', maiores_gastos: 'detetive',
  comparar_ofertas: 'simulador', oferta_unica: 'simulador', porcentagem: 'contador', vale_parcelar: 'simulador',
  a_receber: 'cobrador', ofensiva: 'treinador', meta_ritmo: 'amigao', mes_verde: 'feliz', mes_negativo: 'triste',
  categoria_estourada: 'bronca', orcamento_80: 'preocupado', cartao_limite: 'alerta', conta_negativa: 'recalculando',
  cartao_vence: 'lembrete', compromisso_vence: 'lembrete', compromisso_atrasado: 'alerta', delivery_repetido: 'nojinho',
  ritmo_alto: 'medo', fechamento: 'contador', resumo_mes: 'contador', meus_investimentos: 'investidor', mercado: 'investidor',
  investir: 'investidor', salario_caiu: 'rico', boas_vindas: 'anjinho',
  // paciência (13/11): firme → decepcionado → cartão vermelho → sem reação (quietinho) → de volta
  xingamento: 'parceiro', xingamento_2: 'desconfiado', xingamento_3: 'decepcionado', xingamento_3_forte: 'decepcionado',
  xingamento_fim: 'chocado', xingamento_fim_forte: 'vermelho', silencio: 'chocado', passou_raiva: 'anjinho', desculpa_aceita: 'parceiro',
  desabafo: 'parceiro', limite_investido: 'banqueiro', bancos: 'investidor', conta: 'contador', glossario: 'professor', privacidade: 'anjinho', como_esta: 'calmo',
});

// forma do avatar → rostinho de texto que combina com ela (o balão mostra o rostinho, não emoji; JF, 13/11 à noite)
export const EMO_DA_FORMA = Object.freeze({
  calmo: 'calmo', anjinho: 'carinho', feliz: 'festa', orgulhoso: 'orgulho', pensando: 'pensando', triste: 'triste',
  tentado: 'deboche', perturbado: 'raiva', alerta: 'preocupado', professor: 'pensando', parceiro: 'carinho', bronca: 'julgando',
  lembrete: 'preocupado', chocado: 'ombros', economista: 'orgulho', rico: 'festa', decepcionado: 'triste', nojinho: 'julgando',
  medo: 'preocupado', desconfiado: 'espiando', amigao: 'carinho', humorista: 'festa', gerente: 'pensando', investidor: 'pensando',
  preocupado: 'preocupado', vidente: 'espiando', zen: 'alivio', detetive: 'analista', sobrevivente: 'ombros', desnorteado: 'surpresa',
  recalculando: 'preocupado', sonolento: 'tedio', envergonhado: 'recompondo', contador: 'analista', banqueiro: 'orgulho',
  ferias: 'alivio', simulador: 'analista', auditor: 'julgando', cobrador: 'julgando', surpreso: 'espantado', confiante: 'orgulho',
  vermelho: 'raiva', treinador: 'festa', vovo: 'ombros',
});

/** Forma do avatar pro momento: o assunto (intenção ou evento) manda; senão, o rosto/emoção. */
export function formaPara({ rosto = null, assunto = null } = {}) {
  if (assunto && POR_ASSUNTO[assunto]) return POR_ASSUNTO[assunto];
  const r = rosto && (POR_ROSTO[rosto.nome] || POR_ROSTO[rosto.emo]);
  return r || 'calmo';
}

// ---------- As formas (do rascunho, sem as falas de exemplo) ----------
export const FORMAS = Object.freeze({
  anjinho:   { nome:'😇 Anjinho', quando:'calmo, carinhoso', cor:'#9fe8ff', modo:'lento',
    acc:['asas','aureola','bochechas'], corpo:'translateY(-6px)',
    olhoE:{ d:'M148 206 Q 161 196, 174 206', cheio:false }, olhoD:{ d:'M226 206 Q 239 196, 252 206', cheio:false },
    sob:'', boca:'M184 244 Q 200 256, 216 244', extra:'' },
  feliz:     { nome:'🥳 Festeiro', quando:'meta batida, mês no verde', cor:'#ffd24a', modo:'festa',
    acc:['chapeu','bochechas'], corpo:'translateY(-10px) scale(1.04)',
    olhoE:{ d:'M148 208 Q 161 186, 174 208', cheio:false }, olhoD:{ d:'M226 208 Q 239 186, 252 208', cheio:false },
    sob:'', boca:'M166 236 Q 200 276, 234 236 Z', extra:'' },
  orgulhoso: { nome:'🎩 Pomposo', quando:'orgulhoso, se achando', cor:'#e9c46a', modo:'anel',
    acc:['coroa','gravata','monoculo'], corpo:'translateY(-12px) rotate(7deg) scale(1.06)',
    olhoE:{ d:'M150 204 h22 v8 a11 6 0 0 1 -22 0 z', cheio:true }, olhoD:{ d:'M228 204 h22 v8 a11 6 0 0 1 -22 0 z', cheio:true },
    sob:'M146 192 L174 192 M226 186 L254 180', boca:'M178 252 Q 206 258, 230 240', extra:'' },
  pensando:  { nome:'🤓 Pensador', quando:'calculando, pesquisando', cor:'#3ef0ff', modo:'lento',
    acc:['lampada','oculos'], corpo:'rotate(-3deg)',
    olhoE:{ d:'M156 186 h16 v18 h-16 z', cheio:true }, olhoD:{ d:'M236 186 h16 v18 h-16 z', cheio:true },
    sob:'', boca:'M180 252 q 10 -6 20 0 t 20 0', extra:'' },
  triste:    { nome:'🌧️ Tristinho', quando:'mês no vermelho, decepcionado', cor:'#6fa8ff', modo:'chuva',
    acc:['nuvem','lagrima'], corpo:'translateY(18px) scale(.95, .88)',
    olhoE:{ d:'M151 198 h20 v18 h-20 z', cheio:true }, olhoD:{ d:'M229 198 h20 v18 h-20 z', cheio:true },
    sob:'M146 184 L172 176 M228 176 L254 184', boca:'M178 260 Q 200 244, 222 260', extra:'' },
  tentado:   { nome:'😈 Capetinha', quando:'tentado, zoeira', cor:'#b06bff', modo:'calmo',
    acc:['chifres','rabo'], corpo:'rotate(-6deg)',
    olhoE:{ d:'M150 202 h22 v12 h-22 z', cheio:true }, olhoD:{ d:'M228 190 h22 v26 h-22 z', cheio:true },
    sob:'M226 176 L254 166', boca:'M170 252 Q 200 262, 230 240', extra:'' },
  perturbado:{ nome:'👿 Capeta bravo', quando:'perturbado, irritado', cor:'#ff3b5c', modo:'agitado',
    acc:['chifres','rabo'], corpo:'scale(1.05)', treme:true,
    olhoE:{ d:'M148 192 L174 202 V216 H148 Z', cheio:true }, olhoD:{ d:'M252 192 L226 202 V216 H252 Z', cheio:true },
    sob:'', boca:'M176 258 Q 200 240, 224 258', extra:'' },
  alerta:    { nome:'🚨 Sirene', quando:'alerta sério', cor:'#ff8a3d', modo:'agitado',
    acc:['sirene'], corpo:'scale(1.04)',
    olhoE:{ d:'M149 202 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', cheio:false }, olhoD:{ d:'M227 202 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', cheio:false },
    sob:'', boca:'M192 252 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', extra:'' },
  professor: { nome:'👨‍🏫 Professor', quando:'dica, ideia, insight', cor:'#7cc4ff', modo:'lento', grupo:'carteira',
    acc:['capelo','lousa','oculos'], corpo:'rotate(-4deg)',
    olhoE:{ d:'M152 190 h18 v20 h-18 z', cheio:true }, olhoD:{ d:'M232 190 h18 v20 h-18 z', cheio:true },
    sob:'M226 170 L254 164', boca:'M180 248 Q 202 258, 224 244', extra:'' },
  parceiro:  { nome:'🤗 Parceiro', quando:'mês apertado, precisa de apoio', cor:'#ffa883', modo:'abraco', grupo:'carteira',
    acc:['cachecol','coracao','bochechas'], corpo:'translateY(4px) scale(1.02)',
    olhoE:{ d:'M148 206 Q 161 196, 174 206', cheio:false }, olhoD:{ d:'M226 206 Q 239 196, 252 206', cheio:false },
    sob:'M148 186 L172 180 M228 180 L252 186', boca:'M182 244 Q 200 256, 218 244', extra:'' },
  bronca:    { nome:'🟨 Bronca', quando:'passou do limite', cor:'#ffb020', modo:'calmo', grupo:'carteira',
    acc:['cartao'], corpo:'rotate(3deg) scale(1.03)',
    olhoE:{ d:'M150 194 h22 v22 h-22 z', cheio:true }, olhoD:{ d:'M228 194 h22 v22 h-22 z', cheio:true },
    sob:'M146 176 L172 186 M254 176 L228 186', boca:'M180 254 h40', extra:'' },
  lembrete:  { nome:'⏰ Lembrete', quando:'conta perto de vencer', cor:'#4ee6a6', modo:'calmo', grupo:'carteira',
    acc:['despertador'], corpo:'translateY(-4px)',
    olhoE:{ d:'M152 202 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0', cheio:true }, olhoD:{ d:'M230 202 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0', cheio:true },
    sob:'M146 182 Q 161 172, 176 182 M224 182 Q 239 172, 254 182', boca:'M186 248 Q 200 258, 214 248', extra:'' },
  chocado:   { nome:'😶 Sem reação', quando:'chocado, sem palavras', cor:'#b77dff', modo:'parado', grupo:'reacoes',
    acc:[], corpo:'scale(.97)',
    olhoE:{ d:'M155 200 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0', cheio:true }, olhoD:{ d:'M231 200 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0', cheio:true },
    sob:'', boca:'', extra:'' },
  economista:{ nome:'📈 Economista', quando:'controlando melhor as finanças', cor:'#4ade80', modo:'anel', grupo:'reacoes',
    acc:['cofrinho','bochechas'], corpo:'translateY(-6px) rotate(-3deg)',
    olhoE:{ d:'M150 192 h22 v24 h-22 z', cheio:true }, olhoD:{ d:'M228 192 h22 v24 h-22 z', cheio:true },
    sob:'M146 178 Q 161 172, 176 178 M224 178 Q 239 172, 254 178', boca:'M174 242 Q 200 266, 226 242', extra:'' },
  rico:      { nome:'🤑 Rico', quando:'salário caiu', cor:'#ffe27a', modo:'dinheiro', grupo:'reacoes',
    acc:['terno','oculosEscuros'], corpo:'translateY(-10px) rotate(4deg) scale(1.04)',
    olhoE:{ d:'M152 196 h18 v16 h-18 z', cheio:true }, olhoD:{ d:'M230 196 h18 v16 h-18 z', cheio:true },
    sob:'', boca:'M166 240 Q 200 274, 236 236 Z', extra:'' },
  decepcionado:{ nome:'😮‍💨 Decepcionado', quando:'estourou o limite do mês', cor:'#a5b4d0', modo:'lento', grupo:'reacoes',
    acc:['suor'], corpo:'translateY(8px) rotate(-4deg)', anim:'nega',
    olhoE:{ d:'M150 204 h22 v9 h-22 z', cheio:true }, olhoD:{ d:'M228 204 h22 v9 h-22 z', cheio:true },
    sob:'M148 192 L 174 196 M226 196 L 252 192', boca:'M182 254 Q 200 249, 220 257', extra:'' },
  nojinho:   { nome:'🤢 Nojinho', quando:'não curtiu sua atitude', cor:'#c3d44a', modo:'lento', grupo:'reacoes',
    acc:['fedor','lingua'], corpo:'rotate(-8deg) translateX(-6px)',
    olhoE:{ d:'M148 196 L 172 204 L 148 212', cheio:false }, olhoD:{ d:'M230 196 h18 v16 h-18 z', cheio:true },
    sob:'M226 182 L 252 188', boca:'M176 250 q 8 -6 16 0 t 16 0 t 16 0', extra:'' },
  medo:      { nome:'😱 Medo', quando:'gastando mais do que devia', cor:'#c7d2fe', modo:'medo', grupo:'reacoes',
    acc:['suor','pupilas'], corpo:'scale(.9) translateY(6px)', treme:true, bocaTreme:true,
    olhoE:{ d:'M147 202 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0', cheio:false }, olhoD:{ d:'M225 202 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0', cheio:false },
    sob:'M146 178 L 172 172 M228 172 L 254 178', boca:'M174 256 l 9 -7 l 9 7 l 9 -7 l 9 7 l 9 -7 l 9 7', extra:'' },
  desconfiado:{ nome:'🤨 Desconfiado', quando:'finge que economiza', cor:'#f472b6', modo:'lento', grupo:'reacoes',
    acc:['lupa'], corpo:'rotate(6deg) translateX(6px)', anim:'trocaOlho',
    olhoE:{ d:'M150 204 h22 v6 h-22 z', cheio:true }, olhoD:{ d:'M240 194 h14 v18 h-14 z', cheio:true },
    sob:'M146 194 L 174 198 M228 176 L 256 168', boca:'M180 252 h26 q 8 0 12 -6', extra:'' },
  amigao:    { nome:'🤝 Amigão', quando:'toque pra chegar na meta', cor:'#2dd4bf', modo:'calmo', grupo:'reacoes',
    acc:['alvo','bilhete'], corpo:'rotate(-4deg) translateY(-4px)',
    olhoE:{ d:'M148 206 Q 161 192, 174 206', cheio:false }, olhoD:{ d:'M228 190 h22 v24 h-22 z', cheio:true },
    sob:'M224 176 Q 239 168, 254 176', boca:'M172 242 Q 202 266, 230 238', extra:'' },
  humorista: { nome:'🎤 Humorista', quando:'hora da piada', cor:'#ff9f1c', modo:'festa', grupo:'estilos',
    acc:['microfone','nariz'], corpo:'rotate(-5deg)', anim:'ri',
    olhoE:{ d:'M148 196 L 172 204 L 148 212', cheio:false }, olhoD:{ d:'M252 196 L 228 204 L 252 212', cheio:false },
    sob:'', boca:'M168 240 Q 200 280, 232 240 Z', extra:'HA!' },
  gerente:   { nome:'💼 Gerente', quando:'jeito formal, explica a fundo', cor:'#cbd5e1', modo:'anel', grupo:'estilos',
    acc:['terno','maleta','meialua'], corpo:'scale(1.02)',
    olhoE:{ d:'M152 190 h18 v16 h-18 z', cheio:true }, olhoD:{ d:'M230 190 h18 v16 h-18 z', cheio:true },
    sob:'M146 178 h28 M226 178 h28', boca:'M182 250 Q 200 254, 218 250', extra:'' },
  investidor:{ nome:'💡 Investidor', quando:'sugestão leve, sem pressão', cor:'#60a5fa', modo:'calmo', grupo:'estilos',
    acc:['bone','seta'], corpo:'rotate(-6deg) translateY(-4px)',
    olhoE:{ d:'M156 196 h18 v18 h-18 z', cheio:true }, olhoD:{ d:'M234 196 h18 v18 h-18 z', cheio:true },
    sob:'M152 182 Q 165 176, 178 182 M230 180 L 256 174', boca:'M176 246 Q 204 260, 228 242', extra:'' },
  preocupado:{ nome:'😟 Preocupado', quando:'conta chegando no limite', cor:'#fdba74', modo:'calmo', grupo:'reacoes',
    acc:['medidor','suor'], corpo:'translateY(4px) rotate(3deg)',
    olhoE:{ d:'M151 196 h20 v20 h-20 z', cheio:true }, olhoD:{ d:'M229 196 h20 v20 h-20 z', cheio:true },
    sob:'M146 184 L 172 176 M228 176 L 254 184', boca:'M180 254 q 7 -6 14 0 t 14 0 t 14 0', extra:'' },
  vidente:   { nome:'🔮 Vidente', quando:'previsão do mês', cor:'#e879f9', modo:'anel', grupo:'gemini',
    acc:['turbante','bola'], corpo:'translateY(-8px)',
    olhoE:{ d:'M148 202 Q 161 212, 174 202', cheio:false }, olhoD:{ d:'M226 202 Q 239 212, 252 202', cheio:false },
    sob:'M146 186 Q 161 180, 176 186 M224 186 Q 239 180, 254 186', boca:'M192 250 a 8 6 0 1 0 16 0 a 8 6 0 1 0 -16 0', extra:'' },
  zen:       { nome:'🧘 Zen', quando:'orçamentos todos abaixo da metade', cor:'#c4b5fd', modo:'lento', grupo:'gemini',
    acc:['lotus'], corpo:'scale(1)', anim:'levita',
    olhoE:{ d:'M148 204 Q 161 212, 174 204', cheio:false }, olhoD:{ d:'M226 204 Q 239 212, 252 204', cheio:false },
    sob:'', boca:'M186 246 Q 200 254, 214 246', extra:'' },
  detetive:  { nome:'🕵️ Detetive', quando:'"onde mais gastei?"', cor:'#d6a46b', modo:'lento', grupo:'gemini',
    acc:['chapeuDetetive','lupa'], corpo:'rotate(-3deg)', anim:'varre',
    olhoE:{ d:'M150 202 h22 v8 h-22 z', cheio:true }, olhoD:{ d:'M230 194 h18 v18 h-18 z', cheio:true },
    sob:'M146 192 L 174 196 M226 182 L 254 176', boca:'M182 252 h24 q 8 0 12 -4', extra:'' },
  sobrevivente:{ nome:'🧟 Sobrevivente', quando:'fim de mês zerado (só no Ácido)', cor:'#9fb08f', modo:'lento', grupo:'gemini',
    acc:['curto','olheiras'], corpo:'translateY(10px)', anim:'cambaleia',
    olhoE:{ d:'M148 204 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0', cheio:false }, olhoD:{ d:'M234 204 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0', cheio:true },
    sob:'', boca:'M178 256 L 196 250 L 210 258 L 224 250', extra:'' },
  desnorteado:{ gira:true, nome:'😵‍💫 Desnorteado', quando:'sumiu um tempão e voltou com a bomba', cor:'#67e8f9', modo:'bagunca', grupo:'reacoes',
    acc:['tontura','suor'], corpo:'translateY(4px)', anim:'cambaleia',
    gira:true,
    olhoE:{ d:'M161 202 a 3 3 0 0 1 6 0 a 6 6 0 0 1 -12 0 a 9 9 0 0 1 18 0 a 12 12 0 0 1 -24 0', cheio:false }, olhoD:{ d:'M239 202 a 3 3 0 0 1 6 0 a 6 6 0 0 1 -12 0 a 9 9 0 0 1 18 0 a 12 12 0 0 1 -24 0', cheio:false },
    sob:'M146 182 Q 160 172, 174 178 M226 176 Q 240 172, 254 184', boca:'M180 256 q 8 -10 16 0 t 16 0 t 16 -4', extra:'?!' },
  recalculando:{ nome:'🧭 Recalculando', quando:'alerta vermelho: refazer a rota', cor:'#ff4d5e', modo:'anel', grupo:'reacoes',
    acc:['gps'], corpo:'scale(1.03)',
    olhoE:{ d:'M150 196 h22 v18 h-22 z', cheio:true }, olhoD:{ d:'M228 196 h22 v18 h-22 z', cheio:true },
    sob:'M146 182 L 174 186 M254 182 L 226 186', boca:'M178 250 h44', extra:'' },
  sonolento: { nome:'😴 Sonolento', quando:'tédio, nada acontecendo', cor:'#818cf8', modo:'dormindo', grupo:'perfil',
    acc:['touca','zzz'], corpo:'rotate(-12deg) translateY(12px)', anim:'respira',
    olhoE:{ d:'M148 206 Q 160 213, 172 206', cheio:false }, olhoD:{ d:'M228 206 Q 240 213, 252 206', cheio:false },
    sob:'', boca:'M194 252 a 6 5 0 1 0 12 0 a 6 5 0 1 0 -12 0', extra:'' },
  envergonhado:{ nome:'😳 Envergonhado', quando:'vergonha, foi zoado', cor:'#fda4af', modo:'abraco', grupo:'perfil',
    acc:['corado','suor'], corpo:'scale(.9) rotate(8deg) translateX(10px)', anim:'encolhe',
    olhoE:{ d:'M164 210 h14 v12 h-14 z', cheio:true }, olhoD:{ d:'M238 210 h14 v12 h-14 z', cheio:true },
    sob:'M150 190 L 174 186 M228 186 L 252 190', boca:'M188 256 q 6 -5 12 0 t 12 0', extra:'' },
  contador:  { nome:'🧮 Contador', quando:'fechamento do mês, relatório', cor:'#86efac', modo:'anel', grupo:'jf2',
    acc:['calculadora','viseira'], corpo:'rotate(-3deg)',
    olhoE:{ d:'M150 200 h20 v14 h-20 z', cheio:true }, olhoD:{ d:'M226 200 h20 v14 h-20 z', cheio:true },
    sob:'M148 186 h24 M226 186 h24', boca:'M184 252 h32', extra:'' },
  banqueiro: { nome:'🏦 Banqueiro', quando:'cartão novo cadastrado', cor:'#e5c07b', modo:'anel', grupo:'jf2',
    acc:['cartola','cartoes','bigode','monoculo'], corpo:'translateY(-6px) rotate(3deg)',
    olhoE:{ d:'M150 198 h20 v14 h-20 z', cheio:true }, olhoD:{ d:'M230 198 h20 v14 h-20 z', cheio:true },
    sob:'M146 184 L 172 180 M226 180 L 254 184', boca:'', extra:'' },
  ferias:    { nome:'🏖️ Férias', quando:'modo férias ligado', cor:'#38bdf8', modo:'lento', grupo:'jf2',
    acc:['chapeuPraia','oculosEscuros','praia'], corpo:'translateY(-4px)', anim:'balanca',
    olhoE:{ d:'M152 196 h18 v16 h-18 z', cheio:true }, olhoD:{ d:'M230 196 h18 v16 h-18 z', cheio:true },
    sob:'', boca:'M170 240 Q 200 268, 230 240', extra:'' },
  simulador: { nome:'🛒 Simulador', quando:'"vale comprar agora ou esperar?"', cor:'#facc15', modo:'lento', grupo:'jf2',
    acc:['balanca','calculadora','calendario'], corpo:'rotate(-2deg)',
    olhoE:{ d:'M156 190 h16 v18 h-16 z', cheio:true }, olhoD:{ d:'M236 190 h16 v18 h-16 z', cheio:true },
    sob:'M150 178 Q 163 172, 176 178 M226 174 L 252 168', boca:'M182 250 q 9 -6 18 0 t 18 0', extra:'' },
  auditor:   { nome:'✂️ Auditor', quando:'assinaturas comendo o orçamento', cor:'#fb7185', modo:'lento', grupo:'gemini2',
    acc:['tesoura','carimbo','meialua'], corpo:'rotate(-3deg)',
    olhoE:{ d:'M150 200 h22 v8 h-22 z', cheio:true }, olhoD:{ d:'M228 200 h22 v8 h-22 z', cheio:true },
    sob:'M146 186 L 174 190 M226 184 L 254 178', boca:'M184 254 h30', extra:'' },
  cobrador:  { nome:'🧾 Cobrador', quando:'conta rachada, falta receber', cor:'#a3e635', modo:'calmo', grupo:'gemini2',
    acc:['prancheta','boneCobrador','caneta'], corpo:'rotate(3deg)',
    olhoE:{ d:'M150 194 h22 v20 h-22 z', cheio:true }, olhoD:{ d:'M228 194 h22 v20 h-22 z', cheio:true },
    sob:'M146 182 h26 M226 178 L 254 172', boca:'M178 248 Q 204 258, 226 242', extra:'' },
  calmo:     { nome:'😌 Calmo', quando:'tudo tranquilo, mês bom', cor:'#7dd3fc', modo:'lento', grupo:'humor',
    acc:['bochechas'], corpo:'rotate(-3deg)',
    olhoE:{ d:'M151 196 h20 v20 h-20 z', cheio:true }, olhoD:{ d:'M229 196 h20 v20 h-20 z', cheio:true },
    sob:'M148 182 Q 161 178, 174 182 M226 182 Q 239 178, 252 182', boca:'M180 246 Q 200 258, 220 246', extra:'' },
  surpreso:  { nome:'😲 Surpreso', quando:'você evoluiu, seguiu as dicas', cor:'#f0abfc', modo:'festa', grupo:'reacoes',
    acc:['espanto'], corpo:'translateY(-4px)', anim:'pulo',
    olhoE:{ d:'M148 202 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0', cheio:true }, olhoD:{ d:'M226 202 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0', cheio:true },
    sob:'M144 176 Q 161 164, 178 174 M222 174 Q 239 164, 256 176', boca:'M188 252 a 12 14 0 1 0 24 0 a 12 14 0 1 0 -24 0 Z', extra:'!!' },
  confiante: { nome:'😎 Confiante', quando:'mês bem melhor que o passado', cor:'#2ee6a8', modo:'anel', grupo:'reacoes',
    acc:['evolucao','brilhoOlho'], corpo:'translateY(-8px) rotate(4deg) scale(1.03)',
    olhoE:{ d:'M150 200 h22 v14 h-22 z', cheio:true }, olhoD:{ d:'M228 196 h22 v18 h-22 z', cheio:true },
    sob:'M146 186 L 174 188 M226 178 Q 240 170, 254 176', boca:'M174 244 Q 204 262, 230 238', extra:'' },
  vermelho:  { nome:'🟥 Cartão vermelho', quando:'2 cartões ou mais perto do limite', cor:'#ff2d4b', modo:'agitado', grupo:'reacoes',
    acc:['cartaoVermelho','fumaca','apitoVermelho'], corpo:'rotate(-3deg) scale(1.05)', treme:true, anim:'apitando',
    olhoE:{ d:'M148 190 L 176 202 V 216 H 148 Z', cheio:true }, olhoD:{ d:'M252 190 L 224 202 V 216 H 252 Z', cheio:true },
    sob:'M144 178 L 178 192 M256 178 L 222 192', boca:'M172 262 Q 200 238, 228 262', extra:'' },
  treinador: { nome:'🏋️ Treinador', quando:'ofensiva: dias seguidos anotando', cor:'#f97316', modo:'agitado', grupo:'gemini2',
    acc:['chama','faixa','apito'], corpo:'translateY(-6px) rotate(-4deg)', anim:'ri',
    olhoE:{ d:'M150 190 h22 v20 h-22 z', cheio:true }, olhoD:{ d:'M228 190 h22 v20 h-22 z', cheio:true },
    sob:'', boca:'M176 250 Q 190 256, 204 250', extra:'' },
  vovo:      { nome:'👴 Vovô', quando:'inflação, comparar com o ano passado', cor:'#f5d0a9', modo:'lento', grupo:'gemini2',
    acc:['bengala','sobrancelhoes','bigodao','oculos'], corpo:'translateY(8px) rotate(-3deg)', anim:'balanca',
    olhoE:{ d:'M150 204 Q 161 196, 172 204', cheio:false }, olhoD:{ d:'M230 204 Q 241 196, 252 204', cheio:false },
    sob:'', boca:'', extra:'' },
});

const ANIM_CORPO = ['nega', 'ri', 'levita', 'cambaleia', 'varre', 'respira', 'balanca', 'encolhe', 'trocaOlho', 'apitando', 'pulo'];
const ANIM_ACC = Object.freeze({
  cofrinho:'balanca', cartao:'vaivem', cartaoVermelho:'vaivem', meialua:'sobe', oculos:'sobe', oculosEscuros:'sobe', bengala:'bate',
  maleta:'balanca', lingua:'lingua', prancheta:'balanca', apito:'balanca', seta:'sobe', lousa:'pulsa', lotus:'pulsa', carimbo:'bate',
  alvo:'pulsa', calendario:'balanca', cartola:'sobe', chapeuPraia:'balanca', touca:'balanca', corado:'pulsa', sobrancelhoes:'sobe',
  bigodao:'bigode', bigode:'bigode', chapeu:'balanca', coroa:'balanca', gravata:'balanca', terno:'sobe', tesoura:'balanca',
  boneCobrador:'sobe', faixa:'sobe', viseira:'sobe', chapeuDetetive:'balanca', turbante:'sobe', nariz:'pulsa', microfone:'balanca',
  medidor:'balanca', evolucao:'sobe', capelo:'balanca', bochechas:'pulsa', monoculo:'balanca', bilhete:'balanca', olheiras:'pulsa',
});

const SVG = `<g class="av-particulas"></g>
<g class="av-flutua"><g class="av-forma">
<g class="acc" data-acc="asas">
<path class="av-asaE asa neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round"
d="M104 196 C 72 160, 34 168, 40 198 C 44 222, 72 232, 104 226 C 86 218, 74 210, 104 210 Z"/>
<path class="av-asaD asa neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round"
d="M296 196 C 328 160, 366 168, 360 198 C 356 222, 328 232, 296 226 C 314 218, 326 210, 296 210 Z"/>
</g>
<g class="acc" data-acc="aureola"><ellipse class="av-aureola neon" cx="200" cy="108" rx="48" ry="10" fill="none" stroke-width="5"/></g>
<g class="acc" data-acc="chifres">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M132 140 L122 96 L158 134 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M242 134 L262 104 L276 112 L268 140 Z"/>
<circle class="av-faisca neon" cx="279" cy="100" r="4" stroke-width="2" fill="none"/>
</g>
<g class="acc" data-acc="rabo">
<path class="neon" fill="none" stroke-width="5" stroke-linecap="round" d="M262 282 C 300 320, 250 345, 292 362"/>
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M284 352 L306 366 L282 374 Z"/>
</g>
<g class="acc" data-acc="coroa">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" transform="rotate(-9 200 120)"
d="M162 140 L166 100 L184 120 L200 92 L216 120 L234 100 L238 140 Z"/>
<circle class="neon" cx="200" cy="124" r="4" fill="none" stroke-width="2" transform="rotate(-9 200 120)"/>
</g>
<g class="acc" data-acc="gravata">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M200 298 L174 284 L174 312 Z M200 298 L226 284 L226 312 Z"/>
<circle class="neon" cx="200" cy="298" r="5" fill="#0f1320" stroke-width="3"/>
</g>
<g class="acc" data-acc="chapeu">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" transform="rotate(12 200 120)" d="M176 140 L200 78 L224 140 Z"/>
<path class="neon" fill="none" stroke-width="3" transform="rotate(12 200 120)" d="M186 116 L214 116 M193 98 L207 98"/>
<circle class="neon" cx="213" cy="76" r="7" fill="none" stroke-width="3"/>
</g>
<g class="acc" data-acc="lampada">
<path class="neon" fill="none" stroke-width="4" stroke-linecap="round" d="M200 136 L200 116"/>
<circle class="av-lampada-luz neon" cx="200" cy="100" r="13" fill="none" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" d="M194 113 h12"/>
</g>
<g class="acc" data-acc="nuvem">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round"
d="M150 96 C 136 96, 132 76, 148 72 C 150 56, 174 52, 182 66 C 192 50, 222 54, 222 74 C 240 72, 248 96, 230 96 Z"/>
<path class="gota neon" stroke-width="3" stroke-linecap="round" d="M166 104 v8"/>
<path class="gota neon" stroke-width="3" stroke-linecap="round" d="M190 104 v8" style="animation-delay:.35s"/>
<path class="gota neon" stroke-width="3" stroke-linecap="round" d="M214 104 v8" style="animation-delay:.7s"/>
</g>
<g class="acc" data-acc="sirene">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M178 136 Q 178 104, 200 104 Q 222 104, 222 136 Z"/>
<g class="av-raios"><path class="neon" fill="none" stroke-width="4" stroke-linecap="round" d="M160 104 l-14 -8 M240 104 l14 -8 M200 92 v-14"/></g>
</g>
<g class="acc" data-acc="lousa">
<rect class="neon" x="312" y="146" width="62" height="50" rx="6" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M320 186 L334 174 L346 180 L364 158 M356 158 h8 v8"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M292 248 L320 200"/>
</g>
<g class="acc" data-acc="coracao"><path class="av-coracao neon" stroke-width="3" d="M318 150 C 292 132, 300 108, 318 120 C 336 108, 344 132, 318 150 Z"/></g>
<g class="acc" data-acc="cartao">
<rect x="308" y="140" width="42" height="58" rx="6" fill="#ffd400" stroke="#ffd400" stroke-width="3" filter="url(#av-brilho)" transform="rotate(14 329 169)"/>
<path class="neon" fill="none" stroke-width="5" stroke-linecap="round" d="M292 236 Q 312 220, 318 196"/>
</g>
<g class="acc" data-acc="despertador">
<g class="av-despertador">
<circle class="neon" cx="200" cy="100" r="20" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="4" stroke-linecap="round" d="M176 88 a 12 12 0 0 1 14 -14 M224 88 a 12 12 0 0 0 -14 -14"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M200 100 v-11 M200 100 h8 M186 118 l-6 9 M214 118 l6 9"/>
</g>
</g>
<g class="acc" data-acc="cofrinho">
<circle class="av-moeda neon" cx="338" cy="214" r="8" fill="#0f1320" stroke-width="3"/>
<ellipse class="neon" cx="340" cy="262" rx="30" ry="21" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M326 246 l4 -12 l10 9"/>
<rect class="neon" x="368" y="255" width="9" height="13" rx="3" fill="#0f1320" stroke-width="3"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M330 242 h16 M326 280 v8 M352 280 v8"/>
<circle cx="356" cy="256" r="2.5" fill="var(--cor)"/>
</g>
<g class="acc" data-acc="fedor">
<path class="fedor neon" fill="none" stroke-width="3" stroke-linecap="round" d="M118 150 q 7 -8 0 -16 t 0 -16"/>
<path class="fedor neon" fill="none" stroke-width="3" stroke-linecap="round" d="M96 166 q 7 -8 0 -16 t 0 -16" style="animation-delay:.5s"/>
<path class="fedor neon" fill="none" stroke-width="3" stroke-linecap="round" d="M140 134 q 7 -8 0 -16 t 0 -16" style="animation-delay:1s"/>
</g>
<g class="acc" data-acc="alvo">
<circle class="neon" cx="344" cy="166" r="26" fill="#0f1320" stroke-width="4"/>
<circle class="neon" cx="344" cy="166" r="15" fill="none" stroke-width="3"/>
<circle cx="344" cy="166" r="5" fill="var(--cor)"/>
<path class="av-flecha neon" fill="none" stroke-width="4" stroke-linecap="round" d="M300 214 L 340 170 M300 214 l -4 -12 M300 214 l 12 -2"/>
</g>
<g class="acc" data-acc="bilhete">
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" transform="rotate(-8 74 232)" d="M44 200 h58 v52 l -12 12 h -46 z M102 252 h -12 v 12"/>
<text x="73" y="222" text-anchor="middle" font-size="11" font-weight="900" fill="var(--cor)" transform="rotate(-8 74 232)">DICA</text>
<text x="73" y="242" text-anchor="middle" font-size="13" font-weight="900" fill="var(--cor)" transform="rotate(-8 74 232)">+R$210</text>
<path class="neon" fill="none" stroke-width="2" stroke-linecap="round" transform="rotate(-8 74 232)" d="M54 252 h30"/>
</g>
<g class="acc" data-acc="microfone"><g class="av-microfone">
<path class="neon" fill="none" stroke-width="7" stroke-linecap="round" d="M80 228 L 100 266"/>
<circle class="neon" cx="72" cy="212" r="16" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="2" d="M60 206 h24 M58 214 h28 M62 222 h20"/>
</g></g>
<g class="acc" data-acc="maleta">
<path class="neon" fill="none" stroke-width="4" stroke-linejoin="round" d="M330 238 v-10 h24 v10"/>
<rect class="neon" x="314" y="238" width="56" height="40" rx="7" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" d="M314 254 h56 M338 250 h8 v8 h-8 z"/>
</g>
<g class="acc" data-acc="seta">
<path class="av-seta neon" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M304 262 L 326 230 L 342 242 L 370 196 M356 194 h16 v16"/>
</g>
<g class="acc" data-acc="medidor">
<path class="neon" fill="#0f1320" stroke-width="4" d="M302 200 A 40 40 0 0 1 382 200 Z"/>
<path fill="none" stroke="#ff3b5c" stroke-width="6" stroke-linecap="round" filter="url(#av-brilho)" d="M370 174 A 40 40 0 0 1 378 192"/>
<path class="av-ponteiro neon" fill="none" stroke-width="4" stroke-linecap="round" d="M342 198 L 372 180"/>
<text x="342" y="222" text-anchor="middle" font-size="14" font-weight="800" fill="var(--cor)">94%</text>
</g>
<g class="acc" data-acc="calculadora">
<g class="av-fitaSobe"><rect class="neon" x="56" y="150" width="24" height="64" rx="3" fill="#0f1320" stroke-width="3"/>
<path class="av-fita neon" fill="none" stroke-width="2" stroke-dasharray="10 6" d="M62 160 h12 M62 172 h12 M62 184 h12 M62 196 h12 M62 208 h12"/></g>
<rect class="neon" x="48" y="212" width="40" height="56" rx="7" fill="#0f1320" stroke-width="4"/>
<rect class="neon" x="55" y="219" width="26" height="11" rx="2" fill="none" stroke-width="2"/>
<rect class="tecla" x="54" y="236" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:0.00s"/><rect class="tecla" x="64" y="236" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:0.37s"/><rect class="tecla" x="74" y="236" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:0.74s"/><rect class="tecla" x="54" y="246" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:1.11s"/><rect class="tecla" x="64" y="246" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:1.48s"/><rect class="tecla" x="74" y="246" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:1.85s"/><rect class="tecla" x="54" y="256" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:0.32s"/><rect class="tecla" x="64" y="256" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:0.69s"/><rect class="tecla" x="74" y="256" width="8" height="6" rx="1.5" fill="var(--cor)" style="animation-delay:1.06s"/>
</g>
<g class="acc" data-acc="cartoes"><g class="av-leque">
<rect class="neon" x="314" y="200" width="54" height="34" rx="6" fill="#0f1320" stroke-width="3" transform="rotate(-24 330 240)"/>
<rect class="neon" x="314" y="200" width="54" height="34" rx="6" fill="#0f1320" stroke-width="3" transform="rotate(-8 330 240)"/>
<rect class="neon" x="314" y="200" width="54" height="34" rx="6" fill="#0f1320" stroke-width="3" transform="rotate(8 330 240)"/>
<rect class="neon" x="314" y="200" width="54" height="34" rx="6" fill="#0f1320" stroke-width="3" transform="rotate(24 330 240)"/>
<path class="neon" fill="none" stroke-width="3" transform="rotate(24 330 240)" d="M314 210 h54 M322 224 h12"/>
</g></g>
<g class="acc" data-acc="praia">
<g class="av-sol"><circle class="neon" cx="70" cy="96" r="16" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M70 68 v-8 M70 124 v8 M42 96 h-8 M98 96 h8 M50 76 l-6 -6 M90 116 l6 6 M50 116 l-6 6 M90 76 l6 -6"/></g>
<circle class="neon" cx="340" cy="262" r="24" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M322 250 q 18 -8 36 0 M348 244 L 366 202 h 10"/>
<circle cx="332" cy="252" r="3" fill="var(--cor)"/>
</g>
<g class="acc" data-acc="tesoura"><g class="av-tesoura">
<path class="neon" fill="none" stroke-width="5" stroke-linecap="round" d="M322 232 L 372 194 M322 198 L 372 236"/>
<circle class="neon" cx="314" cy="240" r="9" fill="#0f1320" stroke-width="4"/>
<circle class="neon" cx="314" cy="190" r="9" fill="#0f1320" stroke-width="4"/>
</g></g>
<g class="acc" data-acc="carimbo">
<circle class="neon" cx="74" cy="196" r="10" fill="#0f1320" stroke-width="4"/>
<rect class="neon" x="68" y="206" width="12" height="22" fill="#0f1320" stroke-width="3"/>
<rect x="52" y="228" width="44" height="14" rx="3" fill="#ff3b5c" stroke="#ff3b5c" filter="url(#av-brilho)"/>
<text x="74" y="270" text-anchor="middle" font-size="13" font-weight="900" fill="#ff3b5c" transform="rotate(-10 74 266)">CORTA</text>
</g>
<g class="acc" data-acc="prancheta">
<rect class="neon" x="46" y="168" width="58" height="80" rx="7" fill="#0f1320" stroke-width="4"/>
<rect class="neon" x="62" y="162" width="26" height="12" rx="3" fill="#0f1320" stroke-width="3"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M56 194 l 6 6 l 10 -12 M78 196 h18 M56 218 l 6 6 l 10 -12 M78 220 h18 M78 238 h18"/>
</g>
<g class="acc" data-acc="chama"><g class="av-chama">
<path fill="#ff8a3d" stroke="#ffb020" stroke-width="3" stroke-linejoin="round" filter="url(#av-brilho)" d="M76 160 C 52 134, 74 112, 74 88 C 96 104, 110 124, 102 160 Z"/>
<text x="89" y="152" text-anchor="middle" font-size="24" font-weight="900" fill="#0f1320">5</text>
</g></g>
<g class="acc" data-acc="bengala">
<path class="neon" fill="none" stroke-width="7" stroke-linecap="round" d="M74 304 V 214 Q 74 190, 96 190 Q 114 190, 114 206"/>
</g>
<g class="acc" data-acc="calendario">
<rect class="neon" x="312" y="196" width="58" height="56" rx="8" fill="#0f1320" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="4" d="M312 212 h58 M326 190 v12 M356 190 v12"/>
<text x="341" y="236" text-anchor="middle" font-size="17" font-weight="900" fill="var(--cor)">27/11</text>
<text x="341" y="248" text-anchor="middle" font-size="8" font-weight="800" fill="var(--cor)">BLACK FRIDAY</text>
</g>
<g class="acc" data-acc="cartaoVermelho">
<rect x="306" y="136" width="44" height="62" rx="6" fill="#ff2d4b" stroke="#ff2d4b" stroke-width="3" filter="url(#av-brilho)" transform="rotate(12 328 167)"/>
<path class="neon" fill="none" stroke-width="5" stroke-linecap="round" d="M292 236 Q 312 220, 316 194"/>
</g>
<g class="acc" data-acc="evolucao">
<rect class="neon" x="306" y="200" width="66" height="62" rx="8" fill="#0f1320" stroke-width="3"/>
<rect x="318" y="232" width="14" height="22" rx="2" fill="var(--cor)" opacity=".45"/>
<rect class="cresce" x="344" y="212" width="14" height="42" rx="2" fill="var(--cor)"/>
<text x="339" y="225" text-anchor="middle" font-size="11" font-weight="900" fill="var(--cor)">↑</text>
</g>
<g class="acc" data-acc="fumaca">
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M118 150 q -8 -7 0 -14 q 8 -7 0 -14" style="animation-delay:0s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M282 150 q 8 -7 0 -14 q -8 -7 0 -14" style="animation-delay:0.3s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M104 180 q -8 -7 0 -14 q 8 -7 0 -14" style="animation-delay:0.6s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M296 180 q 8 -7 0 -14 q -8 -7 0 -14" style="animation-delay:0.9s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M150 128 q -8 -7 0 -14 q 8 -7 0 -14" style="animation-delay:0.45s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M250 128 q 8 -7 0 -14 q -8 -7 0 -14" style="animation-delay:0.75s"/>
<path class="fumo neon" fill="none" stroke-width="4" stroke-linecap="round" d="M200 120 q 8 -7 0 -14 q -8 -7 0 -14" style="animation-delay:1.05s"/>
</g>
<rect class="neon" x="100" y="135" width="200" height="150" rx="34" fill="#0f1320" stroke-width="5"/>
<rect x="114" y="149" width="172" height="122" rx="24" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="2"/>
<g class="acc" data-acc="capelo">
<g transform="rotate(-6 200 120)">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M172 126 v14 q28 12 56 0 v-14"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M146 120 L200 98 L254 120 L200 142 Z"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M200 120 L246 124 L248 150"/>
<rect class="neon" x="243" y="150" width="10" height="12" rx="2" fill="none" stroke-width="3"/>
</g>
</g>
<g class="acc" data-acc="cachecol">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M112 274 Q 200 300, 288 274 L 290 290 Q 200 318, 110 290 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M244 294 L 252 336 L 270 332 L 262 290"/>
<path class="neon" fill="none" stroke-width="2" d="M150 286 v10 M180 292 v10 M210 294 v10 M240 290 v10"/>
</g>
<g class="acc" data-acc="terno">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M128 282 L 112 344 H 288 L 272 282 Z"/>
<path class="neon" fill="none" stroke-width="3" stroke-linejoin="round" d="M162 284 L 200 330 L 238 284"/>
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M200 290 l -8 9 l 8 30 l 8 -30 z"/>
<circle class="neon" cx="200" cy="338" r="2.5" fill="var(--cor)" stroke-width="1"/>
</g>
<g class="acc" data-acc="suor"><path class="av-suor" fill="#9fd8ff" stroke="#9fd8ff" stroke-width="2" filter="url(#av-brilho)" d="M276 158 q -9 13 0 18 q 9 -5 0 -18"/></g>
<g class="acc" data-acc="pupilas"><g class="av-pupilas">
<circle cx="161" cy="202" r="3.5" fill="var(--cor)"/><circle cx="239" cy="202" r="3.5" fill="var(--cor)"/>
</g></g>
<g class="acc" data-acc="lingua"><path fill="#ff8fb3" stroke="#ff8fb3" stroke-width="2" d="M208 250 q 2 18 14 12 q 5 -6 -2 -14 z"/></g>
<g class="acc" data-acc="bone">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M140 142 Q 142 102, 200 102 Q 258 102, 260 142 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M142 138 L 100 128 Q 94 140, 104 146 L 142 146 Z"/>
<circle class="neon" cx="200" cy="104" r="4" fill="var(--cor)" stroke-width="1"/>
</g>
<g class="acc" data-acc="meialua">
<path class="neon" fill="none" stroke-width="3" stroke-linejoin="round" d="M142 208 h38 v4 q 0 14 -19 14 q -19 0 -19 -14 z M220 208 h38 v4 q 0 14 -19 14 q -19 0 -19 -14 z M180 210 h40"/>
</g>
<g class="acc" data-acc="turbante">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M136 142 Q 128 96, 200 90 Q 272 96, 264 142 Z"/>
<path class="neon" fill="none" stroke-width="3" d="M144 126 Q 200 102, 256 126 M150 110 Q 200 134, 250 110"/>
<circle class="neon" cx="200" cy="114" r="7" fill="var(--cor)" stroke-width="2"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M200 107 Q 208 84, 222 80"/>
</g>
<g class="acc" data-acc="bola">
<circle class="av-bola neon" cx="200" cy="320" r="26" fill="color-mix(in srgb, var(--cor) 18%, #0f1320)" stroke-width="4"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M188 318 q 12 -12 24 0 M194 326 q 6 6 12 0"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M178 342 h44 l -6 12 h -32 z"/>
</g>
<g class="acc" data-acc="lotus">
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M200 140 Q 168 130, 162 102 Q 190 106, 200 140 Z M200 140 Q 232 130, 238 102 Q 210 106, 200 140 Z"/>
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M200 140 Q 186 112, 200 86 Q 214 112, 200 140 Z"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M166 140 Q 200 150, 234 140"/>
</g>
<g class="acc" data-acc="chapeuDetetive">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M150 140 Q 152 98, 200 102 Q 248 98, 250 140 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M120 142 Q 200 126, 280 142 Q 200 154, 120 142 Z"/>
<path class="neon" fill="none" stroke-width="3" d="M152 130 Q 200 120, 248 130"/>
</g>
<g class="acc" data-acc="curto">
<path class="neon" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M232 136 L 240 116 L 230 108 L 242 94"/>
<path class="av-curto" fill="none" stroke="#ffe27a" stroke-width="3" stroke-linecap="round" filter="url(#av-brilho)" d="M246 90 l 10 -6 M244 98 l 12 2 M238 88 l 2 -10"/>
<g transform="rotate(32 286 156)">
<rect x="266" y="150" width="40" height="13" rx="6" fill="#f2c9a0" stroke="#f2c9a0"/>
<rect x="280" y="150" width="12" height="13" fill="#e3b48a"/>
</g>
</g>
<g class="acc" data-acc="olheiras">
<path fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round" filter="url(#av-brilho)" d="M146 224 Q 161 232, 176 224 M224 224 Q 239 232, 254 224"/>
</g>
<g class="acc" data-acc="tontura">
<path class="tont neon" fill="var(--cor)" stroke-width="1" d="M0 -8 L2.4 -2.4 L8 -2.4 L3.4 1.2 L5 7.4 L0 3.6 L-5 7.4 L-3.4 1.2 L-8 -2.4 L-2.4 -2.4 Z"/>
<path class="tont neon" fill="var(--cor)" stroke-width="1" d="M0 -8 L2.4 -2.4 L8 -2.4 L3.4 1.2 L5 7.4 L0 3.6 L-5 7.4 L-3.4 1.2 L-8 -2.4 L-2.4 -2.4 Z"/>
<path class="tont neon" fill="var(--cor)" stroke-width="1" d="M0 -8 L2.4 -2.4 L8 -2.4 L3.4 1.2 L5 7.4 L0 3.6 L-5 7.4 L-3.4 1.2 L-8 -2.4 L-2.4 -2.4 Z"/>
</g>
<g class="acc" data-acc="gps">
<g class="av-pino">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M200 64 c -14 0 -22 10 -22 22 c 0 16 22 38 22 38 s 22 -22 22 -38 c 0 -12 -8 -22 -22 -22 z"/>
<circle class="neon" cx="200" cy="86" r="7" fill="var(--cor)" stroke-width="2"/>
</g>
<path class="av-rota neon" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 10" d="M56 360 C 110 320, 160 380, 214 346 S 312 318, 344 344"/>
<path class="neon" fill="#0f1320" stroke-width="3" stroke-linejoin="round" d="M344 344 V 312 L 368 320 L 344 328"/>
</g>
<g class="acc" data-acc="touca">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M142 144 Q 160 98, 214 96 Q 262 98, 300 150 Q 270 128, 246 128 Q 210 126, 176 146 Z"/>
<path class="neon" fill="none" stroke-width="5" stroke-linecap="round" d="M140 146 Q 200 128, 262 140"/>
<circle class="neon" cx="302" cy="156" r="9" fill="#0f1320" stroke-width="3"/>
</g>
<g class="acc" data-acc="cartola">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M164 136 V 76 H 236 V 136 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M138 140 Q 200 128, 262 140 Q 200 150, 138 140 Z"/>
<path class="neon" fill="none" stroke-width="4" d="M164 122 H 236"/>
</g>
<g class="acc" data-acc="chapeuPraia">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M90 146 Q 200 116, 310 146 Q 200 160, 90 146 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M156 138 Q 160 100, 200 100 Q 240 100, 244 138 Z"/>
<path fill="none" stroke="#ff8fb3" stroke-width="5" filter="url(#av-brilho)" d="M158 130 Q 200 122, 242 130"/>
</g>
<g class="acc" data-acc="boneCobrador">
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M146 142 Q 148 106, 200 104 Q 252 106, 254 142 Z"/>
<path class="neon" fill="#0f1320" stroke-width="4" stroke-linejoin="round" d="M140 140 Q 200 154, 260 140 L 268 150 Q 200 168, 132 150 Z"/>
<circle class="neon" cx="200" cy="124" r="7" fill="var(--cor)" stroke-width="2"/>
</g>
<g class="acc" data-acc="caneta"><g class="av-caneta">
<path class="neon" fill="none" stroke-width="7" stroke-linecap="round" d="M266 118 L 304 86"/>
<path fill="#fff" d="M262 122 l -6 6 l 9 -2 z"/>
</g></g>
<g class="acc" data-acc="faixa">
<path fill="#ff4d5e" stroke="#ff4d5e" stroke-width="2" filter="url(#av-brilho)" d="M104 164 Q 200 146, 296 164 L 296 178 Q 200 160, 104 178 Z"/>
<path fill="#ff4d5e" stroke="#ff4d5e" stroke-width="2" d="M294 166 l 22 -6 l -4 10 l 8 6 l -24 2 z"/>
</g>
<g class="acc" data-acc="sobrancelhoes">
<path fill="#f8fafc" stroke="#f8fafc" stroke-width="2" stroke-linejoin="round" d="M138 176 Q 160 160, 182 172 Q 160 170, 140 184 Z M262 176 Q 240 160, 218 172 Q 240 170, 260 184 Z"/>
</g>
<g class="acc" data-acc="balanca">
<path class="neon" fill="none" stroke-width="4" stroke-linecap="round" d="M200 136 V 76"/>
<path class="neon" fill="#0f1320" stroke-width="3" d="M188 136 h24"/>
<path class="av-trave neon" fill="none" stroke-width="4" stroke-linecap="round" d="M146 78 H 254"/>
<g class="av-pratoE"><path class="neon" fill="none" stroke-width="2" d="M0 0 l -12 26 M0 0 l 12 26"/>
<path class="neon" fill="#0f1320" stroke-width="3" d="M-18 26 h36 q -2 12 -18 12 q -16 0 -18 -12 z"/>
<text x="0" y="20" text-anchor="middle" font-size="9" font-weight="900" fill="var(--cor)">AGORA</text></g>
<g class="av-pratoD"><path class="neon" fill="none" stroke-width="2" d="M0 0 l -12 26 M0 0 l 12 26"/>
<path class="neon" fill="#0f1320" stroke-width="3" d="M-18 26 h36 q -2 12 -18 12 q -16 0 -18 -12 z"/>
<text x="0" y="20" text-anchor="middle" font-size="9" font-weight="900" fill="var(--cor)">ESPERAR</text></g>
<g class="av-moedasBal"></g>
<circle class="neon" cx="200" cy="76" r="5" fill="var(--cor)" stroke-width="1"/>
</g>
<g class="acc" data-acc="oculos">
<circle class="neon" cx="161" cy="198" r="21" fill="none" stroke-width="3"/>
<circle class="neon" cx="241" cy="198" r="21" fill="none" stroke-width="3"/>
<path class="neon" fill="none" stroke-width="3" d="M182 196 Q 201 188, 220 196"/>
</g>
<g class="acc" data-acc="monoculo">
<circle class="neon" cx="239" cy="206" r="21" fill="none" stroke-width="3"/>
<path class="neon" fill="none" stroke-width="2" d="M258 216 Q 272 248, 262 282"/>
</g>
<g class="acc" data-acc="bochechas">
<ellipse cx="144" cy="236" rx="12" ry="6" fill="#ff8fb3" opacity=".55"/>
<ellipse cx="256" cy="236" rx="12" ry="6" fill="#ff8fb3" opacity=".55"/>
</g>
<g class="acc" data-acc="lagrima"><path class="av-lagrima neon" fill="none" stroke-width="3" d="M156 222 q -6 10 0 13 q 6 -3 0 -13"/></g>
<g class="av-rosto">
<g class="av-olhar"><g class="av-olhos">
<path class="av-olhoE neon" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path class="av-olhoD neon" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</g></g>
<path class="av-sobrancelhas neon" fill="none" stroke-width="4" stroke-linecap="round"/>
<path class="av-boca neon" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<text class="av-extra" x="200" y="128" text-anchor="middle" font-size="34" font-weight="800" fill="var(--cor)" filter="url(#av-brilho)"></text>
</g>
<g class="acc" data-acc="oculosEscuros">
<rect class="neon" x="140" y="186" width="44" height="30" rx="9" fill="#05070c" stroke-width="3"/>
<rect class="neon" x="216" y="186" width="44" height="30" rx="9" fill="#05070c" stroke-width="3"/>
<path class="neon" fill="none" stroke-width="3" d="M184 196 Q 200 190, 216 196 M140 194 L 118 186 M260 194 L 282 186"/>
<path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" d="M150 194 l 8 -4 M226 194 l 8 -4"/>
</g>
<g class="acc" data-acc="lupa"><g class="av-lupa">
<circle class="neon" cx="241" cy="202" r="24" fill="color-mix(in srgb, var(--cor) 12%, transparent)" stroke-width="5"/>
<path class="neon" fill="none" stroke-width="7" stroke-linecap="round" d="M258 220 L 284 250"/>
<path fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round" d="M228 192 q 6 -8 14 -8"/>
</g></g>
<g class="acc" data-acc="nariz"><circle class="av-nariz" cx="200" cy="226" r="10" fill="#ff3b5c" stroke="#ff3b5c" filter="url(#av-brilho)"/></g>
<g class="acc" data-acc="zzz">
<text class="z neon" x="262" y="130" font-size="18" font-weight="800" fill="var(--cor)" stroke-width="0">z</text>
<text class="z neon" x="276" y="110" font-size="24" font-weight="800" fill="var(--cor)" stroke-width="0" style="animation-delay:.7s">Z</text>
<text class="z neon" x="294" y="86" font-size="30" font-weight="800" fill="var(--cor)" stroke-width="0" style="animation-delay:1.4s">Z</text>
</g>
<g class="acc" data-acc="corado">
<ellipse cx="146" cy="234" rx="20" ry="11" fill="#ff4d7d" opacity=".55" filter="url(#av-brilho)"/>
<ellipse cx="254" cy="234" rx="20" ry="11" fill="#ff4d7d" opacity=".55" filter="url(#av-brilho)"/>
<path fill="none" stroke="#ff4d7d" stroke-width="2.5" stroke-linecap="round" d="M136 238 l6 -8 M146 238 l6 -8 M156 238 l6 -8 M244 238 l6 -8 M254 238 l6 -8 M264 238 l6 -8"/>
</g>
<g class="acc" data-acc="viseira">
<path fill="color-mix(in srgb, #4ade80 30%, transparent)" stroke="#4ade80" stroke-width="3" filter="url(#av-brilho)" d="M122 162 Q 200 126, 278 162 L 266 176 Q 200 148, 134 176 Z"/>
<path fill="none" stroke="#facc15" stroke-width="6" stroke-linecap="round" filter="url(#av-brilho)" d="M282 150 L 306 116"/>
<path fill="#ffd7a0" stroke="#ffd7a0" stroke-width="2" d="M282 150 l -2 9 l 7 -5 z"/>
</g>
<g class="acc" data-acc="bigode">
<path class="av-bigodeVivo neon" fill="var(--cor)" stroke-width="2" stroke-linejoin="round" d="M200 236 Q 186 226, 172 234 Q 162 240, 156 232 Q 160 248, 178 244 Q 192 242, 200 238 Q 208 242, 222 244 Q 240 248, 244 232 Q 238 240, 228 234 Q 214 226, 200 236 Z"/>
</g>
<g class="acc" data-acc="apito">
<rect class="neon" x="206" y="242" width="30" height="16" rx="7" fill="#0f1320" stroke-width="3"/>
<circle class="neon" cx="230" cy="250" r="4" fill="none" stroke-width="2"/>
<path class="neon" fill="none" stroke-width="2" d="M236 252 Q 262 268, 256 290"/>
</g>
<g class="acc" data-acc="bigodao">
<path fill="#f8fafc" stroke="#f8fafc" stroke-width="2" stroke-linejoin="round" filter="url(#av-brilho)" d="M200 234 Q 180 220, 160 232 Q 146 242, 140 232 Q 142 258, 168 256 Q 188 254, 200 246 Q 212 254, 232 256 Q 258 258, 260 232 Q 254 242, 240 232 Q 220 220, 200 234 Z"/>
</g>
<g class="acc" data-acc="brilhoOlho"><path class="brilhinho" fill="#fff" d="M250 186 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z"/></g>
<g class="acc" data-acc="apitoVermelho"><g class="av-apitoVai">
<rect class="neon" x="204" y="240" width="32" height="18" rx="8" fill="#0f1320" stroke-width="3"/>
<circle class="neon" cx="229" cy="249" r="4.5" fill="none" stroke-width="2"/>
<path class="neon" fill="none" stroke-width="3" stroke-linecap="round" d="M242 240 l 12 -8 M244 249 h 14 M242 258 l 12 8"/>
<text x="282" y="262" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" transform="rotate(-10 282 262)">PRIII!</text>
</g></g>
<g class="acc" data-acc="espanto">
<path class="espanto neon" fill="none" stroke-width="4" stroke-linecap="round" d="M120 128 l -14 -12 M280 128 l 14 -12 M200 110 v -18 M150 112 l -6 -16 M250 112 l 6 -16 M98 170 h -16 M302 170 h 16"/>
<path fill="#fff" d="M196 228 a 3 3 0 1 0 0.1 0 Z"/>
<circle class="brilhinho" cx="168" cy="196" r="3" fill="#fff"/><circle class="brilhinho" cx="246" cy="196" r="3" fill="#fff" style="animation-delay:.4s"/>
</g>
</g></g>`;

const NS = 'http://www.w3.org/2000/svg';
const CONFETE = ['#ffd24a', '#ff5fa2', '#3ef0ff', '#7dff8a', '#b06bff'];
const VEL = { calmo: 1, lento: 0.35, agitado: 2.6, festa: 1.8, anel: 0.6, chuva: 1, abraco: 0.25, bagunca: 3, dormindo: 0.08, parado: 0, dinheiro: 1, medo: 1.2 };
const vivos = new Set();
let laco = null;
let parar = () => false; // "menos movimento" (o app informa)

/** O app diz como saber se a pessoa quer menos movimento. */
export function configurarAvatar({ menosMovimento } = {}) {
  if (typeof menosMovimento === 'function') parar = menosMovimento;
}

function garantirFiltro() {
  if (document.getElementById('av-brilho')) return;
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
  s.style.position = 'absolute';
  s.innerHTML = '<defs><filter id="av-brilho" filterUnits="userSpaceOnUse" x="-60" y="-60" width="520" height="520"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  document.body.appendChild(s);
}

/**
 * Cria um avatar dentro de `el`. Devolve { mostrar(nome), falando(sim), forma, destruir() }.
 * tamanho: 'grande' (abertura), 'medio' (painel) ou 'pequeno' (Início, conversa): o pequeno usa menos pedacinhos
 * e um brilho só no conjunto, que pesa menos no celular.
 */
export function criarAvatar(el, { tamanho = 'pequeno', forma = 'calmo' } = {}) {
  garantirFiltro();
  el.classList.add('avatar', `avatar-${tamanho}`);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="20 40 360 340" focusable="false">${SVG}</svg>`;
  const q = nome => el.querySelector(`.av-${nome}`);
  const corpo = q('forma');
  // acessórios que se mexem sozinhos ganham um embrulho com a animação
  el.querySelectorAll('.acc').forEach((g, i) => {
    const tipo = ANIM_ACC[g.dataset.acc];
    if (!tipo) return;
    const w = document.createElementNS(NS, 'g');
    w.setAttribute('class', `mexe mexe-${tipo}`);
    w.style.animationDelay = `${(i * 0.29) % 1.3}s`;
    while (g.firstChild) w.appendChild(g.firstChild);
    g.appendChild(w);
  });
  const qtd = tamanho === 'pequeno' ? 9 : 15;
  const pedacos = Array.from({ length: qtd }, (_, i) => {
    const r = document.createElementNS(NS, 'rect');
    const t = 5 + (i % 3) * 3;
    r.setAttribute('width', t); r.setAttribute('height', t); r.setAttribute('rx', 1.5);
    r.setAttribute('fill', 'none'); r.setAttribute('stroke-width', tamanho === 'pequeno' ? 3 : 2);
    r.style.opacity = 0.35 + (i % 4) * 0.15;
    q('particulas').appendChild(r);
    return { el: r, t, ang: i * (Math.PI * 2 / qtd), raio: 140 + (i % 5) * 12, vel: 0.003 + (i % 4) * 0.0015, giro: i * 37, x: 60 + (i * 53) % 280, y: (i * 41) % 400 };
  });
  const moedas = [];
  const a = { el, atual: null, pedacos, moedas, proximaMoeda: 0, piscaEm: 0, olhaEm: 0, lado: 1 };

  function desenharRosto(f) {
    for (const lado of ['olhoE', 'olhoD']) {
      q(lado).setAttribute('d', f[lado].d);
      q(lado).style.fill = f[lado].cheio ? f.cor : 'none';
      q(lado).classList.toggle('gira', !!f.gira && !parar());
    }
    q('sobrancelhas').setAttribute('d', f.sob || 'M0 0');
    q('sobrancelhas').style.display = f.sob ? '' : 'none';
    q('boca').setAttribute('d', f.boca || 'M0 0');
    q('boca').style.display = f.boca ? '' : 'none';
    q('boca').style.fill = f.boca.endsWith('Z') ? '#0f1320' : 'none';
    q('boca').classList.toggle('oscila', !parar() && !f.bocaTreme);
    q('boca').classList.toggle('tremula', !parar() && !!f.bocaTreme);
    q('extra').textContent = f.extra;
  }

  a.mostrar = (nome, { imediato = false } = {}) => {
    const f = FORMAS[nome] || FORMAS.calmo;
    if (a.atual === nome) return;
    a.atual = FORMAS[nome] ? nome : 'calmo';
    el.style.setProperty('--cor', f.cor);
    el.dataset.forma = a.atual;
    el.querySelectorAll('.acc').forEach(g => g.classList.toggle('on', f.acc.includes(g.dataset.acc)));
    corpo.style.transform = f.corpo;
    corpo.classList.toggle('treme', !!f.treme);
    for (const x of ANIM_CORPO) corpo.classList.toggle(x, f.anim === x);
    if (imediato || parar()) desenharRosto(f);
    else { q('rosto').classList.add('troca'); setTimeout(() => { desenharRosto(f); q('rosto').classList.remove('troca'); }, 150); }
  };
  a.falando = sim => { for (const b of [q('boca'), q('bigodeVivo')]) b?.classList.toggle('falando', !!sim && !parar()); };
  a.destruir = () => { vivos.delete(a); el.innerHTML = ''; };
  a.mostrar(forma, { imediato: true });
  vivos.add(a);
  if (!laco) laco = requestAnimationFrame(quadro);
  return a;
}

// ---------- Um laço só pra todos os avatares na tela ----------
function quadro(agora) {
  laco = requestAnimationFrame(quadro);
  if (document.hidden) return;
  const quieto = parar();
  for (const a of vivos) {
    if (!a.el.isConnected) { vivos.delete(a); continue; }
    if (a.el.offsetParent === null && getComputedStyle(a.el).position !== 'fixed') continue; // não aparece: não gasta
    const f = FORMAS[a.atual] || FORMAS.calmo, modo = f.modo;
    a.el.classList.toggle('parado', quieto);
    const v = VEL[modo] ?? 1;
    const tremor = modo === 'agitado' ? 7 : modo === 'medo' ? 4 : 0;
    a.pedacos.forEach((p, i) => {
      const cor = modo === 'festa' ? CONFETE[i % CONFETE.length] : modo === 'dinheiro' ? '#4ade80' : f.cor;
      if (p.cor !== cor) { p.cor = cor; p.el.style.stroke = cor; }
      const nota = modo === 'dinheiro';
      if (p.nota !== nota) { p.nota = nota; p.el.setAttribute('width', nota ? 16 : p.t); p.el.setAttribute('height', nota ? 9 : p.t); }
      if (quieto && p.feito) return;
      p.feito = true;
      p.ang += p.vel * v; p.giro += v * 1.5;
      let x, y;
      if (modo === 'chuva' || modo === 'dinheiro') {
        p.y += 0.6 + (i % 3) * 0.3; if (p.y > 400) p.y = 20;
        x = p.x; y = p.y;
      } else {
        const raio = modo === 'medo' ? 112 + (i % 3) * 5 : modo === 'festa' ? 150 : modo === 'anel' ? 165 : modo === 'abraco' ? 118 + (i % 3) * 6 : p.raio;
        const ang = modo === 'anel' ? (i * Math.PI * 2 / a.pedacos.length) + agora / 4000 : p.ang;
        x = 200 + Math.cos(ang) * raio + (Math.random() - 0.5) * tremor;
        y = 212 + Math.sin(ang) * raio * (modo === 'anel' ? 0.35 : 0.8) + (Math.random() - 0.5) * tremor;
        p.x = x; p.y = y;
      }
      if (modo === 'bagunca') {
        if (Math.random() < 0.03) { p.bx = 40 + Math.random() * 320; p.by = 40 + Math.random() * 330; }
        if (p.bx !== undefined) { x = p.bx + (Math.random() - 0.5) * 3; y = p.by + (Math.random() - 0.5) * 3; }
      }
      p.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${modo === 'anel' ? 45 : Math.round(p.giro)})`);
    });
    if (quieto) continue;
    const q = n => a.el.querySelector(`.av-${n}`);
    // piscar e olhar em volta (com a sobrancelha acompanhando)
    if (agora > a.piscaEm) {
      a.piscaEm = agora + 2500 + Math.random() * 2500;
      if (!/Q/.test(f.olhoE.d) && !f.gira) { q('olhos').classList.add('pisca'); setTimeout(() => q('olhos')?.classList.remove('pisca'), 130); }
    }
    if (agora > a.olhaEm) {
      a.olhaEm = agora + 1400 + Math.random() * 2200;
      if (!f.gira) {
        const centro = Math.random() < 0.35;
        q('olhar').style.transform = centro ? '' : `translate(${Math.round((Math.random() - 0.5) * 10)}px,${Math.round((Math.random() - 0.5) * 5)}px)`;
        a.lado = -a.lado;
        q('sobrancelhas').style.transform = centro ? '' : `rotate(${a.lado * 5}deg) translateY(${Math.random() < 0.5 ? -2 : 0}px)`;
      }
    }
    if (a.atual === 'desnorteado') {
      const t = agora / 600;
      a.el.querySelectorAll('.tont').forEach((e, i) => {
        const ang = t + i * 2.09;
        e.setAttribute('transform', `translate(${200 + Math.cos(ang) * 62} ${112 + Math.sin(ang) * 14}) scale(${0.8 + (Math.sin(ang) + 1) * 0.25})`);
      });
    }
    if (a.atual === 'simulador') balanca(a, agora, q);
    const faisca = q('faisca');
    if (faisca) faisca.style.opacity = Math.random() < (modo === 'agitado' ? 0.5 : 0.15) ? 1 : 0.2;
  }
  if (!vivos.size) { cancelAnimationFrame(laco); laco = null; }
}

// balança do Simulador: a trave sobe e desce e a moeda cai no prato mais baixo
function balanca(a, agora, q) {
  const ang = Math.sin(agora / 900) * 0.16;
  const dx = 54 * Math.cos(ang), dy = 54 * Math.sin(ang);
  q('trave').setAttribute('transform', `rotate(${(ang * 180 / Math.PI).toFixed(2)} 200 78)`);
  const pE = { x: 200 - dx, y: 78 - dy }, pD = { x: 200 + dx, y: 78 + dy };
  q('pratoE').setAttribute('transform', `translate(${pE.x} ${pE.y})`);
  q('pratoD').setAttribute('transform', `translate(${pD.x} ${pD.y})`);
  if (agora > a.proximaMoeda) {
    a.proximaMoeda = agora + 700 + Math.random() * 500;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', '5.5'); c.setAttribute('fill', '#ffd400'); c.setAttribute('stroke', '#b8860b'); c.setAttribute('stroke-width', '1');
    q('moedasBal').appendChild(c);
    a.moedas.push({ el: c, lado: pD.y > pE.y ? 'D' : 'E', dxo: (Math.random() - 0.5) * 16, y: 20, vy: 0, parada: 0 });
  }
  for (let k = a.moedas.length - 1; k >= 0; k--) {
    const m = a.moedas[k], prato = m.lado === 'D' ? pD : pE, fundo = prato.y + 30;
    if (!m.parada) { m.vy += 0.35; m.y += m.vy; if (m.y >= fundo) { m.y = fundo; m.vy *= -0.35; if (Math.abs(m.vy) < 0.6) m.parada = agora; } }
    else m.y = fundo;
    m.el.setAttribute('cx', prato.x + m.dxo); m.el.setAttribute('cy', m.y);
    if (m.parada && agora - m.parada > 1200) { m.el.remove(); a.moedas.splice(k, 1); }
    else if (m.parada) m.el.setAttribute('opacity', String(1 - (agora - m.parada) / 1200));
  }
}
