// Pruebas del motor: node pruebas/motor.test.js
// Casos equivalentes a los de la calculadora Excel y del Anexo C.
const assert = require('assert');
const M = require('../js/metodologia.js');
const { evaluar } = require('../js/motor.js');

const INFO = ['publica', 'interna', 'confidencial', 'restringida'];
const HERR = ['interno', 'catalogo', 'nueva', 'publica'];

function caso({ d1, d2, d3, info, herr, ag = 1, A = [], B = [], s3 = [], authC = 'no', res = {}, infoRes, herrRes, s1, sujeto = 'publica', excepcion = 'ninguna' }) {
  const E = { perfil: 'financiero', escala: 'sectorial', ambito: { sujeto, excepcion }, p0: { 'P0.1': 'si', 'P0.2': 'no' }, A: {}, B: {}, f: {},
    info: { inh: INFO[info - 1], res: infoRes ? INFO[infoRes - 1] : null }, herr: { inh: HERR[herr - 1], res: herrRes ? HERR[herrRes - 1] : null },
    authC, authR: 'no', s1: s1 || { solicita: false, c: [] }, s2: false, s4: false, s5: false };
  M.listaA.forEach((q) => (E.A[q.id] = A.includes(q.id) ? 'si' : 'no'));
  M.perfiles.financiero.listaB.forEach((id) => (E.B[id] = { aplica: B.includes(id) ? 'si' : 'no', s3: s3.includes(id) }));
  const ids = ['F1.1', 'F1.2', 'F1.3', 'F1.4', 'F1.5', 'F2.1', 'F2.2', 'F2.3', 'F2.4', 'F2.5', 'F3.3', 'F3.4', 'F3.5', 'F3.6'];
  [...d1, ...d2, ...d3].forEach((v, k) => (E.f[ids[k]] = { inh: v }));
  E.f.AG = { inh: ag };
  for (const [id, [v, r]] of Object.entries(res)) Object.assign(E.f[id], { res: v, ruta: r });
  return evaluar(E, M);
}

