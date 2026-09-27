/* Interfaz del Clasificador de Riesgo IA. Todo el estado vive en memoria: no usa almacenamiento del navegador ni envía respuestas. */
(function () {
  const M = window.METODOLOGIA, MOTOR = window.MOTOR, CFG = window.CLASIFICADOR_CONFIG || {};
  const EMBEBIDO = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  const PASOS = [
    { id: 'caso', n: '', t: 'Caso' }, { id: 'p0', n: '0', t: 'Ámbito y sistema de IA' }, { id: 'p1', n: '1', t: 'Descarte de usos prohibidos' },
    { id: 'p2', n: '2', t: 'Descarte de usos sensibles' }, { id: 'p3', n: '3', t: 'Información y herramienta' }, { id: 'p4', n: '4', t: 'Tres dimensiones' },
    { id: 'p5', n: '5', t: 'Agencia' }, { id: 'p6', n: '6', t: 'Situaciones especiales' }, { id: 'p7', n: '7', t: 'Ficha del agente (opcional)' }, { id: 'rep', n: '', t: 'Reporte' }
  ];

  function estadoVacio() {
    return { perfil: 'nucleo', escala: 'sectorial', caso: { nombre: '', entidad: '', area: '', responsable: '', fecha: hoy(), descripcion: '', herramienta: '' },
      ambito: { sujeto: null, excepcion: null }, grupos: {}, p0: {}, A: {}, B: {}, info: { inh: null, res: null, evidencia: '', etiqueta: '' }, herr: { inh: null, res: null, evidencia: '' }, authC: null, authR: null,
      f: {}, s1: { solicita: false, c: [false, false, false, false, false] }, s2: false, s4: false, s5: false, p03: null, acap: { senales: {} } };
  }
  function estadoEjemplo() {
    const E = estadoVacio();
    E.perfil = 'nucleo';
    E.caso = { nombre: 'Agente de atención de correos ciudadanos', entidad: 'Entidad de ejemplo', area: 'Oficina de Atención al Ciudadano', responsable: 'Jefatura de Atención al Ciudadano', fecha: hoy(),
      descripcion: 'Agente que lee los correos de ciudadanos y proveedores, registra cada caso en el sistema de atención y responde de forma automática.', herramienta: 'Asistente de IA contratado por la entidad, con conectores al correo y al sistema de atención' };
    E.p03 = 'no';
    E.ambito = { sujeto: 'publica', excepcion: 'ninguna' };
    E.p0 = { 'P0.1': 'si', 'P0.2': 'si' };
    M.listaA.forEach((q) => (E.A[q.id] = 'no'));
    M.perfiles.nucleo.listaB.forEach((id) => (E.B[id] = { aplica: 'no', s3: false }));
    E.info.inh = 'confidencial'; E.herr.inh = 'catalogo'; E.authC = 'si'; E.authR = 'no';
    const v = { 'F1.1': 2, 'F1.2': 3, 'F1.3': 1, 'F1.4': 3, 'F1.5': 3, 'F2.1': 2, 'F2.2': 3, 'F2.3': 2, 'F2.4': 3, 'F2.5': 2, 'F3.3': 4, 'F3.4': 3, 'F3.5': 2, 'F3.6': 3, AG: 4 };
    for (const [k, n] of Object.entries(v)) E.f[k] = { inh: n, ruta: null, res: null, evidencia: '' };
    Object.assign(E.f['F1.4'], { ruta: 'R6', res: 2, evidencia: 'Registro de cada acción con su explicación; reversión desde el sistema de atención' });
    Object.assign(E.f.AG, { ruta: 'R4', res: 3, evidencia: 'Las respuestas quedan como borrador y requieren aprobación del servidor a cargo' });
    Object.assign(E.f['F3.3'], { ruta: 'R4', res: 2, evidencia: 'Permiso de escritura solo como propuesta; sin envío automático' });
    Object.assign(E.f['F3.4'], { ruta: 'R7', res: 2, evidencia: 'Filtrado de contenidos de correo, aislamiento del conector y monitoreo' });
    E.acap = { mision: 'Atender consultas por correo y registrar cada caso en el sistema de atención.', limites: 'No aprueba ni rechaza solicitudes; no comparte datos fuera de la entidad.',
      conexiones: 'Correo institucional: leer y crear borradores. Sistema de atención: crear y actualizar casos como propuesta.', frontera: 'unica',
      permitidas: 'Clasificar correos; proponer respuestas y registros.', aprobacion: 'Enviar respuestas; guardar registros en el sistema de atención.', prohibidas: 'Eliminar registros; comprometer a la entidad frente a terceros.',
      apagado: true, topes: 'Máximo 300 borradores por día.', subagentes: true, registro: true, pruebas: 'Pruebas con 300 correos anonimizados y con instrucciones ocultas en documentos adjuntos.',
      senales: { deriva: true, privilegios: true, discrepancia: true }, supervisor: 'Coordinación de Atención al Ciudadano', calibracion: true, reautorizacion: '2027-03-31' };
    return E;
  }

  let E = estadoEjemplo(), esEjemplo = true, paso = 'rep', tabDim = 'D1', contado = false, R = null;

  // ---------- utilidades de estado ----------
  function parseV(v) { if (v === 'true') return true; if (v === 'false') return false; if (v === 'null' || v === '') return null; if (/^\d+$/.test(v)) return Number(v); return v; }
  function set(path, v) {
    const k = path.split('|'); let o = E;
    for (let i = 0; i < k.length - 1; i++) { if (o[k[i]] == null || typeof o[k[i]] !== 'object') o[k[i]] = {}; o = o[k[i]]; }
    o[k[k.length - 1]] = v;
    const [a, b, c] = k;
    if (a === 'f' && c === 'inh') { const d = E.f[b]; if (d.res != null && d.res >= v) { d.res = null; d.ruta = null; } }
    if (a === 'f' && c === 'ruta' && !v) { E.f[b].res = null; }
    if (a === 'f' && c === 'ruta' && v) { const d = E.f[b]; const r = M.rutas.find((x) => x.id === v); if (d.res != null && (d.res >= d.inh || (r.maxNiveles && d.inh - d.res > r.maxNiveles))) d.res = null; }
    if ((a === 'info' || a === 'herr') && b === 'inh') { E[a].res = null; }
  }
  const idx = (lista, id) => lista.findIndex((x) => x.id === id) + 1;
  const escalaDe = (f) => (f.escala === 'titulares' ? M.escalas[E.escala].titulares : f.escala);
  const nombreInfo = (id) => (M.informacion.find((x) => x.id === id) || {}).nombre || '—';
  const nombreHerr = (id) => (M.herramientas.find((x) => x.id === id) || {}).nombre || '—';

  // ---------- componentes ----------
  function sino(path, val, positivo) {
    const b = (v, t) => `<button type="button" class="${v}" data-act="set" data-k="${path}" data-v="${v}" aria-pressed="${val === v}">${t}</button>`;
    return `<div class="sino${positivo ? ' positivo' : ''}" role="group">${b('si', 'Sí')}${b('no', 'No')}</div>`;
  }
  function aplica(path, val) {
    const b = (v, t) => `<button type="button" data-act="set" data-k="${path}" data-v="${v}" aria-pressed="${val === v}">${t}</button>`;
    return `<div class="sino neutral" role="group">${b('no', 'No aplica')}${b('si', 'Aplica')}</div>`;
  }
  function sinoBool(path, val) {
    const b = (v, t, cls) => `<button type="button" class="${cls}" data-act="set" data-k="${path}" data-v="${v}" aria-pressed="${val === v}">${t}</button>`;
    return `<div class="sino positivo" role="group">${b(true, 'Sí', 'si')}${b(false, 'No', 'no')}</div>`;
  }
  function titulo(eyebrow, h, p) { return `<div class="titulo-paso"><span class="eyebrow">${eyebrow}</span><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</div>`; }
  function navPaso() {
    const i = PASOS.findIndex((p) => p.id === paso);
    const ant = PASOS[i - 1], sig = PASOS[i + 1];
    return `<div class="nav-paso">${ant ? `<button type="button" class="btn sec" data-act="ir" data-p="${ant.id}">← ${ant.t}</button>` : '<span></span>'}${sig ? `<button type="button" class="btn" data-act="ir" data-p="${sig.id}">${sig.t} →</button>` : ''}</div>`;
  }

  function tarjetaFactor(f) {
    const d = E.f[f.id] || {};
    const esc4 = escalaDe(f);
    const crit = Object.values(M.dimensiones).some((x) => x.criticos.includes(f.id));
    const rutas = M.rutas.filter((r) => r.factores.includes(f.id));
    const ruta = rutas.find((r) => r.id === d.ruta);
    const minRes = ruta && ruta.maxNiveles ? d.inh - ruta.maxNiveles : 1;
    const obs = R.factores[f.id] && R.factores[f.id].observacion;
    const opciones = esc4.map((t, k) => `<button type="button" class="opcion" data-ayuda="${f.id}:${k + 1}" data-act="set" data-k="f|${f.id}|inh" data-v="${k + 1}" aria-pressed="${d.inh === k + 1}"><span class="lv">${k + 1}</span>${esc(t)}</button>`).join('');
    let medida = '';
    if (d.inh > 1 && rutas.length) {
      const resOps = d.ruta ? esc4.map((t, k) => { const n = k + 1; const dis = n >= d.inh || n < minRes; return `<button type="button" class="opcion" data-ayuda="${f.id}:${n}" data-act="set" data-k="f|${f.id}|res" data-v="${n}" aria-pressed="${d.res === n}" ${dis ? 'disabled' : ''}><span class="lv">${n}</span>${esc(t)}</button>`; }).join('') : '';
      medida = `<details class="medida" ${d.ruta ? 'open' : ''}><summary>Aplicar una medida de reducción${d.ruta && d.res ? ` · ${esc((M.rutas.find((x) => x.id === d.ruta) || {}).nombre || '')}: ${d.inh} → ${d.res}` : ''}</summary>
        <div class="fila"><label for="ruta-${f.id}">Medida</label><select id="ruta-${f.id}" data-ayuda="ruta" data-act="sel" data-k="f|${f.id}|ruta"><option value="">Sin medida</option>${rutas.map((r) => `<option value="${r.id}" ${d.ruta === r.id ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select></div>
        ${ruta ? `<p class="nota">${esc(ruta.simple)} Evidencia esperada: ${esc(ruta.evidencia)}. Valida: ${esc(ruta.valida)}.${ruta.maxNiveles ? ' Reduce como máximo un nivel.' : ''}</p><div class="opciones">${resOps}</div>
        <label class="nota" for="ev-${f.id}">Sustento de la medida</label><input type="text" id="ev-${f.id}" data-ayuda="evidencia" data-k="f|${f.id}|evidencia" value="${esc(d.evidencia)}" placeholder="Describa la medida implementada">` : ''}
      </details>`;
    }
    return `<article class="factor"><header><span class="mono">${f.id}</span><h3 data-ayuda="${f.id}" tabindex="0">${esc(f.nombre)}</h3>${crit ? '<span class="chip critico">Crítico</span>' : ''}</header>
      <div class="opciones">${opciones}</div>${medida}${obs ? `<p class="obs">${esc(obs)}</p>` : ''}</article>`;
  }

  // ---------- pasos ----------
  const vistas = {
    caso() {
      const c = E.caso; const campo = (k, t, cls = '') => `<label class="${cls}" for="c-${k}">${t}<input type="text" id="c-${k}" data-ayuda="caso:${k}" data-k="caso|${k}" value="${esc(c[k])}"></label>`;
      return titulo('Inicio', 'Datos del caso de uso', 'Estos datos solo aparecen en el reporte que exportes. No se guardan en ningún servidor.') +
        `<div class="campos">${campo('nombre', 'Nombre del caso de uso', 'ancho')}${campo('entidad', 'Entidad')}${campo('area', 'Área dueña')}${campo('responsable', 'Responsable')}${campo('fecha', 'Fecha de evaluación')}
        <label class="ancho" for="c-descripcion">Descripción breve<textarea id="c-descripcion" data-ayuda="caso:descripcion" data-k="caso|descripcion">${esc(c.descripcion)}</textarea></label>${campo('herramienta', 'Herramienta o proveedor', 'ancho')}</div>
        <div class="bloque"><h3>Grupos que el sistema afecta especialmente</h3><p class="nota">Artículo 12 del Reglamento. Se registra en el reporte; no cambia el nivel.</p><div class="checks" data-ayuda="grupos">${M.gruposVulnerables.map((g) => `<label><input type="checkbox" data-act="chk" data-k="grupos|${g.id}" ${E.grupos && E.grupos[g.id] ? 'checked' : ''}> ${esc(g.nombre)}</label>`).join('')}</div></div>`;
    },
    p0() {
      const a = E.ambito || {};
      const opcion = (grupo, x) => `<button type="button" class="opcion" data-ayuda="ambito:${x.id}" data-act="set" data-k="ambito|${grupo}" data-v="${x.id}" aria-pressed="${a[grupo] === x.id}"><b>${esc(x.nombre)}</b>${x.base ? `<span class="lv">${esc(x.base)}</span>` : ''}</button>`;
      return titulo('Paso 0', 'Ámbito jurídico y sistema de IA', 'Primero se verifica si el Reglamento aplica al caso (artículos 3 y 4). Luego, basta un «Sí» para que el caso sea un sistema de IA; las reglas fijas, macros y automatizaciones sin componentes de IA quedan fuera.') +
        `<div class="bloque"><h3>Tipo de organización (art. 3)</h3><div class="opciones">${M.ambito.sujetos.map((x) => opcion('sujeto', x)).join('')}</div></div>
        <div class="bloque"><h3>¿Se aplica alguna excepción del art. 4?</h3><div class="opciones">${M.ambito.excepciones.map((x) => opcion('excepcion', x)).join('')}</div>${R.excepcion && R.excepcion.nota ? `<p class="nota">${esc(R.excepcion.nota)}</p>` : ''}</div>
        <div class="bloque"><h3>¿Es un sistema de IA?</h3></div>
        <div class="preguntas">${M.paso0.map((q) => `<div class="pregunta" data-ayuda="${q.id}"><span class="cod">${q.id}</span><span>${esc(q.texto)}</span>${sino('p0|' + q.id, E.p0[q.id], true)}</div>`).join('')}</div>
        <div class="bloque"><h3>Antes de seguir</h3><div class="pregunta" data-ayuda="P0.3"><span class="cod">P0.3</span><span>${esc(M.adicionalidad.texto)}<span class="base">Orientativa: no cambia la clasificación</span></span>${sino('p03', E.p03)}</div></div>`;
    },
    p1() {
      return titulo('Paso 1', 'Descarte de usos prohibidos', 'Confirme que el sistema no está destinado a ninguno de estos usos. La gran mayoría de casos no aplica a ninguno. A1 a A6 corresponden al artículo 23.1 del D.S. N.° 115-2025-PCM, que los prohíbe; los códigos AX son criterios adicionales. Ante dudas, el artículo 23.3 permite consultar a la SGTD.') +
        `<div class="preguntas">${M.listaA.map((q) => `<div class="pregunta" data-ayuda="${q.id}"><span class="cod">${q.id}</span><span>${esc(q.texto)}<span class="base">${esc(q.base || '')}</span></span>${aplica('A|' + q.id, E.A[q.id])}</div>`).join('')}</div>`;
    },
    p2() {
      const ids = M.perfiles[E.perfil].listaB;
      return titulo('Paso 2', 'Descarte de usos sensibles', 'Indique si el resultado del sistema se usa para alguna de estas decisiones, o influye significativamente en ellas (es un insumo principal, fija un valor por defecto que el decisor suele aceptar o filtra qué casos llegan a evaluarse). Si alguno aplica, el caso no se detiene: avanza con evaluación de impacto y acompañamiento del Oficial de IA. Responda según cómo se usará el sistema, no según el resultado que prefiera.') +
        `<div class="preguntas">${ids.map((id) => { const q = M.listaB[id]; const b = E.B[id] || {};
          return `<div class="pregunta" data-ayuda="${id}"><span class="cod">${id}</span><span>${esc(q.texto)}<span class="base">${esc(q.base)}</span></span>${aplica('B|' + id + '|aplica', b.aplica)}
          ${b.aplica === 'si' ? `<div class="extra"><label data-ayuda="s3"><input type="checkbox" data-act="chk" data-k="B|${id}|s3" ${b.s3 ? 'checked' : ''}> Ya no aplica porque el caso de uso se rediseñó (cambio real, aprobado por el Comité y verificable con documentos)</label></div>` : ''}</div>`; }).join('')}</div>
        <p class="nota">N1 a N9 corresponden al artículo 24.1 del D.S. N.° 115-2025-PCM y determinan la clasificación regulatoria de riesgo alto; los códigos NX y SF son criterios adicionales que solo elevan el nivel interno. Las medidas de reducción no hacen que un uso del artículo 24.1 deje de aplicar: solo un rediseño del caso de uso, que debe verificarse documentalmente. Ante dudas, el artículo 24.2 permite consultar a la SGTD. Está prohibido fragmentar un sistema para evitar un disparador.</p>`;
    },
    p3() {
      const iI = idx(M.informacion, E.info.inh), tI = idx(M.herramientas, E.herr.inh);
      const iR = idx(M.informacion, E.info.res || E.info.inh), tR = idx(M.herramientas, E.herr.res || E.herr.inh);
      const tarjetas = (lista, grupo) => `<div class="opciones">${lista.map((x) => `<button type="button" class="opcion" data-ayuda="${grupo}:${x.id}" data-act="set" data-k="${grupo}|inh" data-v="${x.id}" aria-pressed="${E[grupo].inh === x.id}"><b>${esc(x.nombre)}</b>${x.ayuda ? esc(x.ayuda) : ''}${x.base ? `<span class="lv">${esc(x.base)}</span>` : ''}</button>`).join('')}</div>`;
      const usaCat = E.herr.inh === 'catalogo' || E.herr.res === 'catalogo';
      const conf = [E.info.inh, E.info.res].includes('confidencial'), restr = [E.info.inh, E.info.res].includes('restringida');
      const celda = (i, t) => { const v = MOTOR.exposicion(i, t, E.authC === 'si', E.authR === 'si'); const act = (i === iR && t === tR) ? ' activa' : ''; return `<td class="${v === 9 ? 'nv' : ''}${act}">${v === 9 ? 'No viable' : v}</td>`; };
      const matriz = `<div class="matriz-cont"><table><thead><tr><th>Información \\ Herramienta</th>${M.herramientas.map((h) => `<th>${esc(h.nombre)}</th>`).join('')}</tr></thead><tbody>${M.informacion.map((inf, a) => `<tr><th>${esc(inf.nombre)}</th>${M.herramientas.map((h, b) => celda(a + 1, b + 1)).join('')}</tr>`).join('')}</tbody></table></div>`;
      const optsInfo = M.informacion.filter((x, k) => iI && k + 1 < iI).map((x) => `<option value="${x.id}" ${E.info.res === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');
      const optsHerr = M.herramientas.filter((x) => x.id !== E.herr.inh).map((x) => `<option value="${x.id}" ${E.herr.res === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');
      return titulo('Paso 3', 'Información y herramienta', 'Elija la clasificación del dato más sensible que procesará el sistema y la herramienta o entorno donde se procesará.') +
        `<div class="bloque"><h3>Clasificación de la información</h3><p class="nota">Escala común basada en la Ley de Transparencia y la Ley de Protección de Datos Personales. Si su entidad usa otras etiquetas, elija el nivel equivalente; ante la duda, el más alto.</p>${tarjetas(M.informacion, 'info')}
        <label class="nota" for="info-etiqueta">Nombre de esta categoría en su entidad (opcional, solo aparece en el reporte)</label><input type="text" id="info-etiqueta" data-ayuda="info:etiqueta" data-k="info|etiqueta" value="${esc(E.info.etiqueta || '')}" placeholder="Ej.: Uso restringido, Confidencial nivel 2"></div>
        <div class="bloque"><h3>Herramienta o entorno</h3>${tarjetas(M.herramientas, 'herr')}</div>
        ${usaCat && conf ? `<div class="pregunta" data-ayuda="authC"><span class="cod">C</span><span>¿El catálogo autoriza esta herramienta para información confidencial?</span>${sino('authC', E.authC, true)}</div>` : ''}
        ${usaCat && restr ? `<div class="pregunta" data-ayuda="authR"><span class="cod">R</span><span>¿Hay autorización expresa del Oficial de IA y de los Oficiales de Datos Personales y de Seguridad para información restringida?</span>${sino('authR', E.authR, true)}</div>` : ''}
        <div class="bloque"><h3>Matriz de exposición</h3>${matriz}<p class="nota">Resultado: <b>${esc(R.compuertaRes || '—')}</b>${R.compuertaInh && R.compuertaInh !== R.compuertaRes ? ` (inherente: ${esc(R.compuertaInh)})` : ''}. El valor de la celda es el puntaje del factor F3.2.</p></div>
        <details class="medida" ${E.info.res || E.herr.res ? 'open' : ''}><summary>Aplicar medidas: reducir la información o cambiar de herramienta</summary>
          <div class="fila"><label for="info-res">Reducir la información que se procesa a</label><select id="info-res" data-ayuda="info-res" data-act="sel" data-k="info|res"><option value="">Sin cambio</option>${optsInfo}</select></div>
          <div class="fila"><label for="herr-res">Cambiar a una herramienta o entorno más protegido</label><select id="herr-res" data-ayuda="herr-res" data-act="sel" data-k="herr|res"><option value="">Sin cambio</option>${optsHerr}</select></div>
          <label class="nota" for="ev-info">Sustento de las medidas</label><input type="text" id="ev-info" data-ayuda="ev-info" data-k="info|evidencia" value="${esc(E.info.evidencia)}" placeholder="Ej.: se trabaja con extractos sin datos restringidos en el entorno interno">
        </details>`;
    },
    p4() {
      const tabs = Object.entries(M.dimensiones).map(([d, x]) => `<button type="button" class="tab" role="tab" data-act="tab" data-d="${d}" aria-selected="${tabDim === d}">${d} · ${esc(x.nombre)}</button>`).join('');
      const fs = M.factores.filter((f) => f.dim === tabDim && !f.calculado);
      const calc = M.factores.filter((f) => f.dim === tabDim && f.calculado);
      return titulo('Paso 4', 'Evaluación de las tres dimensiones', 'Puntúe cada factor de 1 a 4. Ante la duda, elija el valor más alto. Cada dimensión toma el mayor valor entre su promedio redondeado, un 3 si un factor crítico vale 4 y un 2 si cualquier factor vale 4.') +
        `<div class="tabs" role="tablist">${tabs}</div><div class="lista-factores">${fs.map(tarjetaFactor).join('')}
        ${calc.length ? `<p class="nota">${calc.map((f) => `${f.id} ${esc(f.nombre)}: ${R.factores[f.id].inh ?? '—'} → ${R.factores[f.id].res ?? '—'}`).join(' · ')} (se calculan en el paso 3).</p>` : ''}</div>`;
    },
    p5() {
      const f = M.factores.find((x) => x.id === 'AG');
      return titulo('Paso 5', 'Nivel de agencia', 'La agencia se evalúa junto con los permisos del sistema (F3.3). Un agente autónomo con permisos de escritura o acción tiene piso de riesgo alto; uno delegado o autónomo con acceso de lectura o superior, piso moderado.') +
        tarjetaFactor(f) +
        `<div class="matriz-cont"><table><thead><tr><th>Nivel resultante</th><th>Agencia máxima</th><th>Condición</th></tr></thead><tbody>
        <tr><td>Alto / Crítico</td><td>2 · Asistiva</td><td>Toda acción con efecto la ejecuta y registra una persona autorizada</td></tr>
        <tr><td>Moderado</td><td>3 · Delegada</td><td>Aprobación humana previa para acciones con efecto externo</td></tr>
        <tr><td>Bajo</td><td>4 · Autónoma dentro de límites</td><td>Solo con información pública o interna y sin efecto sobre terceros</td></tr></tbody></table></div>
        <p class="nota">El piso por agencia y la compatibilidad de la autonomía se muestran en el resultado final.</p>`;
    },
    p6() {
      const s1 = M.especiales.S1;
      return titulo('Paso 6', 'Situaciones especiales', 'Aquí se marcan cuatro situaciones que cambian cómo se tramita el caso. Las medidas para bajar el riesgo de un factor, como anonimizar datos o exigir aprobación humana, se aplican en los pasos 3 a 5 con el botón «Aplicar una medida de reducción».') +
        `<details class="medida"><summary>Ver las nueve medidas de reducción disponibles</summary><div class="matriz-cont"><table><thead><tr><th>Medida</th><th>En palabras simples</th><th>Evidencia que se pide</th><th>Qué aspectos reduce</th></tr></thead><tbody>${M.rutas.map((r) => `<tr><td>${esc(r.nombre)}</td><td>${esc(r.simple)}</td><td>${esc(r.evidencia)}</td><td>${esc(r.factores.map((id) => (M.factores.find((f) => f.id === id) || {}).nombre || id).join(', '))}</td></tr>`).join('')}</tbody></table></div></details>` +
        `<div class="bloque"><h3>${esc(s1.nombre)}</h3><div class="pregunta" data-ayuda="S1"><span class="cod"></span><span>¿Se solicita clasificar el caso como experimental?</span>${sinoBool('s1|solicita', E.s1.solicita)}</div>
        ${E.s1.solicita ? `<div class="checks">${s1.condiciones.map((t, k) => `<label data-ayuda="S1.c"><input type="checkbox" data-act="chk" data-k="s1|c|${k}" ${E.s1.c[k] ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>` : ''}</div>
        ${['S2', 'S4', 'S5'].map((s) => `<div class="pregunta" data-ayuda="${s}"><span class="cod"></span><span><b>${esc(M.especiales[s].nombre)}.</b> ${esc(M.especiales[s].texto)}</span>${sinoBool(s.toLowerCase(), E[s.toLowerCase()])}</div>`).join('')}
        <p class="nota">El rediseño de un caso para que un uso sensible deje de aplicar se marca en el paso 2, debajo de cada uso marcado como «Aplica».</p>`;
    },
    p7() {
      const ag = esAgente();
      if (!ag) return titulo('Paso 7 · Opcional', 'Ficha del agente', 'Este paso es opcional y no cambia el resultado. Solo se habilita para sistemas que ejecutan acciones con aprobación previa o por su cuenta, o que pueden escribir o actuar en otros sistemas.') +
        '<p class="nota">Con las respuestas actuales el sistema no es un agente, así que no hay nada que completar aquí. Puede ir directamente al reporte.</p>';
      const a = E.acap, G = M.agente;
      const txt = (k, t, area) => `<label class="${area ? 'ancho' : ''}" for="acap-${k}">${t}${area ? `<textarea id="acap-${k}" data-ayuda="acap:${k}" data-k="acap|${k}">${esc(a[k] || '')}</textarea>` : `<input type="text" id="acap-${k}" data-ayuda="acap:${k}" data-k="acap|${k}" value="${esc(a[k] || '')}">`}</label>`;
      const chk = (k, t) => `<label data-ayuda="acap:${k}"><input type="checkbox" data-act="chk" data-k="acap|${k}" ${a[k] ? 'checked' : ''}> ${t}</label>`;
      const cad = R.completo ? G.reautorizacion[R.nivelRes] : null;
      return titulo('Paso 7 · Opcional', 'Ficha del agente', 'Registra qué puede hacer el agente, con qué límites y quién responde por él.') +
        `<div class="aviso"><b>Opcional: no cambia el resultado.</b> Si la completa, total o parcialmente, se adjunta al final del reporte como anexo «Ficha de autorización del agente». Si la deja en blanco, el reporte solo recomienda completarla. Es útil para demostrar la supervisión humana y las medidas de seguridad que exige el Reglamento (numeral 28.11 y artículo 29), y algunas entidades la exigen en su política antes de poner un agente en operación. Puede completarla ahora o más adelante con el área técnica.</div>` +
        `<div class="bloque"><h3>A · Identidad y alcance</h3><div class="campos">${txt('mision', 'Misión del agente', true)}${txt('limites', 'Límites: lo que nunca debe hacer', true)}</div></div>
        <div class="bloque"><h3>B · Contexto operativo</h3><div class="campos">${txt('conexiones', 'Sistemas y conexiones, con lo que puede hacer en cada uno', true)}
          <label class="ancho" for="acap-frontera">Hasta dónde opera<select id="acap-frontera" data-ayuda="acap:frontera" data-act="sel" data-k="acap|frontera"><option value="">Seleccione</option>${G.fronteras.map((x) => `<option value="${x.id}" ${a.frontera === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label></div></div>
        <div class="bloque"><h3>C · Autoridad y acciones</h3><div class="campos">${txt('permitidas', 'Acciones permitidas sin aprobación (reversibles y de bajo impacto)', true)}${txt('aprobacion', 'Acciones que requieren aprobación humana previa (todas las irreversibles o vinculantes)', true)}${txt('prohibidas', 'Acciones prohibidas', true)}</div></div>
        <div class="bloque"><h3>D · Controles</h3><div class="checks">${chk('apagado', 'Se probó el apagado inmediato y la revocación de sus accesos')}${chk('subagentes', 'Ningún subagente tiene más permisos que el agente que lo invoca')}${chk('registro', 'Queda registro de cada acción, con fecha y aprobación')}</div><div class="campos">${txt('topes', 'Topes de gasto, volumen u operaciones')}</div></div>
        <div class="bloque"><h3>E · Evidencia de evaluación</h3><div class="campos">${txt('pruebas', 'Pruebas realizadas y resultados, incluidas pruebas de ataque o mal uso', true)}</div></div>
        <div class="bloque"><h3>F · Monitoreo</h3><div class="checks" data-ayuda="acap:senales">${G.senales.map((s) => `<label><input type="checkbox" data-act="chk" data-k="acap|senales|${s.id}" ${a.senales && a.senales[s.id] ? 'checked' : ''}> ${esc(s.nombre)}</label>`).join('')}</div></div>
        <div class="bloque"><h3>G · Responsables y revisión</h3><div class="campos">${txt('supervisor', 'Supervisor humano con autoridad para detenerlo')}${txt('reautorizacion', 'Fecha de la próxima reautorización')}</div>
          <div class="checks">${chk('calibracion', 'Los supervisores rotan y se calibran con casos de respuesta conocida')}</div>
          <p class="nota">${cad ? `Revisión sugerida según el nivel residual: ${cad}. ` : ''}Cualquier cambio de alcance o de permisos exige revisar la ficha antes de aplicarlo.</p></div>`;
    },
    rep() {
      const html = reporteHTML();
      const botones = `<div class="acciones-rep"><button type="button" class="btn" data-act="copiar">Copiar reporte</button>
        ${EMBEBIDO ? '<span class="nota">En la versión publicada en GitHub también puedes descargarlo en HTML o JSON e imprimirlo como PDF.</span>' : '<button type="button" class="btn sec" data-act="html">Descargar HTML</button><button type="button" class="btn sec" data-act="json">Descargar JSON</button><button type="button" class="btn sec" data-act="imprimir">Imprimir o guardar PDF</button>'}
        <span class="estado-copia" id="estado-copia" aria-live="polite"></span></div><textarea id="respaldo-copia" hidden readonly></textarea>`;
      return botones + `<div class="reporte" id="reporte">${html}</div>`;
    }
  };

  function esAgente() { const f = R.factores; return (f.AG.inh || 0) >= 3 || (f['F3.3'].inh || 0) >= 3; }
  function acapFaltantes() { return M.agente.requeridos.filter((k) => !E.acap[k]); }
  function acapLlena() { const a = E.acap || {}; return Object.entries(a).some(([k, v]) => (k === 'senales' ? Object.values(v || {}).some(Boolean) : !!v)); }
  // ---------- reporte ----------
  function filasFactores() {
    return M.factores.map((f) => { const r = R.factores[f.id]; const d = E.f[f.id] || {}; const e = escalaDe(f);
      const ev = f.calculado ? (f.calculado === 'info' ? E.info.evidencia : E.info.evidencia) : d.evidencia;
      const ruta = f.calculado ? (r.res < r.inh ? (f.calculado === 'info' ? 'R3' : 'R2') : '') : (r.res < r.inh ? d.ruta : '');
      return { id: f.id, nombre: f.nombre, dim: f.dim, inh: r.inh, inhT: r.inh ? e[r.inh - 1] : '', ruta: ruta || '', medida: ruta ? (M.rutas.find((x) => x.id === ruta) || {}).nombre || ruta : '', res: r.res, resT: r.res ? e[r.res - 1] : '', ev: ruta ? ev || '' : '' }; });
  }
  function notasApp() {
    const n = [];
    if (E.p03 === 'si') n.push('P0.3: una automatización tradicional podría bastar; evalúe esa alternativa antes de usar IA.');
    if (esAgente() && !acapLlena()) n.push('El sistema actúa como agente: se recomienda completar la ficha del agente (paso 7, opcional) antes de ponerlo en operación.');
    else if (esAgente() && acapFaltantes().length) n.push(`La ficha del agente se adjunta como anexo con ${acapFaltantes().length} campo(s) pendiente(s).`);
    return n;
  }
  function reporteDatos() {
    const perfil = M.perfiles[E.perfil];
    return {
      metodologia: { version: M.version, perfil: perfil.nombre, escala: M.escalas[E.escala].nombre },
      caso: E.caso,
      ambito: { sujeto: (M.ambito.sujetos.find((x) => x.id === R.sujeto) || {}).nombre || '', excepcion: R.excepcion ? `${R.excepcion.nombre} (${R.excepcion.base})` : (E.ambito && E.ambito.excepcion === 'ninguna' ? 'Ninguna' : ''),
        gruposVulnerables: M.gruposVulnerables.filter((g) => E.grupos && E.grupos[g.id]).map((g) => g.nombre) },
      clasificacionRegulatoria: R.regulatoria,
      nivelInterno: { descripcion: 'Metodología propia de la herramienta; no es una categoría del Reglamento', inherente: R.nivelInh ? `${R.nivelInh} · ${M.niveles[R.nivelInh].nombre}` : '', residual: R.nivelRes ? `${R.nivelRes} · ${M.niveles[R.nivelRes].nombre}` : '' },
      obligaciones: R.obligaciones,
      resultado: { estado: R.titulo, condicionado: R.condicionado ? 'Condicionado a reducir la autonomía del sistema' : '', nivelInherente: R.nivelInh ? M.niveles[R.nivelInh].nombre : '', nivelResidual: R.nivelRes ? M.niveles[R.nivelRes].nombre : '',
        aprueba: R.aprueba || '', aprobacionReduccion: R.reduccion || '', evaluacionImpactoNormativa: R.eiiNormativa || '', tratamiento: R.tratamiento || null, compuerta: R.compuertaRes || '', motivoNoViable: R.motivoNoViable || '', agencia: R.agencia || '',
        dimensiones: R.dim, pisoListaB: { inh: R.pisoBInh, res: R.pisoBRes }, pisoAgencia: { inh: R.pisoAgInh, res: R.pisoAgRes }, observaciones: R.observaciones, notas: R.notas.concat(notasApp()), faltantes: R.faltantes },
      respuestas: { paso0: E.p0, usosIndebidos: R.prohibidos, disparadores: R.disparadores, redisenoDeclaradoS3: R.redisenados,
        informacion: { inherente: nombreInfo(E.info.inh), etiquetaInstitucional: E.info.etiqueta || null, conMedidas: E.info.res ? nombreInfo(E.info.res) : null }, herramienta: { inherente: nombreHerr(E.herr.inh), conMedidas: E.herr.res ? nombreHerr(E.herr.res) : null },
        factores: filasFactores(), rutasEspeciales: { S1: R.sandbox, S2: E.s2, S4: E.s4, S5: E.s5 }, automatizacionTradicionalBastaria: E.p03 === 'si' ? true : E.p03 === 'no' ? false : null },
      fichaAgente: esAgente() && acapLlena() ? { ...E.acap, frontera: (M.agente.fronteras.find((x) => x.id === E.acap.frontera) || {}).nombre || '', pendientes: acapFaltantes() } : null,
      aviso: M.aviso, fuentes: M.fuentes, generado: new Date().toISOString()
    };
  }
  function reporteHTML() {
    const D = reporteDatos(), r = D.resultado, c = D.caso;
    const fila = (a, b) => (b ? `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>` : '');
    const trat = r.tratamiento ? `Evaluación de impacto según la metodología: ${r.tratamiento.eii.toLowerCase()} · validación: ${r.tratamiento.validacion} · monitoreo: ${r.tratamiento.monitoreo}` : '';
    const cr = D.clasificacionRegulatoria, ni = D.nivelInterno;
    const oblig = D.obligaciones.length ? `<section><h3>Obligaciones aplicables y evidencia</h3><p class="nota">Lista de verificación. La herramienta no verifica su cumplimiento: cada punto requiere evidencia (política, procedimiento, responsable, documento, fecha y versión).</p><table><thead><tr><th>Artículo</th><th>Estado</th><th>Qué acreditar</th></tr></thead><tbody>${D.obligaciones.map((o) => `<tr><td>${esc(o.art)} · ${esc(o.tema)}</td><td>${esc(o.estado)}</td><td><ul>${o.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table></section>` : '';
    const dims = Object.entries(M.dimensiones).map(([d, x]) => `<tr><td>${d} · ${esc(x.nombre)}</td><td>${r.dimensiones[d].inh ?? '—'}</td><td>${r.dimensiones[d].res ?? '—'}</td></tr>`).join('');
    const facts = D.respuestas.factores.map((f) => `<tr><td class="mono">${f.id}</td><td>${esc(f.nombre)}</td><td>${f.inh ?? '—'}${f.inhT ? ` · ${esc(f.inhT)}` : ''}</td><td>${esc(f.medida)}</td><td>${f.res ?? '—'}${f.ruta ? ` · ${esc(f.resT)}` : ''}</td><td>${esc(f.ev)}</td></tr>`).join('');
    const listaB = D.respuestas.disparadores.length ? `<ul>${D.respuestas.disparadores.map((id) => `<li><b>${id}</b> ${esc(M.listaB[id].texto)}${D.respuestas.redisenoDeclaradoS3.includes(id) ? ' (rediseño declarado; verificar documentalmente)' : ''}</li>`).join('')}</ul>` : '<p>Ninguno.</p>';
    return `<header><h2>Reporte de clasificación de riesgo de IA</h2><p class="meta">${esc(c.nombre || 'Caso sin nombre')}${c.entidad ? ' · ' + esc(c.entidad) : ''} · ${esc(c.fecha)} · ${esc(D.metodologia.perfil)} · ${esc(D.metodologia.escala)} · metodología v${esc(D.metodologia.version)}</p></header>
      <section><h3>Clasificación regulatoria preliminar (art. 22 del Reglamento)</h3><table><tbody>${fila('Categoría', cr.nombre)}${fila('Base legal', cr.baseLegal.join('; '))}${fila('Rediseño por verificar', cr.redisenoPorVerificar.join(', '))}${fila('Evaluación de impacto normativa', r.evaluacionImpactoNormativa)}
      ${fila('Tipo de organización', D.ambito.sujeto)}${fila('Excepción del art. 4', D.ambito.excepcion)}${fila('Grupos que afecta especialmente (art. 12)', D.ambito.gruposVulnerables.join(', '))}</tbody></table></section>
      <section><h3>Nivel interno de gestión (metodología de la herramienta)</h3><table><tbody>${fila('Resultado', r.estado + (r.condicionado ? ' · ' + r.condicionado : ''))}${fila('Nivel inherente', ni.inherente)}${fila('Nivel residual', ni.residual)}
      ${fila('Aprueba el caso', r.aprueba)}${fila('Aprobación de la reducción', r.aprobacionReduccion)}${fila('Tratamiento', trat)}${fila('Compuerta información-herramienta', r.compuerta)}${fila('Motivo', r.motivoNoViable)}${fila('Agencia', r.agencia)}
      ${fila('Observaciones', r.observaciones.join(' '))}${fila('Notas', r.notas.join(' '))}${fila('Respuestas pendientes', r.faltantes.length ? r.faltantes.join(', ') : '')}</tbody></table></section>
      ${oblig}
      <section><h3>Caso de uso</h3><table><tbody>${fila('Área dueña', c.area)}${fila('Responsable', c.responsable)}${fila('Descripción', c.descripcion)}${fila('Herramienta o proveedor', c.herramienta)}</tbody></table></section>
      <section><h3>Filtros</h3><p>Paso 0: ${M.paso0.map((q) => `${q.id} ${E.p0[q.id] === 'si' ? 'Sí' : E.p0[q.id] === 'no' ? 'No' : '—'}`).join(' · ')}. Paso 1, usos indebidos: ${D.respuestas.usosIndebidos.length ? D.respuestas.usosIndebidos.join(', ') : 'ninguno'}.</p><p>Paso 2, disparadores de riesgo alto:</p>${listaB}
      <p>Paso 3: información ${esc(D.respuestas.informacion.inherente)}${D.respuestas.informacion.etiquetaInstitucional ? ' (en la entidad: ' + esc(D.respuestas.informacion.etiquetaInstitucional) + ')' : ''}${D.respuestas.informacion.conMedidas ? ' → ' + esc(D.respuestas.informacion.conMedidas) : ''}; herramienta ${esc(D.respuestas.herramienta.inherente)}${D.respuestas.herramienta.conMedidas ? ' → ' + esc(D.respuestas.herramienta.conMedidas) : ''}.</p></section>
      <section><h3>Dimensiones y pisos</h3><div class="matriz-cont"><table><thead><tr><th>Dimensión</th><th>Inherente</th><th>Residual</th></tr></thead><tbody>${dims}<tr><td>Piso de la Lista B</td><td>${r.pisoListaB.inh ?? '—'}</td><td>${r.pisoListaB.res ?? '—'}</td></tr><tr><td>Piso por agencia</td><td>${r.pisoAgencia.inh ?? '—'}</td><td>${r.pisoAgencia.res ?? '—'}</td></tr></tbody></table></div></section>
      <section><h3>Factores</h3><div class="matriz-cont"><table><thead><tr><th>Código</th><th>Factor</th><th>Inherente</th><th>Medida</th><th>Residual</th><th>Sustento</th></tr></thead><tbody>${facts}</tbody></table></div></section>
      ${D.fichaAgente ? `<section><h3>Anexo · Ficha de autorización del agente</h3><p class="nota">Complementaria y opcional: no modifica el resultado de la clasificación.</p><table><tbody>${[['Misión', 'mision'], ['Límites', 'limites'], ['Sistemas y conexiones', 'conexiones'], ['Hasta dónde opera', 'frontera'], ['Acciones permitidas', 'permitidas'], ['Requieren aprobación humana', 'aprobacion'], ['Acciones prohibidas', 'prohibidas'], ['Topes', 'topes'], ['Pruebas', 'pruebas'], ['Supervisor humano', 'supervisor'], ['Próxima reautorización', 'reautorizacion']].map(([t, k]) => fila(t, D.fichaAgente[k])).join('')}
      ${fila('Controles', [D.fichaAgente.apagado && 'apagado y revocación probados', D.fichaAgente.subagentes && 'autoridad no aditiva', D.fichaAgente.registro && 'registro de acciones', D.fichaAgente.calibracion && 'supervisores calibrados'].filter(Boolean).join(' · '))}
      ${fila('Señales monitoreadas', M.agente.senales.filter((s) => D.fichaAgente.senales && D.fichaAgente.senales[s.id]).map((s) => s.nombre).join(' · '))}${fila('Campos pendientes', D.fichaAgente.pendientes.join(', '))}</tbody></table></section>` : ''}
      <section><h3>Aviso</h3><p class="nota">${esc(M.aviso)}</p></section>`;
  }
  function reporteMarkdown() {
    const D = reporteDatos(), r = D.resultado, c = D.caso;
    const L = [`# Reporte de clasificación de riesgo de IA`, `${c.nombre || 'Caso sin nombre'}${c.entidad ? ' · ' + c.entidad : ''} · ${c.fecha} · ${D.metodologia.perfil} · ${D.metodologia.escala} · metodología v${D.metodologia.version}`, '',
      `## Clasificación regulatoria preliminar (art. 22 del Reglamento)`, `- Categoría: ${D.clasificacionRegulatoria.nombre}`, `- Base legal: ${D.clasificacionRegulatoria.baseLegal.join('; ') || '—'}`];
    if (D.clasificacionRegulatoria.redisenoPorVerificar.length) L.push(`- Rediseño por verificar: ${D.clasificacionRegulatoria.redisenoPorVerificar.join(', ')}`);
    if (r.evaluacionImpactoNormativa) L.push(`- Evaluación de impacto normativa: ${r.evaluacionImpactoNormativa}`);
    L.push(`- Tipo de organización: ${D.ambito.sujeto || '—'}`, `- Excepción del art. 4: ${D.ambito.excepcion || '—'}`);
    if (D.ambito.gruposVulnerables.length) L.push(`- Grupos que afecta especialmente (art. 12): ${D.ambito.gruposVulnerables.join(', ')}`);
    L.push('', `## Nivel interno de gestión (metodología de la herramienta)`, `- Resultado: ${r.estado}${r.condicionado ? ' · ' + r.condicionado : ''}`, `- Nivel inherente: ${D.nivelInterno.inherente || '—'}`, `- Nivel residual: ${D.nivelInterno.residual || '—'}`, `- Aprueba el caso: ${r.aprueba || '—'}`,
      `- Aprobación de la reducción: ${r.aprobacionReduccion || '—'}`);
    if (r.tratamiento) L.push(`- Tratamiento: evaluación de impacto según la metodología: ${r.tratamiento.eii.toLowerCase()} · validación: ${r.tratamiento.validacion} · monitoreo: ${r.tratamiento.monitoreo}`);
    if (r.compuerta) L.push(`- Compuerta información-herramienta: ${r.compuerta}${r.motivoNoViable ? ' · ' + r.motivoNoViable : ''}`);
    if (r.agencia) L.push(`- Agencia: ${r.agencia}`);
    r.observaciones.forEach((o) => L.push(`- Observación: ${o}`)); r.notas.forEach((o) => L.push(`- Nota: ${o}`));
    if (r.faltantes.length) L.push(`- Respuestas pendientes: ${r.faltantes.join(', ')}`);
    if (D.obligaciones.length) {
      L.push('', '## Obligaciones aplicables y evidencia', '(Lista de verificación: la herramienta no verifica su cumplimiento; cada punto requiere evidencia.)');
      D.obligaciones.forEach((o) => { L.push(`- **${o.art} · ${o.tema}** (${o.estado})`); o.items.forEach((i) => L.push(`  - [ ] ${i}`)); });
    }
    L.push('', '## Caso de uso', `- Área dueña: ${c.area || '—'}`, `- Responsable: ${c.responsable || '—'}`, `- Descripción: ${c.descripcion || '—'}`, `- Herramienta o proveedor: ${c.herramienta || '—'}`, '',
      '## Filtros', `- Usos indebidos: ${D.respuestas.usosIndebidos.join(', ') || 'ninguno'}`, `- Disparadores de riesgo alto: ${D.respuestas.disparadores.join(', ') || 'ninguno'}${D.respuestas.redisenoDeclaradoS3.length ? ' (rediseño declarado por S3, por verificar: ' + D.respuestas.redisenoDeclaradoS3.join(', ') + ')' : ''}`,
      `- Información: ${D.respuestas.informacion.inherente}${D.respuestas.informacion.etiquetaInstitucional ? ' (en la entidad: ' + D.respuestas.informacion.etiquetaInstitucional + ')' : ''}${D.respuestas.informacion.conMedidas ? ' → ' + D.respuestas.informacion.conMedidas : ''}`, `- Herramienta: ${D.respuestas.herramienta.inherente}${D.respuestas.herramienta.conMedidas ? ' → ' + D.respuestas.herramienta.conMedidas : ''}`, '',
      '## Dimensiones', '| Dimensión | Inherente | Residual |', '|---|---|---|', ...Object.entries(M.dimensiones).map(([d, x]) => `| ${d} ${x.nombre} | ${r.dimensiones[d].inh ?? '—'} | ${r.dimensiones[d].res ?? '—'} |`),
      `| Piso de la Lista B | ${r.pisoListaB.inh} | ${r.pisoListaB.res} |`, `| Piso por agencia | ${r.pisoAgencia.inh ?? '—'} | ${r.pisoAgencia.res ?? '—'} |`, '',
      '## Factores', '| Código | Factor | Inherente | Medida | Residual | Sustento |', '|---|---|---|---|---|---|', ...D.respuestas.factores.map((f) => `| ${f.id} | ${f.nombre} | ${f.inh ?? '—'} | ${f.medida} | ${f.res ?? '—'} | ${f.ev.replace(/\|/g, '/')} |`), '', `> ${M.aviso}`);
    if (D.fichaAgente) { const fa = D.fichaAgente; L.push('', '## Anexo: Ficha de autorización del agente', '(Complementaria y opcional: no modifica el resultado de la clasificación.)', `- Misión: ${fa.mision || '—'}`, `- Límites: ${fa.limites || '—'}`, `- Sistemas y conexiones: ${fa.conexiones || '—'}`, `- Hasta dónde opera: ${fa.frontera || '—'}`, `- Acciones permitidas: ${fa.permitidas || '—'}`, `- Requieren aprobación humana: ${fa.aprobacion || '—'}`, `- Acciones prohibidas: ${fa.prohibidas || '—'}`, `- Topes: ${fa.topes || '—'}`, `- Pruebas: ${fa.pruebas || '—'}`, `- Supervisor humano: ${fa.supervisor || '—'}`, `- Próxima reautorización: ${fa.reautorizacion || '—'}`, `- Controles: ${[fa.apagado && 'apagado y revocación probados', fa.subagentes && 'autoridad no aditiva', fa.registro && 'registro de acciones', fa.calibracion && 'supervisores calibrados'].filter(Boolean).join(' · ') || '—'}`); if (fa.pendientes.length) L.push(`- Campos pendientes: ${fa.pendientes.join(', ')}`); }
    return L.join('\n');
  }
  function descargar(nombre, tipo, contenido) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function nombreArchivo(ext) { const s = (E.caso.nombre || 'caso').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50); return `reporte-riesgo-ia-${s}-${E.caso.fecha || hoy()}.${ext}`; }
  function contar() {
    if (!CFG.contadorUrl || contado) return; contado = true;
    try { fetch(CFG.contadorUrl, { method: 'POST', mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true }).catch(() => {}); } catch (e) { /* sin red: no se cuenta */ }
  }
  const CSS_REPORTE = 'body{font:14px/1.5 Arial,sans-serif;color:#15212c;max-width:960px;margin:24px auto;padding:0 16px}table{border-collapse:collapse;width:100%;margin:6px 0 12px}th,td{border:1px solid #cfd8d5;padding:5px 7px;text-align:left;vertical-align:top;font-size:12.5px}th{background:#eef2f1}h2{margin:0 0 4px}h3{margin:18px 0 6px}.meta,.nota{color:#4b5a67}.mono{font-family:monospace}';

  // ---------- panel de resultado y navegación ----------
  function estadoPaso(id) {
    switch (id) {
      case 'caso': return E.caso.nombre ? 'ok' : '';
      case 'p0': return R.p0Completo ? 'ok' : '';
      case 'p1': return M.listaA.every((q) => E.A[q.id]) ? 'ok' : '';
      case 'p2': return M.perfiles[E.perfil].listaB.every((b) => E.B[b] && E.B[b].aplica) ? 'ok' : '';
      case 'p3': return R.compuertaRes === 'No viable' ? 'alerta' : E.info.inh && E.herr.inh ? 'ok' : '';
      case 'p4': { const fs = M.factores.filter((f) => f.dim !== 'AG' && !f.calculado); if (fs.some((f) => R.factores[f.id].observacion)) return 'alerta'; return fs.every((f) => R.factores[f.id].inh) ? 'ok' : ''; }
      case 'p5': return R.factores.AG.inh ? 'ok' : '';
      case 'p7': return esAgente() && acapLlena() && !acapFaltantes().length ? 'ok' : '';
      default: return '';
    }
  }
  function primerPendiente() {
    const orden = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
    return orden.find((p) => estadoPaso(p) === '') || 'rep';
  }
  function renderPasos() {
    $('#pasos').innerHTML = PASOS.map((p) => `<button type="button" class="paso" data-act="ir" data-p="${p.id}" ${paso === p.id ? 'aria-current="step"' : ''}><span class="n">${p.n}</span>${p.t}<span class="est ${estadoPaso(p.id)}"></span></button>`).join('');
  }
  function medidor(cod, nombre, inh, res) {
    const seg = [1, 2, 3, 4].map((n) => `<i class="${inh && n <= inh ? 'inh' : ''} ${res && n <= res ? 'res n' + res : ''}"></i>`).join('');
    return `<div class="medidor" title="${esc(nombre)}"><span class="cod">${cod}</span><span class="seg" aria-label="${esc(nombre)}: inherente ${inh ?? 'sin dato'}, residual ${res ?? 'sin dato'}">${seg}</span><span class="val">${inh ?? '–'}→${res ?? '–'}</span></div>`;
  }
  function renderResultado() {
    if (paso !== 'rep') {
      const n = R.faltantes.length;
      $('#resultado').innerHTML = `<div class="tarjeta"><span class="et">Resultado</span><p class="nota">El resultado se muestra al terminar, en el reporte. Así la evaluación describe el caso tal como es, sin ajustar respuestas según el nivel que va saliendo.</p>
        <p class="nota"><b>${R.p0Completo && R.excepcion ? 'El caso está fuera del ámbito del Reglamento.' : R.esIA || !R.p0Completo ? (n ? `Faltan ${n} respuestas.` : 'Todas las respuestas están completas.') : 'El caso no es un sistema de IA.'}</b></p>
        ${n && R.p0Completo && R.esIA ? `<button type="button" class="enlace" data-act="ir" data-p="${primerPendiente()}">Ir al primer paso pendiente</button>` : ''}
        <button type="button" class="btn" data-act="ir" data-p="rep">${n && R.esIA ? 'Ver reporte parcial' : 'Ver resultado'}</button></div>`;
      return;
    }
    const nom = (n) => (n ? M.niveles[n].nombre : '—');
    const t = R.tratamiento;
    const rg = R.regulatoria;
    $('#resultado').innerHTML = `<div class="tarjeta"><span class="et">Clasificación regulatoria preliminar</span><p class="reg"><b>${esc(rg.nombre)}</b>${rg.baseLegal.length ? `<br><span class="nota">${esc(rg.baseLegal.join('; '))}</span>` : ''}</p>
      ${rg.redisenoPorVerificar.length ? `<p class="alerta-txt">Rediseño declarado en ${esc(rg.redisenoPorVerificar.join(', '))}: debe verificarse documentalmente.</p>` : ''}${R.eiiNormativa ? `<p class="nota">Evaluación de impacto normativa: ${esc(R.eiiNormativa)}</p>` : ''}</div>
      <div class="tarjeta veredicto e-${R.estado}"><span class="et">Nivel interno de gestión</span><span class="nivel">${esc(R.titulo)}</span>
      ${R.condicionado ? '<span class="cond">Condicionado a reducir la autonomía del sistema</span>' : ''}${R.observaciones.length ? `<span class="alerta-txt">${R.observaciones.length} observación(es) por revisar</span>` : ''}
      ${R.completo ? `<div class="flujo">Inherente <b>${nom(R.nivelInh)}</b> → residual <b>${nom(R.nivelRes)}</b></div>` : ''}${R.completo && !['prohibido', 'fuera', 'noviable', 'experimental'].includes(R.estado) ? `<p class="nota"><b>${esc(t.ruta)}.</b> ${esc(t.siguiente)}</p>` : ''}</div>
      <div class="tarjeta"><div class="medidores">${Object.entries(M.dimensiones).map(([d, x]) => medidor(d, x.nombre, R.dim[d].inh, R.dim[d].res)).join('')}${medidor('AG', 'Piso por agencia', R.pisoAgInh, R.pisoAgRes)}${medidor('B', 'Piso de la Lista B', R.pisoBInh, R.pisoBRes)}</div>
      <p class="nota">Contorno: inherente. Relleno: residual.</p></div>
      <div class="tarjeta"><dl class="dl"><dt>Aprueba</dt><dd>${esc(R.aprueba || '—')}</dd>${R.completo && R.reduccion !== 'Sin reducción de nivel' ? `<dt>Aprueba la reducción</dt><dd>${esc(R.reduccion)}</dd>` : ''}
      ${t && !['prohibido', 'fuera', 'experimental', 'noviable'].includes(R.estado) ? `<dt>EII (metodología)</dt><dd>${esc(t.eii)}</dd><dt>Validación</dt><dd>${esc(t.validacion)}</dd><dt>Monitoreo</dt><dd>${esc(t.monitoreo)}</dd>` : ''}
      <dt>Compuerta</dt><dd class="${R.compuertaRes === 'No viable' ? 'alerta-txt' : ''}">${esc(R.compuertaRes || '—')}</dd>${R.agencia ? `<dt>Agencia</dt><dd class="${R.agencia !== 'Compatible' ? 'alerta-txt' : ''}">${esc(R.agencia)}</dd>` : ''}</dl>
      ${R.faltantes.length && R.esIA && !R.prohibido ? `<button type="button" class="enlace" data-act="ir" data-p="${primerPendiente()}">Faltan ${R.faltantes.length} respuestas. Ir al primer paso pendiente</button>` : ''}
      ${paso !== 'rep' ? '<button type="button" class="btn" data-act="ir" data-p="rep">Ver reporte</button>' : ''}</div>`;
  }
  function render(soloPanel) {
    if (!soloPanel) ocultarAyuda();
    R = MOTOR.evaluar(E, M);
    if (!soloPanel) { $('#principal').innerHTML = vistas[paso]() + (paso === 'rep' ? '' : navPaso()); }
    renderPasos(); renderResultado();
    $('#aviso-ejemplo').hidden = !esEjemplo;
    $('#perfil').value = E.perfil; $('#escala').value = E.escala;
    if (!soloPanel) setTimeout(reponerAyudaTactil, 0);
  }

  // ---------- eventos ----------
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'set') { set(b.dataset.k, parseV(b.dataset.v)); render(); return; }
    if (act === 'ir') { paso = b.dataset.p; render(); $('#principal').focus({ preventScroll: true }); if (window.innerWidth < 1080) $('#principal').scrollIntoView({ block: 'start' }); return; }
    if (act === 'tab') { tabDim = b.dataset.d; render(); return; }
    if (act === 'ejemplo') { E = estadoEjemplo(); esEjemplo = true; contado = false; paso = 'rep'; tabDim = 'D1'; render(); return; }
    if (act === 'nueva') { const p = E.perfil, e = E.escala; E = estadoVacio(); E.perfil = p; E.escala = e; esEjemplo = false; contado = false; paso = 'caso'; render(); return; }
    if (act === 'copiar') {
      const md = reporteMarkdown(); contar();
      const ok = () => { $('#estado-copia').textContent = 'Reporte copiado.'; };
      const respaldo = () => { const t = $('#respaldo-copia'); t.hidden = false; t.value = md; t.style.minHeight = '200px'; t.select(); $('#estado-copia').textContent = 'Seleccione el texto y cópielo con Ctrl+C.'; };
      try { navigator.clipboard.writeText(md).then(ok, respaldo); } catch (e) { respaldo(); }
      return;
    }
    if (act === 'html') { contar(); descargar(nombreArchivo('html'), 'text/html;charset=utf-8', `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte de riesgo de IA</title><style>${CSS_REPORTE}</style></head><body>${reporteHTML()}</body></html>`); return; }
    if (act === 'json') { contar(); descargar(nombreArchivo('json'), 'application/json', JSON.stringify(reporteDatos(), null, 2)); return; }
    if (act === 'imprimir') { contar(); window.print(); return; }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.id === 'perfil') { E.perfil = el.value; render(); return; }
    if (el.id === 'escala') { E.escala = el.value; render(); return; }
    if (el.dataset.act === 'sel') { set(el.dataset.k, el.value || null); render(); return; }
    if (el.dataset.act === 'chk') { const k = el.dataset.k.split('|'); if (k[0] === 's1') { E.s1.c[Number(k[2])] = el.checked; } else set(el.dataset.k, el.checked); render(); ocultarAyuda(); }
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target; if (!el.dataset.k || el.dataset.act) return;
    set(el.dataset.k, el.value); render(true);
  });

  // ---------- ayudas flotantes ----------
  const AY = window.AYUDAS || {};
  const tip = document.createElement('div'); tip.id = 'ayuda-flotante'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  let tipEl = null, tipTimer = null, ayudaTactil = null;
  function mostrarAyuda(el, autoOcultar) {
    const a = AY[el.dataset.ayuda]; if (!a) return;
    if (tipEl && tipEl !== el) tipEl.removeAttribute('aria-describedby');
    tipEl = el; clearTimeout(tipTimer);
    tip.innerHTML = `<p>${esc(a.t)}</p>${a.e && a.e.length ? `<p class="ej">${a.e.length > 1 ? 'Ejemplos' : 'Ejemplo'}</p><ul>${a.e.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    tip.style.maxWidth = Math.min(340, window.innerWidth - 24) + 'px';
    tip.hidden = false; el.setAttribute('aria-describedby', 'ayuda-flotante');
    const r = el.getBoundingClientRect(), th = tip.offsetHeight, tw = tip.offsetWidth;
    const left = Math.min(Math.max(12, r.left), window.innerWidth - tw - 12);
    let top = r.bottom + 8; if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
    if (autoOcultar) tipTimer = setTimeout(ocultarAyuda, 6000);
  }
  function ocultarAyuda() { if (tipEl) tipEl.removeAttribute('aria-describedby'); tipEl = null; tip.hidden = true; clearTimeout(tipTimer); }
  document.addEventListener('mouseover', (ev) => { const el = ev.target.closest('[data-ayuda]'); if (el && el !== tipEl) mostrarAyuda(el); else if (!el && tipEl) ocultarAyuda(); });
  document.addEventListener('focusin', (ev) => { const el = ev.target.closest('[data-ayuda]'); if (el) mostrarAyuda(el); });
  document.addEventListener('focusout', () => { if (!ayudaTactil) ocultarAyuda(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ocultarAyuda(); });
  window.addEventListener('scroll', () => { if (!ayudaTactil) ocultarAyuda(); }, { passive: true });
  document.addEventListener('pointerdown', (ev) => { const el = ev.target.closest('[data-ayuda]'); ayudaTactil = ev.pointerType === 'touch' && el ? el.dataset.ayuda : null; });
  function reponerAyudaTactil() {
    if (!ayudaTactil) return; const el = document.querySelector(`[data-ayuda="${ayudaTactil}"]`); ayudaTactil = null;
    if (el) mostrarAyuda(el, true);
  }

  // ---------- inicio ----------
  $('#ver').textContent = 'v' + M.version;
  $('#aviso-legal').textContent = M.aviso;
  $('#perfil').innerHTML = Object.entries(M.perfiles).map(([k, p]) => `<option value="${k}">${esc(p.nombre)}</option>`).join('');
  $('#escala').innerHTML = Object.entries(M.escalas).map(([k, s]) => `<option value="${k}">${esc(s.nombre)}</option>`).join('');
  render();
})();
