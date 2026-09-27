/*
 * Motor de clasificación de riesgo de IA. Funciones puras, sin estado ni red.
 * Reproduce las reglas del Anexo C (Metodología de Clasificación de Riesgo) y de su calculadora Excel.
 */
(function (root) {
  const NO_VIABLE = 9;
  const redondear = (x) => Math.floor(x + 0.5 + 1e-9); // 0,5 hacia arriba, como ROUND de Excel

  function indice(lista, id) { const i = lista.findIndex((x) => x.id === id); return i < 0 ? null : i + 1; }

  // Matriz información × herramienta (sección 10.2 de la Política). Devuelve 1–3, o 9 si no es viable.
  function exposicion(i, t, autCatalogoConf, autCatalogoRestr) {
    if (!i || !t) return null;
    if (t === 1) return [1, 1, 2, 3][i - 1];
    if (t === 2) return [1, 1, autCatalogoConf ? 2 : NO_VIABLE, autCatalogoRestr ? 3 : NO_VIABLE][i - 1];
    return [2, NO_VIABLE, NO_VIABLE, NO_VIABLE][i - 1];
  }

  // Puntaje de una dimensión: máximo entre promedio redondeado, regla del factor crítico y regla del factor extremo.
  function puntajeDimension(valores, criticos) {
    const v = Object.values(valores);
    if (!v.length || v.some((x) => x == null)) return null;
    const prom = redondear(v.reduce((a, b) => a + b, 0) / v.length);
    const critico = criticos.some((c) => valores[c] === 4) ? 3 : 1;
    const extremo = v.includes(4) ? 2 : 1;
    return Math.max(prom, critico, extremo);
  }

  function pisoAgencia(ag, permisos) {
    if (ag == null || permisos == null) return null;
    if (ag === 4 && permisos >= 3) return 3;
    if (ag >= 3 && permisos >= 2) return 2;
    return 1;
  }

  function evaluar(E, M) {
    const R = { faltantes: [], observaciones: [], notas: [], factores: {} };
    const perfil = M.perfiles[E.perfil] || M.perfiles.nucleo;
    const idsB = perfil.listaB;
    const si = (x) => x === 'si';

    // Ámbito jurídico (arts. 3 y 4)
    const amb = E.ambito || {};
    R.sujeto = amb.sujeto || null;
    R.excepcion = amb.excepcion && amb.excepcion !== 'ninguna' ? M.ambito.excepciones.find((x) => x.id === amb.excepcion) : null;
    R.ambitoCompleto = !!amb.sujeto && !!amb.excepcion;
    // Paso 0
    const p0 = M.paso0.map((q) => E.p0[q.id]);
    R.p0Completo = R.ambitoCompleto && (p0.every((x) => x === 'si' || x === 'no') || p0.some(si));
    R.esIA = p0.some(si);
    // Paso 1. A1–A6 son el art. 23.1; los AX son criterios adicionales de la metodología.
    const esNorma = (id) => /^[AN]\d+$/.test(id);
    R.prohibidos = M.listaA.filter((q) => si(E.A[q.id])).map((q) => q.id);
    R.prohibido = R.prohibidos.length > 0;
    R.prohibidosNorma = R.prohibidos.filter(esNorma);
    // Paso 2. N1–N9 son el art. 24.1; NX y SF son criterios adicionales.
    R.disparadores = idsB.filter((id) => si(E.B[id] && E.B[id].aplica));
    R.redisenados = R.disparadores.filter((id) => E.B[id].s3);
    R.pisoBInh = R.disparadores.length ? 3 : 1;
    R.pisoBRes = R.disparadores.length > R.redisenados.length ? 3 : 1;

    // Paso 3
    const iInh = indice(M.informacion, E.info.inh);
    const iRes = indice(M.informacion, E.info.res || E.info.inh);
    const tInh = indice(M.herramientas, E.herr.inh);
    const tRes = indice(M.herramientas, E.herr.res || E.herr.inh);
    const aC = si(E.authC), aR = si(E.authR);
    R.expoInh = exposicion(iInh, tInh, aC, aR);
    R.expoRes = exposicion(iRes, tRes, aC, aR);
    const compuerta = (e, i, t) => (e == null ? null : e === NO_VIABLE ? 'No viable' : i === 4 && t === 1 ? 'Viable con EII aprobada' : 'Viable');
    R.compuertaInh = compuerta(R.expoInh, iInh, tInh);
    R.compuertaRes = compuerta(R.expoRes, iRes, tRes);
    if (iRes && iInh && iRes > iInh) R.observaciones.push('La clasificación de la información con medidas no puede ser más sensible que la inherente.');
    if (R.expoRes && R.expoInh && R.expoRes !== NO_VIABLE && R.expoInh !== NO_VIABLE && R.expoRes > R.expoInh) R.observaciones.push('La herramienta con medidas no puede exponer más que la inherente.');

    // Paso 4 y 5: valores por factor
    const inh = {}, res = {};
    for (const f of M.factores) {
      let vi, vr, obs = null;
      if (f.calculado === 'info') { vi = iInh; vr = iRes; }
      else if (f.calculado === 'expo') {
        vi = R.expoInh == null ? null : Math.min(R.expoInh, 3);
        vr = R.expoRes == null ? null : Math.min(R.expoRes, 3);
      } else {
        const d = E.f[f.id] || {};
        vi = d.inh || null;
        vr = d.res && d.ruta ? d.res : vi;
        if (d.res != null && d.res !== vi) {
          const ruta = M.rutas.find((r) => r.id === d.ruta);
          if (vi == null) obs = 'Falta el puntaje inherente.';
          else if (d.res > vi) obs = 'El puntaje con medidas supera el inherente.';
          else if (!ruta) obs = 'Indique la medida que justifica la reducción.';
          else if (!ruta.factores.includes(f.id)) obs = `La medida «${ruta.nombre}» no aplica a este factor.`;
          else if (ruta.maxNiveles && vi - d.res > ruta.maxNiveles) obs = `La medida «${ruta.nombre}» reduce como máximo ${ruta.maxNiveles} nivel.`;
          if (obs) { vr = vi; R.observaciones.push(`${f.id}: ${obs}`); }
        }
        if (vi == null) R.faltantes.push(f.id);
      }
      inh[f.id] = vi; res[f.id] = vr;
      R.factores[f.id] = { inh: vi, res: vr, ruta: (E.f[f.id] || {}).ruta || null, observacion: obs };
    }

    // Faltantes de las listas y del paso 3
    if (!amb.sujeto) R.faltantes.push('Ámbito: tipo de organización');
    if (!amb.excepcion) R.faltantes.push('Ámbito: excepciones del art. 4');
    M.paso0.forEach((q) => { if (!E.p0[q.id] && !R.esIA) R.faltantes.push(q.id); });
    M.listaA.forEach((q) => { if (!E.A[q.id]) R.faltantes.push(q.id); });
    idsB.forEach((id) => { if (!(E.B[id] && E.B[id].aplica)) R.faltantes.push(id); });
    if (!iInh) R.faltantes.push('Clasificación de la información');
    if (!tInh) R.faltantes.push('Herramienta');

    // Dimensiones
    R.dim = {};
    for (const [d, def] of Object.entries(M.dimensiones)) {
      const ids = M.factores.filter((f) => f.dim === d).map((f) => f.id);
      const pick = (src) => Object.fromEntries(ids.map((id) => [id, src[id]]));
      let di = puntajeDimension(pick(inh), def.criticos);
      let dr = puntajeDimension(pick(res), def.criticos);
      if (d === 'D2') { if (inh['F2.1'] === 1) di = 1; if (res['F2.1'] === 1) dr = 1; }
      R.dim[d] = { inh: di, res: dr };
    }
    R.pisoAgInh = pisoAgencia(inh.AG, inh['F3.3']);
    R.pisoAgRes = pisoAgencia(res.AG, res['F3.3']);

    const completo = R.faltantes.length === 0;
    R.completo = completo;
    if (completo) {
      R.nivelInh = Math.max(R.dim.D1.inh, R.dim.D2.inh, R.dim.D3.inh, R.pisoBInh, R.pisoAgInh);
      const base = Math.max(R.dim.D1.res, R.dim.D2.res, R.dim.D3.res, R.pisoBRes, R.pisoAgRes);
      R.s5Aplicado = !!E.s5 && base === 2;
      R.nivelRes = R.s5Aplicado ? 1 : base;
      if (E.s5 && base !== 2) R.notas.push('La reducción por desempeño demostrado solo aplica a casos de nivel moderado.');
      if (R.s5Aplicado) R.notas.push('Reducción por desempeño demostrado: de moderado a bajo (aprueba el Oficial de IA con el área de riesgos).');

      // Agencia (autonomía máxima)
      const ag = res.AG, n = R.nivelRes;
      R.agencia = 'Compatible';
      if (n >= 3 && ag > 2) R.agencia = 'Incompatible: para aprobarse, el sistema solo debe proponer y una persona ejecutar (reducir la autonomía).';
      else if (n === 2 && ag > 3) R.agencia = 'Incompatible: para aprobarse, cada acción del sistema debe requerir aprobación humana previa (reducir la autonomía).';
      else if (n === 1 && ag === 4 && (res['F3.1'] > 2 || res['F1.1'] > 2)) R.agencia = 'Incompatible: la autonomía solo se admite con información pública o interna y sin efecto sobre terceros; cada acción debe requerir aprobación humana previa.';

      R.noViable = R.expoRes === NO_VIABLE || res['F2.5'] === 4;
      R.motivoNoViable = R.expoRes === NO_VIABLE ? 'La herramienta no puede procesar esta información. Cambie a una herramienta o entorno más protegido, o reduzca la información que se procesa (paso 3).' : res['F2.5'] === 4 ? 'Los datos personales salen del país sin garantías. Establezca garantías contractuales, use un entorno en el país o anonimice los datos.' : null;
      R.reduccion = R.nivelRes < R.nivelInh ? (R.nivelInh >= 3 && R.nivelRes < 3 ? 'Comité de Gobierno y Transformación Digital, con conformidad del área de riesgos' : 'Oficial de Inteligencia Artificial') : 'Sin reducción de nivel';
      R.tratamiento = M.tratamiento[R.nivelRes];
    }
    if (R.redisenados.length) R.notas.push(`El responsable declara que el caso de uso se rediseñó y ya no corresponde a ${R.redisenados.join(', ')}. Debe verificarse documentalmente que el nuevo caso de uso ya no está comprendido en el supuesto; requiere aprobación del Comité.`);
    if (E.s4) R.notas.push('Excepción temporal por un máximo de 6 meses con controles compensatorios; requiere aprobación del Comité y no cambia el nivel.');
    if (E.s2) R.notas.push('Usa una herramienta ya aprobada dentro de sus condiciones: hereda su clasificación; registrar en el inventario.');

    // Clasificación regulatoria (art. 22): solo depende del ámbito, de A1–A6 y de N1–N9.
    // Las medidas de reducción, el sandbox y los criterios adicionales no la modifican.
    const normaB = idsB.filter((id) => esNorma(id));
    const listasCompletas = M.listaA.filter((q) => esNorma(q.id)).every((q) => E.A[q.id]) && normaB.every((id) => E.B[id] && E.B[id].aplica);
    const baseDe = (id) => (M.listaA.find((q) => q.id === id) || M.listaB[id] || {}).base;
    const vigentesN = R.disparadores.filter((id) => esNorma(id) && !R.redisenados.includes(id));
    let cat, bases = [];
    if (!R.p0Completo) cat = 'PENDIENTE';
    else if (R.excepcion) { cat = 'FUERA_DE_AMBITO'; bases = [`D.S. 115-2025-PCM, ${R.excepcion.base}`]; }
    else if (!R.esIA) cat = 'NO_ES_IA';
    else if (R.prohibidosNorma.length) { cat = 'USO_INDEBIDO'; bases = R.prohibidosNorma.map(baseDe); }
    else if (vigentesN.length) { cat = 'RIESGO_ALTO'; bases = vigentesN.map(baseDe); }
    else if (!listasCompletas) cat = 'PENDIENTE';
    else { cat = 'RIESGO_ACEPTABLE'; bases = [M.regulatoria.RIESGO_ACEPTABLE.base]; }
    R.regulatoria = { categoria: cat, nombre: M.regulatoria[cat].nombre, baseLegal: bases.length ? bases : [M.regulatoria[cat].base].filter(Boolean), preliminar: true,
      redisenoPorVerificar: R.redisenados.filter(esNorma) };
    const regAlto = cat === 'RIESGO_ALTO';
    if (R.excepcion && R.excepcion.nota) R.notas.push(R.excepcion.nota);
    if (R.redisenados.some(esNorma)) R.notas.push('La clasificación regulatoria excluye los usos del art. 24.1 declarados como rediseñados solo de forma preliminar, hasta verificar el rediseño.');
    if (['RIESGO_ALTO', 'RIESGO_ACEPTABLE'].includes(cat)) R.notas.push('Las medidas de reducción registradas bajan el riesgo residual, pero no modifican por sí mismas la clasificación regulatoria.');
    if (cat === 'RIESGO_ACEPTABLE' && completo && R.nivelRes >= 3) R.notas.push('El nivel interno alto o crítico responde a la metodología de la herramienta (dimensiones, agencia o criterios adicionales); no equivale a la categoría jurídica de riesgo alto del art. 24.');
    if (R.prohibido && !R.prohibidosNorma.length) R.notas.push(`${R.prohibidos.join(', ')}: criterio(s) adicional(es) de la metodología, no uso(s) indebido(s) del art. 23.1. La herramienta no admite el caso, pero esa decisión no es una clasificación jurídica.`);
    if (R.sujeto === 'privado') R.notas.push('Sector privado: aplican los arts. 31 y 32. Las instancias de aprobación que propone la herramienta están pensadas para entidades públicas; adáptelas a su estructura de gobierno.');

    // Obligaciones aplicables, siempre como pendientes de evidencia: la herramienta no verifica su cumplimiento.
    R.obligaciones = ['RIESGO_ALTO', 'RIESGO_ACEPTABLE'].includes(cat) && R.sujeto
      ? M.obligaciones.filter((o) => o.sujetos.includes(R.sujeto) && (o.aplica === 'todos' || regAlto))
        .map((o) => ({ art: o.art, tema: o.tema, estado: o.requerida ? 'Requerida' : 'Pendiente de evidencia', items: o.items }))
      : [];
    if (completo && R.tratamiento) {
      R.eiiNormativa = regAlto ? (R.sujeto === 'privado' ? 'Voluntaria (art. 32); conservar la documentación al menos tres años' : 'Requerida (art. 30)') : 'No exigida por el art. 30 (el caso no es de riesgo alto)';
    }

    // Resultado final
    const s1 = E.s1 || {};
    const nCond = M.especiales.S1.condiciones.length;
    R.sandbox = !!s1.solicita && (s1.c || []).filter(Boolean).length === nCond;
    if (s1.solicita && !R.sandbox) R.notas.push(`Se pidió la clasificación experimental, pero no se cumplen las ${nCond} condiciones del entorno de prueba.`);
    if (R.sandbox) R.notas.push('La clasificación experimental es un criterio interno de la metodología y no modifica la clasificación regulatoria.');
    let estado, titulo;
    if (!R.p0Completo) { estado = 'incompleto'; titulo = 'Incompleto: responda el ámbito y el paso 0'; }
    else if (R.excepcion) { estado = 'fuera'; titulo = `Fuera del ámbito del Reglamento: ${R.excepcion.nombre.toLowerCase()} (${R.excepcion.base})`; }
    else if (!R.esIA) { estado = 'fuera'; titulo = 'Fuera de alcance: no es un sistema de IA'; }
    else if (R.prohibidosNorma.length) { estado = 'prohibido'; titulo = 'Uso indebido: prohibido'; }
    else if (R.prohibido) { estado = 'prohibido'; titulo = 'No admitido por criterio adicional'; }
    else if (R.sandbox) { estado = 'experimental'; titulo = 'Experimental (sandbox)'; }
    else if (!completo) { estado = 'incompleto'; titulo = `Incompleto: faltan ${R.faltantes.length} respuestas`; }
    else if (R.noViable) { estado = 'noviable'; titulo = 'No viable tal como está planteado'; }
    else { estado = M.niveles[R.nivelRes].clase; titulo = M.niveles[R.nivelRes].nombre; }
    R.estado = estado; R.titulo = titulo;
    R.condicionado = completo && R.agencia && R.agencia !== 'Compatible' && !['prohibido', 'fuera', 'experimental', 'noviable'].includes(estado);
    R.aprueba = ['prohibido', 'fuera'].includes(estado) ? 'No aplica' : estado === 'experimental' ? 'Oficial de Inteligencia Artificial (sandbox)' : completo ? (R.nivelRes === 1 && E.s2 ? 'Registro en el inventario de IA (vía rápida, herencia del catálogo)' : M.tratamiento[R.nivelRes].aprueba) : null;
    return R;
  }

  const api = { evaluar, exposicion, puntajeDimension, pisoAgencia, NO_VIABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOTOR = api;
})(typeof window !== 'undefined' ? window : globalThis);
