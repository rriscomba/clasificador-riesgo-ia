// Pruebas del motor: node pruebas/motor.test.js
// Casos equivalentes a los de la calculadora Excel y del Anexo C.
const assert = require('assert');
const M = require('../js/metodologia.js');
const { evaluar } = require('../js/motor.js');

const INFO = ['publica', 'interna', 'confidencial', 'restringida'];
const HERR = ['interno', 'catalogo', 'nueva', 'publica'];

function caso({ d1, d2, d3, info, herr, ag = 1, B = [], authC = 'no', res = {}, infoRes, herrRes, s1 }) {
  const E = { perfil: 'financiero', escala: 'sectorial', p0: { 'P0.1': 'si', 'P0.2': 'no' }, A: {}, B: {}, f: {},
    info: { inh: INFO[info - 1], res: infoRes ? INFO[infoRes - 1] : null }, herr: { inh: HERR[herr - 1], res: herrRes ? HERR[herrRes - 1] : null },
    authC, authR: 'no', s1: s1 || { solicita: false, c: [] }, s2: false, s4: false, s5: false };
  M.listaA.forEach((q) => (E.A[q.id] = 'no'));
  M.perfiles.financiero.listaB.forEach((id) => (E.B[id] = { aplica: B.includes(id) ? 'si' : 'no', s3: false }));
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
console.log(`${ok}/${casos.length} casos correctos`);
process.exit(ok === casos.length ? 0 : 1);
