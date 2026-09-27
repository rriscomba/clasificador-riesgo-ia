/*
 * Metodología de clasificación de riesgo de sistemas de IA — datos configurables.
 * Núcleo común para entidades públicas del Perú + perfiles sectoriales.
 * Todo el contenido normativo está aquí para que pueda revisarse y adaptarse sin tocar la lógica (motor.js).
 */
(function (root) {
  // Criterio interno configurable: el art. 17 del Reglamento no fija un plazo para los entornos experimentales.
  const SANDBOX_DIAS_MAX = 90;

  const M = {
    version: '1.5.0',
    fecha: '2026-09-27',
    aviso: 'Herramienta de apoyo a la autoevaluación. El resultado es una clasificación preliminar: no certifica el cumplimiento del Reglamento, no es una herramienta oficial de la SGTD-PCM ni constituye pronunciamiento o actuación de supervisión de la SGTD, y no sustituye la clasificación que corresponde a cada entidad. Las listas A y B se basan en los artículos 23 y 24 del D.S. N.° 115-2025-PCM (El Peruano, 9 de setiembre de 2025); ante dudas, los artículos 23.3 y 24.2 permiten consultar a la SGTD.',

    // Clasificación jurídica del art. 22 del Reglamento. Se determina solo con A1–A6 (art. 23.1) y N1–N9 (art. 24.1);
    // los criterios adicionales (AX, NX, SF), las medidas de reducción y el sandbox no la modifican.
    regulatoria: {
      USO_INDEBIDO: { nombre: 'Uso indebido (prohibido)', base: 'D.S. 115-2025-PCM, arts. 22.1 a) y 23.1' },
      RIESGO_ALTO: { nombre: 'Riesgo alto', base: 'D.S. 115-2025-PCM, arts. 22.1 b) y 24.1' },
      RIESGO_ACEPTABLE: { nombre: 'Riesgo aceptable', base: 'D.S. 115-2025-PCM, art. 22.2' },
      FUERA_DE_AMBITO: { nombre: 'Fuera del ámbito del Reglamento', base: 'D.S. 115-2025-PCM, art. 4' },
      NO_ES_IA: { nombre: 'No es un sistema de IA', base: 'Paso 0' },
      PENDIENTE: { nombre: 'Pendiente: faltan respuestas de los pasos 0 a 2', base: '' }
    },

    // Nivel interno de gestión: metodología propia de la herramienta, distinta de la categoría jurídica.
    niveles: {
      1: { nombre: 'Bajo', clase: 'bajo' },
      2: { nombre: 'Moderado', clase: 'moderado' },
      3: { nombre: 'Alto', clase: 'alto' },
      4: { nombre: 'Crítico', clase: 'critico' }
    },

    // Ámbito jurídico (arts. 3 y 4 del Reglamento).
    ambito: {
      sujetos: [
        { id: 'publica', nombre: 'Entidad de la Administración Pública', base: 'art. 3 a)' },
        { id: 'empresa', nombre: 'Empresa del Estado (FONAFE o de gobiernos regionales o locales)', base: 'art. 3 b)' },
        { id: 'privado', nombre: 'Sector privado, sociedad civil, academia o ciudadano', base: 'art. 3 c)' }
      ],
      excepciones: [
        { id: 'ninguna', nombre: 'Ninguna' },
        { id: 'personal', nombre: 'Uso para fines personales', base: 'art. 4 a)' },
        { id: 'defensa', nombre: 'Defensa y seguridad nacional', base: 'art. 4 b)', nota: 'La excepción exige cumplir los principios del art. 7: protección de derechos fundamentales, no discriminación, seguridad, proporcionalidad y fiabilidad, supervisión y rendición de cuentas.' }
      ]
    },

    // Art. 12: grupos cuyas necesidades diferenciadas deben atenderse. Se registra en el reporte; no cambia el nivel.
    gruposVulnerables: [
      { id: 'nna', nombre: 'Niñas, niños y adolescentes' },
      { id: 'mayores', nombre: 'Personas adultas mayores' },
      { id: 'discapacidad', nombre: 'Personas con discapacidad' },
      { id: 'mujeres', nombre: 'Mujeres' },
      { id: 'otros', nombre: 'Otras poblaciones en situación de vulnerabilidad' }
    ],

    // Obligaciones que el reporte lista como pendientes de evidencia. No modifican ningún puntaje.
    // aplica: 'todos' o 'alto' (clasificación regulatoria de riesgo alto); sujetos: a quién aplica (art. 3).
    obligaciones: [
      { art: 'Art. 25', tema: 'Transparencia', aplica: 'alto', sujetos: ['publica', 'empresa', 'privado'], items: ['Se informa de forma previa, clara y sencilla la finalidad, las funcionalidades principales y el tipo de decisiones', 'Etiquetado visible de IA (salvo procesos administrativos internos sin impacto directo en derechos)', 'Explicación en lenguaje accesible de las decisiones automatizadas que afecten derechos'] },
      { art: 'Art. 29', tema: 'Seguridad digital', aplica: 'todos', sujetos: ['publica', 'empresa'], items: ['Gestión de riesgos: cifrado, detección de anomalías y robustez del modelo', 'Privacidad desde el diseño: minimización y anonimización de datos personales', 'Auditorías de seguridad previas a la implementación y durante la operación', 'Gestión de incidentes dentro del sistema de gestión de seguridad de la información'] },
      { art: 'Art. 30', tema: 'Evaluación de impacto', aplica: 'alto', sujetos: ['publica', 'empresa'], requerida: true, items: ['Evaluación de impacto antes del desarrollo o la implementación', 'Medidas de mitigación adoptadas y documentadas para revisión judicial o administrativa'] },
      { art: 'Art. 31', tema: 'Obligaciones del sector privado', aplica: 'todos', sujetos: ['privado'], items: ['Registro actualizado y accesible del funcionamiento, fuentes de datos, lógica del algoritmo e impactos sociales y éticos esperados', 'Políticas de seguridad, privacidad, transparencia y rendición de cuentas', 'Formación interna sobre uso responsable de la IA', 'Supervisión humana en decisiones de riesgo alto (salud, educación, justicia, finanzas, servicios básicos)'] },
      { art: 'Art. 32', tema: 'Evaluación de impacto (sector privado)', aplica: 'alto', sujetos: ['privado'], items: ['Evaluación de impacto previa (voluntaria) y medidas de mitigación documentadas', 'Conservación de la documentación por un mínimo de tres años'] }
    ],

    tratamiento: {
      1: { ruta: 'Vía rápida', siguiente: 'Registre el caso en el inventario de IA y úselo con las reglas de uso aceptable.', aprueba: 'Registro en el inventario de IA (vía rápida)', eii: 'No requerida', validacion: 'Autoverificación del área dueña', monitoreo: 'Anual' },
      2: { ruta: 'Ruta con revisión del Oficial de IA', siguiente: 'Complete la evaluación de impacto simplificada y las pruebas previas; el Oficial de IA revisa y aprueba.', aprueba: 'Oficial de Inteligencia Artificial', eii: 'Simplificada', validacion: 'Pruebas previas al despliegue', monitoreo: 'Trimestral' },
      3: { ruta: 'Ruta con acompañamiento reforzado', siguiente: 'El caso puede avanzar. Antes de implementarlo se hacen la evaluación de impacto, la validación independiente y la auditoría de seguridad, con supervisión humana definida; el Oficial de IA acompaña el proceso hasta la aprobación del Comité.', aprueba: 'Comité de Gobierno y Transformación Digital', eii: 'Completa', validacion: 'Independiente de quien desarrolló', monitoreo: 'Mensual' },
      4: { ruta: 'Ruta con acompañamiento reforzado', siguiente: 'El caso puede avanzar con los mismos pasos que un caso alto, más pruebas adversariales e informe previo a la alta dirección; el Oficial de IA acompaña el proceso.', aprueba: 'Comité de Gobierno y Transformación Digital, con informe previo a la alta dirección u órgano de riesgos', eii: 'Completa', validacion: 'Independiente y pruebas adversariales', monitoreo: 'Mensual' }
    },

    perfiles: {
      nucleo: {
        nombre: 'Núcleo común',
        descripcion: 'Aplicable a cualquier entidad de la administración pública o empresa del Estado.',
        normas: [
          'Ley N.° 31814 y su Reglamento (D.S. N.° 115-2025-PCM)',
          'Estrategia Nacional de IA 2026-2030 (R.M. N.° 152-2026-PCM)',
          'Ley N.° 29733 y su Reglamento (D.S. N.° 016-2024-JUS)',
          'D.L. N.° 1412, Ley de Gobierno Digital, y D.S. N.° 029-2021-PCM',
          'D.U. N.° 007-2020, Marco de Confianza Digital',
          'Estándares del art. 33 del Reglamento: NTP-ISO/IEC 27002:2022, ISO/IEC 38507:2022, NTP-ISO/IEC 42001:2025, ISO/IEC 23053:2022 y NTP-ISO/IEC 27005:2022'
        ],
        listaB: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'NX1', 'NX2']
      },
      financiero: {
        nombre: 'Núcleo + sistema financiero',
        descripcion: 'Para entidades supervisadas por la SBS (banca de desarrollo, banca estatal, fondos).',
        normas: [
          'Reglamento de Gestión de Riesgos de Modelo (Res. SBS N.° 00053-2023)',
          'Reglamento de Gestión de la Seguridad de la Información y la Ciberseguridad (Res. SBS N.° 504-2021)',
          'Reglamento de Gestión del Riesgo Operacional (Res. SBS N.° 877-2020)'
        ],
        listaB: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'NX1', 'NX2', 'SF1', 'SF2', 'SF3', 'SF4', 'SF5', 'SF6']
      }
    },

    escalas: {
      sectorial: { nombre: 'Alcance sectorial o local', titulares: ['Ninguno', 'Hasta 100', 'De 101 a 10 000', 'Más de 10 000'] },
      nacional: { nombre: 'Alcance nacional masivo', titulares: ['Ninguno', 'Hasta 1 000', 'De 1 001 a 1 000 000', 'Más de 1 000 000'] }
    },

    paso0: [
      { id: 'P0.1', texto: '¿Infiere resultados (predicciones, clasificaciones, contenidos, recomendaciones o decisiones) a partir de datos, en lugar de ejecutar solo reglas fijas programadas?' },
      { id: 'P0.2', texto: '¿Incorpora un modelo de aprendizaje automático, de lenguaje o fundacional, o un componente de IA de un tercero, incluida la IA embebida en software ya contratado?' }
    ],

    // Art. 23.1 del D.S. N.° 115-2025-PCM (El Peruano, 9/9/2025). Los códigos AX son criterios adicionales, no del Reglamento.
    // Pregunta orientativa: no cambia la clasificación (principio de adicionalidad).
    adicionalidad: { id: 'P0.3', texto: '¿Podría lograrse el mismo resultado con reglas fijas o una automatización tradicional, sin IA?' },

    // Ficha de autorización del agente (perfil ACAP). Se activa si AG ≥ 3 o F3.3 ≥ 3. No cambia la clasificación.
    agente: {
      fronteras: [
        { id: 'unica', nombre: 'Solo dentro de la entidad' },
        { id: 'plataforma', nombre: 'Varias organizaciones en una plataforma compartida' },
        { id: 'multi', nombre: 'Varias plataformas u organizaciones, o fuera del país' }
      ],
      senales: [
        { id: 'deriva', nombre: 'Acciones que se acercan a los límites autorizados' },
        { id: 'privilegios', nombre: 'Intentos de acceder a datos o credenciales que no necesita' },
        { id: 'discrepancia', nombre: 'Diferencias entre el comportamiento en pruebas y en operación' }
      ],
      reautorizacion: { 1: 'anual', 2: 'semestral', 3: 'trimestral', 4: 'trimestral' },
      requeridos: ['mision', 'limites', 'conexiones', 'frontera', 'aprobacion', 'prohibidas', 'apagado', 'registro', 'supervisor', 'reautorizacion']
    },

    listaA: [
      { id: 'A1', texto: '¿Está destinado a influir de manera engañosa o manipuladora en la toma de decisiones de las personas (técnicas subliminales o engañosas, aprovechamiento de vulnerabilidades cognitivas, emocionales o socioeconómicas, o manipulación de información para afectar su autonomía)?', base: 'D.S. 115-2025-PCM, art. 23.1 a)' },
      { id: 'A2', texto: '¿Genera capacidad letal autónoma, con decisiones sin supervisión humana, que pueda causar daño físico o afectar la vida o integridad de las personas en el ámbito civil?', base: 'D.S. 115-2025-PCM, art. 23.1 b)' },
      { id: 'A3', texto: '¿Realiza vigilancia masiva sin base legal, o que genere o pueda generar un impacto desproporcionado en el ejercicio de derechos fundamentales?', base: 'D.S. 115-2025-PCM, art. 23.1 c)' },
      { id: 'A4', texto: '¿Analiza, clasifica o infiere datos sensibles (origen racial o étnico, opiniones políticas, afiliación sindical, convicciones religiosas o filosóficas, vida u orientación sexual) a partir de datos biométricos; o evalúa o clasifica a personas o colectivos, con cualquier dato, de forma que genere resultados discriminatorios o desproporcionados?', base: 'D.S. 115-2025-PCM, art. 23.1 d)' },
      { id: 'A5', texto: '¿Realiza identificación biométrica en tiempo real para categorizar personas en espacios públicos, fuera de las excepciones (verificación para autenticar la identidad digital, o investigación preliminar de los delitos graves que enumera la norma)?', base: 'D.S. 115-2025-PCM, art. 23.1 e)' },
      { id: 'A6', texto: '¿Predice que una persona cometerá un delito a partir de su perfil o de los rasgos de su personalidad? (No es uso indebido el apoyo a la evaluación humana basado en hechos objetivos y verificables de una actividad delictiva existente, con supervisión humana, transparencia y auditabilidad.)', base: 'D.S. 115-2025-PCM, art. 23.1 f) y 23.4' },
      { id: 'AX1', texto: '¿Califica a personas por su comportamiento social o características personales para darles un trato desfavorable no relacionado con el contexto (calificación social)?', base: 'Criterio adicional (EU AI Act, art. 5)' },
      { id: 'AX2', texto: '¿Se usa para eludir controles legales o de supervisión (fraccionar operaciones, ocultar información a supervisores, evadir controles de prevención del lavado de activos)?', base: 'Criterio adicional' },
      { id: 'AX3', texto: '¿Genera contenidos que suplantan a personas o instituciones con fines de engaño?', base: 'Criterio adicional' }
    ],

    // N1–N9: art. 24.1 del D.S. N.° 115-2025-PCM (el texto oficial pasa del literal b al e). NX y SF: criterios adicionales.
    listaB: {
      N1: { texto: '…la gestión de activos críticos nacionales que brindan soporte a servicios esenciales (energía, telecomunicaciones, salud, transporte, agua y banca, entre otros)?', base: 'D.S. 115-2025-PCM, art. 24.1 a)' },
      N2: { texto: '…la evaluación de niñas, niños y adolescentes en el sector educativo (acceso a un centro educativo, resultados de aprendizaje, nivel educativo, conductas prohibidas en exámenes), salvo que sea complementaria y no reemplace la evaluación pedagógica humana?', base: 'D.S. 115-2025-PCM, art. 24.1 b)' },
      N3: { texto: '…la selección, evaluación, contratación o cese de trabajadores o postulantes, o el establecimiento de condiciones laborales?', base: 'D.S. 115-2025-PCM, art. 24.1 e)' },
      N4: { texto: '…el acceso, la evaluación, el orden de priorización o el cese de programas sociales, o la focalización de hogares?', base: 'D.S. 115-2025-PCM, art. 24.1 f)' },
      N5: { texto: '…la evaluación crediticia de personas? (No incluye la detección de fraude financiero.)', base: 'D.S. 115-2025-PCM, art. 24.1 g)' },
      N6: { texto: '…el acceso a servicios de salud y servicios complementarios que afectan la vida y el bienestar de las personas?', base: 'D.S. 115-2025-PCM, art. 24.1 h)' },
      N7: { texto: '…el tamizaje, la evaluación, la sugerencia de diagnóstico, el manejo o el pronóstico de salud con impacto significativo, la priorización en emergencias, o la evaluación de datos sensibles, incluidas historias clínicas electrónicas?', base: 'D.S. 115-2025-PCM, art. 24.1 i)' },
      N8: { texto: '…la inferencia de emociones de personas en entornos de trabajo o centros educativos? (Salvo sistemas destinados a fines médicos o de seguridad.)', base: 'D.S. 115-2025-PCM, art. 24.1 i)' },
      N9: { texto: '…cualquier otro uso que suponga un riesgo para la vida, la seguridad física, los derechos fundamentales, la libertad o la dignidad, y cuyo desempeño implique una elevada probabilidad de estigmatización, discriminación o sesgo cultural, o una elevada complejidad para la supervisión humana?', base: 'D.S. 115-2025-PCM, art. 24.1 j)' },
      NX1: { texto: '…la elaboración de perfiles de personas a gran escala o su identificación mediante datos biométricos?', base: 'Criterio adicional (D.S. 016-2024-JUS: evaluación de impacto obligatoria)' },
      NX2: { texto: '…la fiscalización, sanción, investigación o evaluación de riesgo de personas en ámbitos de seguridad, justicia, tributación o migraciones?', base: 'Criterio adicional (EU AI Act, anexo III)' },
      SF1: { texto: '…la evaluación, calificación o límites de empresas u otras contrapartes (no personas naturales) para recibir créditos, líneas o garantías?', base: 'Criterio sectorial (finanzas, art. 28.11 del Reglamento)' },
      SF2: { texto: '…la asignación o priorización de fondos públicos o de fondos administrados por encargo de terceros?', base: 'Criterio sectorial (deber fiduciario)' },
      SF3: { texto: '…la evaluación o estructuración del financiamiento de proyectos o créditos compartidos entre entidades, incluida la priorización territorial de recursos?', base: 'Criterio sectorial (finanzas)' },
      SF4: { texto: '…las reglas de elegibilidad o calificación que terceros (canales, corresponsales o intermediarios) aplican a clientes con criterios definidos por la entidad?', base: 'Criterio sectorial (transparencia hacia clientes)' },
      SF5: { texto: '…decisiones de gestión de riesgos mediante un modelo sujeto al Reglamento de Gestión de Riesgos de Modelo de la SBS?', base: 'Res. SBS N.° 00053-2023' },
      SF6: { texto: '…el bloqueo, cierre o restricción de cuentas, tarjetas u operaciones de clientes, o su reversión?', base: 'Criterio sectorial (efecto directo sobre clientes)' }
    },

    // Escala común para todo el Estado, anclada en el TUO de la Ley N.° 27806 (D.S. N.° 021-2019-JUS) y la Ley N.° 29733.
    // Cada entidad puede indicar en el reporte cómo se llama cada nivel en su clasificación interna.
    informacion: [
      { id: 'publica', nombre: 'Pública', ayuda: 'Información ya divulgada o de acceso público', base: 'Ley N.° 27806, regla general de publicidad' },
      { id: 'interna', nombre: 'Interna', ayuda: 'Pública por ley pero no divulgada: borradores, procedimientos y documentos de trabajo sin datos protegidos', base: 'Categoría operativa' },
      { id: 'confidencial', nombre: 'Confidencial', ayuda: 'Excepciones de información confidencial (secreto comercial, datos personales no sensibles, entre otras) e información de terceros', base: 'TUO Ley N.° 27806, art. 17; Ley N.° 29733' },
      { id: 'restringida', nombre: 'Restringida', ayuda: 'Información secreta o reservada, datos sensibles, secreto bancario o tributario y credenciales', base: 'TUO Ley N.° 27806, arts. 15 a 17; Ley N.° 29733' }
    ],
    herramientas: [
      { id: 'interno', nombre: 'Entorno interno o dedicado aprobado' },
      { id: 'catalogo', nombre: 'Herramienta corporativa del catálogo institucional' },
      { id: 'nueva', nombre: 'Herramienta nueva, aún no evaluada' },
      { id: 'publica', nombre: 'Herramienta pública o cuenta personal' }
    ],

    dimensiones: {
      D1: { nombre: 'Impacto de IA en decisiones y derechos', criticos: ['F1.1', 'F1.3'] },
      D2: { nombre: 'Protección de datos personales', criticos: ['F2.1', 'F2.4'] },
      D3: { nombre: 'Ciberseguridad', criticos: ['F3.3'] }
    },

    factores: [
      { id: 'F1.1', dim: 'D1', nombre: 'Efecto en decisiones', escala: ['Ninguno: productividad personal', 'Insumo para tareas o decisiones internas, sin efecto sobre terceros', 'Insumo relevante, no determinante, para decisiones sobre terceros', 'Determina, automatiza o condiciona significativamente decisiones sobre terceros'] },
      { id: 'F1.2', dim: 'D1', nombre: 'Alcance de personas o entidades afectadas', escala: ['Solo el usuario', 'Un área o proceso interno', 'Varias áreas o contrapartes externas identificadas', 'Ciudadanos, beneficiarios o recursos públicos a escala'] },
      { id: 'F1.3', dim: 'D1', nombre: 'Potencial de sesgo o discriminación', escala: ['No evalúa personas ni entidades', 'Evalúa entidades con variables objetivas no sensibles', 'Usa variables que pueden actuar como sustitutas (región, sector, tamaño, género inferible)', 'Usa variables sensibles o datos históricos con sesgo conocido'] },
      { id: 'F1.4', dim: 'D1', nombre: 'Reversibilidad y explicabilidad', escala: ['Resultado verificable y reversible de inmediato', 'Reversible con esfuerzo moderado', 'Difícil de explicar o revertir', 'Efectos irreversibles'] },
      { id: 'F1.5', dim: 'D1', nombre: 'Exposición del resultado', escala: ['Uso personal', 'Uso interno compartido', 'Se comunica a contrapartes externas identificadas', 'Se publica o se dirige a la ciudadanía'] },
      { id: 'F2.1', dim: 'D2', nombre: 'Tipo de datos personales', escala: ['Ningún dato personal, o datos anonimizados', 'Datos personales básicos (identificación y contacto)', 'Datos financieros, laborales o protegidos por secreto bancario, tributario u otra reserva legal', 'Datos sensibles (salud, biométricos, origen, u otros definidos por la Ley N.° 29733)'] },
      { id: 'F2.2', dim: 'D2', nombre: 'Número de titulares', escala: 'titulares' },
      { id: 'F2.3', dim: 'D2', nombre: 'Finalidad y base legal', escala: ['No aplica o datos de fuentes públicas', 'Misma finalidad de la recopilación y base legal clara', 'Finalidad compatible que requiere análisis', 'Nueva finalidad sin base legal verificada'] },
      { id: 'F2.4', dim: 'D2', nombre: 'Uso de los datos por el sistema', escala: ['No usa datos personales', 'Consulta puntual, sin retención', 'Retención, entrenamiento o ajuste en entornos de la entidad', 'Perfiles de personas o entrenamiento de modelos por un tercero'] },
      { id: 'F2.5', dim: 'D2', nombre: 'Ubicación y flujo transfronterizo', escala: ['Datos en el Perú o sin datos personales', 'En el extranjero, con garantías verificadas', 'En el extranjero, garantías en verificación', 'En el extranjero sin garantías (no viable)'] },
      { id: 'F3.1', dim: 'D3', nombre: 'Clasificación de la información', calculado: 'info', escala: ['Pública', 'Interna', 'Confidencial', 'Restringida'] },
      { id: 'F3.2', dim: 'D3', nombre: 'Exposición por herramienta', calculado: 'expo', escala: ['Exposición mínima', 'Exposición moderada', 'Exposición alta', '—'] },
      { id: 'F3.3', dim: 'D3', nombre: 'Permisos y acciones del sistema', escala: ['Sin acceso a sistemas: solo lo que ingresa el usuario', 'Lectura de repositorios o sistemas institucionales', 'Escritura o modificación en sistemas internos', 'Acciones con efecto externo, irreversibles o que comprometen a la entidad (comunicaciones oficiales, pagos, contratos, despliegues, registros oficiales)'] },
      { id: 'F3.4', dim: 'D3', nombre: 'Superficie de ataque', escala: ['Uso interno con insumos controlados', 'Procesa documentos o datos provistos por terceros', 'Conectado a correo, web o fuentes externas en tiempo real', 'Expuesto a usuarios externos o a internet'] },
      { id: 'F3.5', dim: 'D3', nombre: 'Cadena de suministro', escala: ['Desarrollo interno controlado, o proveedor certificado (ISO/IEC 27001 y 42001) con cláusulas', 'Proveedor evaluado, sin certificación específica de IA', 'Código abierto o componentes de terceros sin verificación completa', 'Proveedor u origen desconocido'] },
      { id: 'F3.6', dim: 'D3', nombre: 'Criticidad del proceso', escala: ['No crítico', 'Soporte, con alternativa manual inmediata', 'Proceso misional relevante', 'Proceso crítico o servicio esencial (pagos, prestaciones, reportes regulatorios, infraestructura)'] },
      { id: 'AG', dim: 'AG', nombre: 'Nivel de agencia', escala: ['Sin agencia: solo responde', 'Asistiva: propone y la persona ejecuta', 'Delegada: ejecuta con aprobación humana previa', 'Autónoma: ejecuta sin aprobación previa'] }
    ],

    rutas: [
      { id: 'R1', simple: 'Quitar o disfrazar los datos que identifican a las personas, o usar datos ficticios.', nombre: 'Anonimización, seudonimización o datos sintéticos', factores: ['F2.1', 'F2.2', 'F2.4', 'F2.5'], valida: 'Oficial de Datos Personales', evidencia: 'Técnica aplicada y prueba de no reidentificación' },
      { id: 'R2', simple: 'Usar una herramienta o entorno más seguro, que no guarde ni reutilice la información.', nombre: 'Migración a un entorno más protegido', factores: ['F3.2', 'F3.5', 'F2.4', 'F2.5'], valida: 'Oficial de Seguridad y Confianza Digital', evidencia: 'Herramienta del catálogo o entorno aprobado, sin retención ni entrenamiento por terceros' },
      { id: 'R3', simple: 'Procesar solo la información necesaria y dejar fuera la más delicada.', nombre: 'Minimización y sanitización de la información', factores: ['F3.1', 'F3.2', 'F2.1', 'F2.2'], valida: 'Área dueña y Oficial de Seguridad', evidencia: 'Exclusión técnica de datos no necesarios; uso de extractos o agregados' },
      { id: 'R4', simple: 'Dar menos autonomía y permisos al sistema: que proponga y una persona apruebe.', nombre: 'Reducción de agencia y de permisos', factores: ['AG', 'F3.3'], valida: 'Oficial de IA y Oficial de Seguridad', evidencia: 'Persona en el circuito; solo lectura o borrador; lista cerrada de acciones' },
      { id: 'R5', simple: 'Limitar para qué y para quién se usa el sistema, por ejemplo solo uso interno o un piloto acotado.', nombre: 'Acotamiento del uso y del alcance', factores: ['F1.1', 'F1.2', 'F1.5'], valida: 'Oficial de IA', evidencia: 'Restricción técnica y procedimental documentada. No hace que un uso sensible del paso 2 deje de aplicar' },
      { id: 'R6', simple: 'Probar que el sistema no discrimina y poder explicar cada resultado.', nombre: 'Validación de sesgo y explicabilidad', factores: ['F1.3', 'F1.4'], maxNiveles: 1, valida: 'Área de riesgos o validador independiente', evidencia: 'Pruebas de equidad y explicación de factores por resultado' },
      { id: 'R7', simple: 'Agregar protecciones de seguridad: aislamiento, filtros, monitoreo y una alternativa manual.', nombre: 'Controles compensatorios de ciberseguridad', factores: ['F3.4', 'F3.6'], maxNiveles: 1, valida: 'Oficial de Seguridad y Confianza Digital', evidencia: 'Aislamiento, filtrado de entradas, prevención de fuga de datos, pruebas adversariales, monitoreo, alternativa manual' },
      { id: 'R8', simple: 'Trabajar con un proveedor certificado y un contrato con garantías.', nombre: 'Proveedor certificado y cláusulas contractuales', factores: ['F3.5', 'F2.5'], valida: 'Asesoría legal y Oficial de Seguridad', evidencia: 'Certificaciones vigentes, cláusulas de no entrenamiento, auditoría y garantías de flujo transfronterizo' },
      { id: 'R9', simple: 'Confirmar que existe base legal o consentimiento para usar los datos.', nombre: 'Base legal y consentimiento verificados', factores: ['F2.3'], valida: 'Oficial de Datos Personales', evidencia: 'Informe sobre base de legitimación y compatibilidad de la finalidad' }
    ],

    especiales: {
      S1: { nombre: 'Entorno de experimentación (sandbox)', diasMax: SANDBOX_DIAS_MAX, condiciones: ['Usa solo datos sintéticos, anonimizados o públicos', 'No produce efectos sobre personas, contrapartes ni decisiones', 'Se ejecuta en un entorno aislado de los sistemas productivos', `Dura como máximo ${SANDBOX_DIAS_MAX} días (criterio interno configurable; el art. 17 del Reglamento no fija un plazo)`, 'Tiene responsable designado y emitirá un informe de resultados'] },
      S2: { nombre: 'Herencia de clasificación del catálogo', texto: '¿Usa una herramienta del catálogo dentro de las condiciones de uso ya evaluadas (tipo de información, agencia y finalidad)?' },
      S3: { nombre: 'Rediseño de un caso de riesgo alto', texto: 'Se marca por disparador en el paso 2. Solo con un cambio real del caso de uso, aprobado y verificable documentalmente; las medidas de control no bastan y se prohíbe fragmentar sistemas.' },
      S4: { nombre: 'Excepción temporal', texto: '¿Se solicita operar con una brecha de control por un máximo de 6 meses, con controles compensatorios?' },
      S5: { nombre: 'Reducción por desempeño demostrado', texto: '¿Es un caso moderado con 12 meses de operación sin incidentes, desempeño estable y sin hallazgos de auditoría?' }
    },

    fuentes: [
      { nombre: 'TUO de la Ley N.° 27806, Ley de Transparencia y Acceso a la Información Pública (D.S. N.° 021-2019-JUS)', url: 'https://busquedas.elperuano.pe/normaslegales/texto-unico-ordenado-de-la-ley-n-27806-ley-de-transparenci-decreto-supremo-n-021-2019-jus-1835794-3/' },
      { nombre: 'D.S. N.° 115-2025-PCM – Diario Oficial El Peruano', url: 'https://busquedas.elperuano.pe/dispositivo/NL/2436426-1' },
      { nombre: 'D.S. N.° 115-2025-PCM – PDF en gob.pe', url: 'https://www.gob.pe/institucion/pcm/normas-legales/7133522-115-2025-pcm' },
      { nombre: 'Algorithmic Impact Assessment – Gobierno de Canadá', url: 'https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/responsible-use-ai/algorithmic-impact-assessment.html' },
      { nombre: 'EU AI Act, artículo 6 (clasificación de riesgo alto)', url: 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-6' },
      { nombre: 'ISO/IEC 42005:2025 – Evaluación de impacto de sistemas de IA', url: 'https://www.iso.org/standard/42005' },
      { nombre: 'Levels of Autonomy for AI Agents (Feng, McDonald y Zhang, 2025)', url: 'https://arxiv.org/abs/2506.12469' },
      { nombre: 'AI impact assessment tool – Gobierno de Australia', url: 'https://www.digital.gov.au/ai/impact-assessment-tool/introduction' }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.METODOLOGIA = M;
})(typeof window !== 'undefined' ? window : globalThis);