const casos = [
  ['C1 normativa pública, catálogo', { d1: [1, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 1, herr: 2 }, 1, 1, 'bajo'],
  ['C2 estados financieros, catálogo autorizado', { d1: [2, 2, 2, 2, 2], d2: [2, 2, 2, 2, 1], d3: [1, 2, 1, 2], info: 3, herr: 2, authC: 'si' }, 2, 2, 'moderado'],
  ['C3 alerta temprana de contrapartes', { d1: [3, 3, 3, 3, 2], d2: [2, 2, 2, 2, 1], d3: [2, 1, 1, 3], info: 3, herr: 1, ag: 2, B: ['SF1', 'SF5'] }, 3, 3, 'alto'],
  ['C4 agente de correo con medidas', { d1: [2, 3, 1, 3, 3], d2: [2, 3, 2, 3, 2], d3: [4, 3, 2, 3], info: 3, herr: 2, ag: 4, authC: 'si', res: { 'F1.4': [2, 'R6'], AG: [3, 'R4'], 'F3.3': [2, 'R4'], 'F3.4': [2, 'R7'] } }, 3, 2, 'moderado'],
  ['C5 contrato en herramienta pública → entorno interno', { d1: [2, 1, 1, 1, 1], d2: [3, 3, 2, 4, 4], d3: [1, 2, 4, 2], info: 4, herr: 4, herrRes: 1, res: { 'F2.4': [2, 'R2'], 'F2.5': [1, 'R2'], 'F3.5': [1, 'R2'] } }, 3, 2, 'moderado'],
  ['C6 priorización territorial', { d1: [3, 4, 3, 3, 2], d2: [1, 1, 1, 1, 1], d3: [2, 1, 1, 3], info: 2, herr: 1, ag: 2, B: ['SF3'] }, 3, 3, 'alto'],
  ['C7 asistente público de preguntas frecuentes', { d1: [1, 4, 1, 1, 4], d2: [1, 1, 1, 1, 1], d3: [1, 4, 1, 2], info: 1, herr: 2 }, 2, 2, 'moderado'],
  ['C8 información restringida en herramienta pública', { d1: [2, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 4, herr: 4 }, 2, 2, 'noviable'],
  ['C9 sandbox', { d1: [2, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 1, herr: 1, s1: { solicita: true, c: [true, true, true, true, true] } }, 1, 1, 'experimental'],
  ['C10 agente autónomo de bajo riesgo', { d1: [2, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 1, herr: 2, ag: 4 }, 1, 1, 'bajo'],
  ['C11 agente autónomo con efecto sobre terceros', { d1: [3, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 1, herr: 2, ag: 4 }, 1, 1, 'bajo'],
  ['C12 ruta que no aplica al factor', { d1: [2, 2, 1, 2, 2], d2: [2, 2, 2, 2, 1], d3: [3, 1, 2, 2], info: 2, herr: 2, ag: 4, res: { 'F3.3': [2, 'R3'] } }, 3, 3, 'alto']
];

let ok = 0;
for (const [nombre, entrada, inh, res, estado] of casos) {
  const R = caso(entrada);
  try {
    assert.strictEqual(R.nivelInh, inh, 'nivel inherente');
    assert.strictEqual(R.nivelRes, res, 'nivel residual');
    assert.strictEqual(R.estado, estado, 'estado');
    ok++; console.log('✓', nombre, '→', R.titulo, R.condicionado ? '(condicionado a reducir agencia)' : '');
  } catch (e) { console.log('✗', nombre, e.message, JSON.stringify({ inh: R.nivelInh, res: R.nivelRes, estado: R.estado, dim: R.dim, obs: R.observaciones })); }
}
const c11 = caso(casos[10][1]); assert.ok(c11.condicionado, 'C11 debe quedar condicionado');
const c12 = caso(casos[11][1]); assert.ok(c12.observaciones.length === 1, 'C12 debe registrar una observación');

// Clasificación regulatoria (art. 22), separada del nivel interno.
const base = { d1: [2, 1, 1, 1, 1], d2: [1, 1, 1, 1, 1], d3: [1, 1, 1, 1], info: 1, herr: 1 };
const reg = [
  ['R1 sin disparadores → riesgo aceptable', base, 'RIESGO_ACEPTABLE'],
  ['R2 criterio sectorial SF1 → nivel interno alto, jurídicamente aceptable', casos[2][1], 'RIESGO_ACEPTABLE'],
  ['R3 crédito N5 → riesgo alto, art. 24.1 g)', { ...base, B: ['N5'] }, 'RIESGO_ALTO', 'art. 24.1 g)'],
  ['R4 N5 con medidas → sigue siendo riesgo alto', { ...base, d1: [4, 1, 3, 1, 1], B: ['N5'], res: { 'F1.1': [2, 'R5'], 'F1.3': [2, 'R6'] } }, 'RIESGO_ALTO'],
  ['R5 N5 rediseñado → aceptable, por verificar', { ...base, B: ['N5'], s3: ['N5'] }, 'RIESGO_ACEPTABLE'],
  ['R6 A1 → uso indebido, art. 23.1 a)', { ...base, A: ['A1'] }, 'USO_INDEBIDO', 'art. 23.1 a)'],
  ['R7 solo AX1 → no es uso indebido del art. 23', { ...base, A: ['AX1'] }, 'RIESGO_ACEPTABLE'],
  ['R8 excepción de uso personal → fuera del ámbito', { ...base, excepcion: 'personal' }, 'FUERA_DE_AMBITO', 'art. 4 a)'],
  ['R9 sandbox con N5 → sigue siendo riesgo alto', { ...base, B: ['N5'], s1: { solicita: true, c: [true, true, true, true, true] } }, 'RIESGO_ALTO']
];
let okR = 0;
for (const [nombre, entrada, cat, art] of reg) {
  const R = caso(entrada);
  try {
    assert.strictEqual(R.regulatoria.categoria, cat, 'categoría regulatoria');
    if (art) assert.ok(R.regulatoria.baseLegal.some((b) => b.includes(art)), 'base legal ' + art);
    okR++; console.log('✓', nombre, '→', R.regulatoria.nombre, '·', R.regulatoria.baseLegal.join('; '));
  } catch (e) { console.log('✗', nombre, e.message, JSON.stringify(R.regulatoria)); }
}
const r2 = caso(reg[1][1]); assert.strictEqual(r2.nivelRes, 3, 'R2 mantiene nivel interno alto');
const r5 = caso(reg[4][1]); assert.deepStrictEqual(r5.regulatoria.redisenoPorVerificar, ['N5'], 'R5 debe quedar por verificar');
const r7 = caso(reg[6][1]); assert.strictEqual(r7.estado, 'prohibido', 'R7 la metodología no admite el caso'); assert.notStrictEqual(r7.titulo, 'Uso indebido: prohibido');
const r8 = caso(reg[7][1]); assert.strictEqual(r8.estado, 'fuera', 'R8 fuera del ámbito');
const r3 = caso(reg[2][1]); assert.ok(r3.obligaciones.some((o) => o.art === 'Art. 30' && o.estado === 'Requerida'), 'R3 exige EII del art. 30');
const priv = caso({ ...base, B: ['N5'], sujeto: 'privado' }); assert.ok(priv.obligaciones.some((o) => o.art === 'Art. 32') && !priv.obligaciones.some((o) => o.art === 'Art. 30'), 'sector privado: arts. 31-32, no 30');
const sinAmbito = caso({ ...base, sujeto: null }); assert.strictEqual(sinAmbito.estado, 'incompleto', 'sin ámbito el caso queda incompleto');

console.log(`${ok}/${casos.length} casos de nivel interno correctos · ${okR}/${reg.length} casos de clasificación regulatoria correctos`);
process.exit(ok === casos.length && okR === reg.length ? 0 : 1);
