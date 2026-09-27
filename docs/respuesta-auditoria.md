# Respuesta a la auditoría frente al D.S. N.° 115-2025-PCM

Auditoría recibida el 27 de setiembre de 2026. Cada hallazgo se contrastó con el texto del Reglamento publicado en El Peruano. Cambios incluidos en la versión 1.5.0 de la metodología.

## Hallazgos aceptados y corregidos

| Hallazgo | ¿Tiene sustento? | Corrección |
|---|---|---|
| H-01 Mezcla de la clasificación jurídica con la escala 1–4 | Sí. El art. 22 define uso indebido, riesgo alto y riesgo aceptable (22.2); la escala de 4 niveles es propia y sus nombres («Aceptable-bajo», «Alto (crítico)») parecían categorías jurídicas. Además, los criterios AX producían «Uso indebido» y NX/SF un nivel «Alto» sin estar en los arts. 23 o 24. | Resultado separado: clasificación regulatoria preliminar (solo A1–A6, N1–N9 y ámbito) con base legal por literal, y nivel interno de gestión (Bajo, Moderado, Alto, Crítico). Un AX ya no se presenta como uso indebido del art. 23. |
| H-02 «Desactivación» del riesgo alto | En parte. Las medidas R1–R9 nunca desactivaban un disparador (solo lo hacía S3, el rediseño), pero la palabra «desactivados» y la falta de verificación daban pie a esa lectura. | S3 pasa a ser «rediseño declarado» que debe verificarse documentalmente; el reporte lo señala como pendiente. El reporte indica que las medidas bajan el riesgo residual pero no cambian la clasificación regulatoria. |
| H-03 Sandbox de 90 días | Sí. El art. 17 no fija un plazo. | Parámetro interno configurable (`SANDBOX_DIAS_MAX`), rotulado como criterio interno; el título ya no menciona el plazo y el sandbox no altera la clasificación regulatoria. |
| H-04 Falta de ámbito jurídico | Sí. El art. 3 distingue entidades públicas, empresas del Estado y sector privado/sociedad civil/academia; el art. 4 excluye el uso personal y la defensa y seguridad nacional. | El paso 0 pide el tipo de organización y la excepción del art. 4; una excepción deja el caso fuera del ámbito. |
| H-05 Art. 30 tratado como puntaje | Sí. | El reporte distingue la evaluación de impacto normativa (art. 30 requerida si hay riesgo alto; art. 32 voluntaria en el sector privado) de la evaluación que pide la metodología interna. |
| H-06 Sector privado | En parte. La herramienta está pensada para entidades públicas, pero el art. 3 c) incluye al sector privado. | Con el perfil jurídico privado, el reporte lista las obligaciones de los arts. 31 y 32 (incluida la conservación de documentos por tres años) y advierte que las instancias de aprobación son de referencia. |
| H-07 Evidencia y H-10 declaraciones de cumplimiento | En parte. La herramienta nunca dijo «cumple», pero tampoco listaba lo que debía acreditarse. | Lista de obligaciones aplicables (arts. 25, 29, 30, 31, 32) siempre como «pendiente de evidencia» o «requerida»; el aviso aclara que el resultado no certifica cumplimiento ni es pronunciamiento de la SGTD. |
| H-09 Grupos vulnerables | Sí (art. 12). | Registro de los grupos afectados especialmente en los datos del caso; aparece en el reporte y no cambia el nivel. |
| Arts. 20 y 33, estándares | Sí. | Se listan los cinco estándares del art. 33.1. |

## Pendientes o no adoptados

- **Gestión de evidencias, versionado e historial (prioridades 2 y 3).** La herramienta no guarda datos por diseño (privacidad y ausencia de servidor). El JSON exportado, con fecha y versión de la metodología, sirve como insumo para el inventario o un sistema de gestión documental de la entidad.
- **H-08 Impacto ambiental.** No se agregó una dimensión puntuable: los arts. 22 a 24, que definen la clasificación, no lo incluyen como criterio. Puede incorporarse como pregunta orientativa en una versión posterior.
- **Checklist institucional del art. 28.** Son obligaciones de la entidad, no de cada caso; se deja para un módulo aparte.
- **Arts. 8 a 11, 14 a 16, 18, 34 a 36.** Son funciones de la autoridad o políticas públicas; el aviso ya indica que el resultado no es actuación de la SGTD.
