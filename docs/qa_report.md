# QA Report — GlucoPredict · Etapa 3

**Fecha:** 2026-10-03  
**Veredicto:** **PASS_WITH_FIXES**  
**Stage de entrada:** 2 (válido)  
**Stage de salida:** 3  
**Tolerancia numérica:** `rtol=1e-6`, `atol=1e-9` salvo campos enteros/booleanos/texto, que exigen igualdad exacta.

## Resumen ejecutivo

La lógica base del score FINDRISC/LA-FINDRISC era reproducible: antes de leer `engine_reference.py`, se implementó `03_qa_ux/qa_engine.py` usando únicamente `model_spec.json` y `base_glucopredict.xlsx`; los 19 vectores canónicos originales coincidieron 19/19 con los esperados. Después se comparó contra el motor de referencia y también hubo paridad 19/19.

La auditoría de bordes detectó una discrepancia real en **escenarios de BMI exactamente en 25/30**: el score clasificaba con BMI redondeado a 6 decimales, mientras el escenario usaba el flotante crudo. El score clínico base no cambiaba, pero el escenario podía retirar demasiados puntos. Se corrigieron ambos motores, especificación y vectores.

La auditoría de contrato detectó además coerciones silenciosas (edad fraccionaria truncada, booleanos no estrictos, números no finitos y país desconocido reflejado sin normalizar). Se endureció la validación. El set final contiene **29 vectores válidos + 9 vectores de error**, con paridad total entre motor QA, esperado y motor de referencia.

## Hallazgos y correcciones

### CRÍTICO — 0

No se encontró un defecto que cambie silenciosamente el score canónico de los 19 casos originales ni una carencia que obligue a rediseñar el modelo.

### MAYOR — 5, todos corregidos

| ID | Hallazgo | Riesgo | Corrección aplicada |
|---|---|---|---|
| M-01 | Escenario BMI usaba `raw_bmi` mientras scoring usaba `round(...,6)` | En fronteras 25/30 el escenario podía saltar un corte y retirar puntos incorrectos | `engine_reference.py`, `qa_engine.py`, `model_spec.json` y `test_vectors.json` usan `bmi_for_scoring` también en escenarios |
| M-02 | Motor aceptaba coerciones fuera del contrato | `44.9→44`, `"yes"`, `0/1`, strings numéricos o no finitos podían producir scores no previstos | Edad entera estricta; booleanos estrictos; medidas numéricas finitas; tests negativos |
| M-03 | Metadata de licencias incompleta/incorrecta | Riesgo de reutilización comercial no autorizada | M03 → CC BY 4.0; M09 → CC BY-NC 2.0; M07 → derechos de reutilización comercial `no_verificado`; Excel/CSV/model card corregidos |
| M-04 | PPP verificado se confundía con “precio verificado” | Presentar una hipótesis comercial como validada | MX/BR/PE marcados `preliminar`; notas aclaran que PPP verifica el insumo, no el willingness-to-pay |
| M-05 | Promesa/free tier podía insinuar predicción personal y canibalizar el informe | Riesgo clínico/marketing y monetización incoherente | `brief.json`: score + banda histórica + orientación, no diagnóstico/probabilidad; gratis = score/banda/factor/CTA; breakdown/scenarios/plan quedan en informe |

### MENOR — 2, corregidos

| ID | Hallazgo | Corrección |
|---|---|---|
| m-01 | `country_code` desconocido usaba perfil fallback pero devolvía el código desconocido | Salida normalizada a `DEFAULT_LATAM`; vector de fallback añadido |
| m-02 | Estados de revisión de fuentes no distinguían “corregido” de “no verificado” | `Fuentes`/CSV: M03 y M09 `corregido`; M07 `no_verificado`; Changelog 2.0.8 |

## A1. Reimplementación independiente

**Orden seguido para evitar contaminación:**
1. Se leyó `model_spec.json` + Excel base.
2. Se creó `03_qa_ux/qa_engine.py` sin inspeccionar `engine_reference.py`.
3. Se ejecutaron los 19 vectores originales: **19/19**.
4. Solo entonces se abrió `engine_reference.py`: **19/19** contra esperados y **19/19** motor QA vs referencia.
5. Tras robustez/correcciones se amplió el set: **29/29** válidos coinciden en las tres vías.
6. Vectores inválidos: **9/9** generan el error esperado en ambos motores.

**Paridad final**
- QA independiente ↔ esperado: **29/29**
- Referencia ↔ esperado: **29/29**
- QA independiente ↔ referencia: **29/29**
- Contrato inválido QA ↔ esperado: **9/9**
- Contrato inválido referencia ↔ esperado: **9/9**

## A2. Robustez

### Bordes explícitos
Probados los cortes de edad 44/45/54/55/64/65; BMI 25/30; cintura LA 90F/94M; cintura FINDRISC 80/88F y 94/102M; edad mínima 18 y máxima 80. Todos respetan el lado inclusivo/exclusivo especificado.

### Fuera de rango y valores no numéricos
Se rechazan edad fraccionaria, edad <18, altura/peso 0 o fuera de rango, cintura fuera de rango, booleanos no booleanos, `NaN`/`Infinity` representados como strings y campos requeridos ausentes. La implementación debe rechazar también JSON no finito antes de llegar al motor.

### Métrico vs imperial
El contrato del motor permanece métrico. Se añadió vector canónico de conversión con:
- `in → cm = in × 2.54`
- `lb → kg = lb × 0.45359237`

La UI puede presentar imperial; debe convertir antes de invocar el motor y enviar números JSON, no strings.

### Monotonicidad
Barridos discretos de score:
- edad 18→80: no decrece;
- peso/BMI manteniendo altura: no decrece;
- cintura LA-FINDRISC mujer: no decrece;
- cintura FINDRISC hombre: no decrece.

### Estabilidad numérica
BMI se calcula como flotante, se redondea a 6 decimales **solo para clasificación de corte y selección de escenario**, y a 2 decimales para visualización. Esto evita que representación binaria cambie pertenencia a 25/30.

## A3. Auditoría de parámetros críticos

Verificación web realizada el **2026-10-03**. “Verificado” significa que la cifra/regla está visible en una fuente primaria o publicación trazable; no convierte una referencia histórica en una probabilidad individual.

| Parámetro | Valor implementado | Estado | Evidencia |
|---|---:|---|---|
| Edad | `<45=0; 45–54=2; 55–64=3; ≥65=4` | verificado | Bernabe-Ortiz 2018, Appendix A / PMC6249987 |
| BMI | `<25=0; 25–<30=1; ≥30=3` | verificado | Bernabe-Ortiz 2018 / PMC6249987 |
| Cintura FINDRISC mujer | `<80=0; 80–<88=3; ≥88=4` | verificado | Bernabe-Ortiz 2018 / PMC6249987 |
| Cintura FINDRISC hombre | `<94=0; 94–<102=3; ≥102=4` | verificado | Bernabe-Ortiz 2018 / PMC6249987 |
| Cintura LA mujer | `<90=0; ≥90=4` | verificado | Bernabe-Ortiz 2018 + Yovera-Aldana 2024 |
| Cintura LA hombre | `<94=0; ≥94=4` | verificado | Bernabe-Ortiz 2018 + Yovera-Aldana 2024 |
| Actividad ≥30 min/día | sí 0 / no 2 | verificado | Bernabe-Ortiz 2018 |
| Fruta/verdura diaria | sí 0 / no 1 | verificado | Bernabe-Ortiz 2018 |
| Medicación hipertensión | no 0 / sí 2 | verificado | Bernabe-Ortiz 2018 |
| Historia glucosa alta | no 0 / sí 5 | verificado | Bernabe-Ortiz 2018 |
| Familia | no 0 / 2º grado 3 / 1º grado 5 | verificado | Bernabe-Ortiz 2018 |
| Score/bandas | 0–26; 0–6/7–11/12–14/15–20/21–26 | verificado | Frontiers 2023 / PMC10332265; porcentajes históricos 1/4/17/33/50 |
| PE threshold | LA-FINDRISC `≥11` | verificado | Yovera-Aldana 2024: n=549; sensibilidad 78.6%, especificidad 51.7%, AUROC 71.5% |
| PE FINDRISC comparator | `≥12` | verificado | Yovera-Aldana 2024: sensibilidad 70.4%, especificidad 53.9%, AUROC 69.2% |
| PPP consumo MX | 11.31 (2025) | verificado | World Bank PA.NUS.PRVT.PP, CC BY 4.0 |
| PPP consumo BR | 2.58 (2025) | verificado | World Bank PA.NUS.PRVT.PP, CC BY 4.0 |
| PPP consumo PE | 1.93 (2025) | verificado | World Bank PA.NUS.PRVT.PP, CC BY 4.0 |
| PPP PIB CO | 1532.72 (2025) | verificado | World Bank PA.NUS.PPP, CC BY 4.0 |
| PPP PIB ES | 0.57 (2025) | verificado | World Bank PA.NUS.PPP, CC BY 4.0 |
| Paddle Checkout | 5% + USD 0.50 | verificado | Paddle pricing + Master Services Agreement |
| Resend Pro | USD20 / 50k emails; overage USD0.90/1k | verificado | Resend pricing |
| Vercel invocation | USD0.0000006/invocation (Pro, anuncio 2026-05-29) | verificado | Vercel changelog |
| January API | Free 1k; Pro USD99/10k; Startup USD749/100k | verificado | January pricing |

**Nota de evidencia:** el estudio PE 2024 es una validación en **549 trabajadores de un hospital** (20–70 años) y el propio artículo pide más estudios en población general. Por ello el umbral PE puede marcarse “verificado” para esa evidencia, pero **no** como calibración nacional.

## A3. Auditoría de fuentes y licencias

| ID | Estado QA | Licencia/derechos observados | Acción |
|---|---|---|---|
| M01 | verificado | PLOS, Creative Commons Attribution | mantener atribución |
| M02 | verificado | Copyright editorial; acceso/reutilización no tratada como abierta | usar hechos/método referenciado; no copiar arte/texto |
| M03 | **corregido** | **CC BY 4.0** | metadata corregida |
| M04 | verificado | CC BY 4.0 | mantener atribución |
| M05 | verificado | contenido CDC; no asumir que cada elemento de terceros es PD | para reutilización del test, preferir M06 |
| M06 | verificado | **Public Domain** en CDC Stacks | fallback de contenido más seguro |
| M07 | **no_verificado** | manuscrito PMC; derechos de reutilización comercial de texto/figuras no demostrados | solo referencia factual; no reutilizar contenido |
| M08 | verificado | Commonwealth posee copyright; reproducción requiere contacto | enlazar; no reproducir sin permiso |
| M09 | **corregido** | **CC BY-NC 2.0** | solo referencia factual; no reutilizar contenido comercial |
| M10 | verificado | API comercial | respetar plan vigente |
| M11 | verificado | términos propietarios | revisar PHI/uso clínico antes de integrar |
| M12 | verificado | World Bank **CC BY 4.0** | atribuir |
| M13 | verificado | página/contrato comercial | dato de coste, no copiar branding |
| M14 | verificado | página comercial | dato de coste |
| M15 | verificado | página comercial | dato de coste |
| M16 | verificado | World Bank **CC BY 4.0** | atribuir |

### URLs de evidencia principal
- https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0299674
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6249987/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3225074/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3633111/
- https://stacks.cdc.gov/view/cdc/116374
- https://www.health.gov.au/resources/apps-and-tools/the-australian-type-2-diabetes-risk-assessment-tool-ausdrisk
- https://data.worldbank.org/indicator/PA.NUS.PRVT.PP
- https://data.worldbank.org/indicator/PA.NUS.PPP
- https://www.paddle.com/pricing
- https://resend.com/pricing
- https://vercel.com/changelog/function-invocations-now-billed-per-unit
- https://january.ai/pricing
- https://january.ai/developer-terms/v1.0

## A4. Coherencia de producto

**brief ↔ model_spec:** corregido lenguaje de “predicción” a score/banda histórica/orientación. El outcome que el modelo puede sostener es cribado/riesgo, no diagnóstico ni probabilidad calibrada individual.

**inputs ↔ engine:** los inputs visibles corresponden a variables de la regla; `country_code` es contexto runtime. Altura/peso se usan para BMI. La pregunta de sexo se formula como selección del umbral antropométrico publicado, sin inferir identidad de género.

**outputs ↔ monetización:** score, banda y CTA de seguridad quedan gratuitos. El valor pagado es profundidad: breakdown, escenarios, contexto, metodología e informe exportable.

**pricing:** PPP es un insumo verificable; willingness-to-pay sigue siendo hipótesis. Todos los precios de lanzamiento siguen sujetos a test de conversión.

**model_card ↔ engine:** documentados redondeo 6 decimales, escenarios no causales, límites de población y validación local.

## A5. Legal, privacidad y ética

### Salud
Aviso obligatorio en landing, preview e informe: herramienta educativa de cribado; no diagnóstico; score bajo no descarta enfermedad; síntomas, embarazo, diabetes conocida o preocupación clínica requieren orientación profesional. No se dan dosis, tratamiento ni se presenta una “probabilidad personal”.

### Privacidad
Minimización recomendada: edad en años (no fecha de nacimiento), medidas y respuestas de score; no nombre/dirección. Antes del gate, no persistir respuestas de salud en `localStorage`. Analytics no recibe valores clínicos, solo paso, país, versión y estado técnico.

### Sesgos / validez externa
- **País:** PE tiene evidencia local limitada a trabajadores hospitalarios; MX/BR/CO/ES permanecen preliminares.
- **Edad:** producto 18–80; evidencia PE 2024 reportada 20–70. Mostrar limitación si se usa fuera de esa muestra.
- **Sexo:** cortes binarios proceden del instrumento publicado. UX explica que la respuesta solo selecciona el umbral antropométrico y no infiere identidad de género.
- **Embarazo:** fuera de alcance para interpretación clínica.
- **Acceso:** no ocultar recomendación de seguimiento detrás de pago/email.

### Propiedad intelectual
**Open issue pre-lanzamiento:** realizar revisión legal del nombre/marca/instrumento FINDRISC y del alcance de uso comercial. La UI propuesta usa copy propio y tablas de hechos, no arte del cuestionario. Existe fallback CDC/ADA documentado en M06 como dominio público si la revisión legal exige cambiar instrumento. Este punto no requiere rediseño del motor para cerrar etapa 3, pero sí gate legal antes de lanzamiento comercial.

### January API
No es necesario para el score y **no debe** entrar en el cálculo clínico. Sus términos vigentes merecen revisión específica para PHI/uso clínico y plan contratado antes de cualquier feature futura; el MVP del score funciona sin este proveedor.

## A6. Archivos corregidos

- `02_datos_modelo/engine_reference.py`
- `02_datos_modelo/drive/model/engine_reference.py`
- `02_datos_modelo/model_spec.json`
- `02_datos_modelo/drive/model/model_spec.json`
- `02_datos_modelo/test_vectors.json`
- `02_datos_modelo/drive/model/test_vectors.json`
- `02_datos_modelo/model_card.md`
- `02_datos_modelo/drive/docs/model_card.md`
- `02_datos_modelo/fuentes_datos.csv`
- `02_datos_modelo/monetizacion.json`
- `01_estrategia/brief.json`
- `02_datos_modelo/drive/base/base_glucopredict.xlsx`
- `02_datos_modelo/drive_manifest.json`
- `handoff.json`
- `00_START_HERE.md`

Todas las correcciones quedan trazadas en el Changelog del Excel y en este informe.

## Parte B — Dictamen UX/UI

El diseño completo está en `ux_spec.md`, `sitemap_flows.md`, `design_tokens.json`, `components.md`, `copy_i18n.json`, `report_layout.md`, `analytics_events.json` y `prototype.html`.

Las tres decisiones con mayor impacto esperado en conversión sin comprometer seguridad son:
1. **Valor antes del gate:** score + banda + CTA de seguimiento visibles gratuitamente; el gate vende comprensión, no seguridad.
2. **Un input por pantalla + progreso real:** reduce carga cognitiva y hace creíble la promesa de <90 s.
3. **Preview con profundidad visible pero bloqueada:** muestra breakdown/escenarios/guía sin inventar resultados ni ocultar el hallazgo esencial.

## Open issues para Agente 4 / pre-lanzamiento

1. Revisión legal comercial de FINDRISC (marca/instrumento) y fallback CDC si aplica.
2. Validación local antes de promover umbrales MX/BR/CO/ES como “verificados”.
3. Experimentos A/B de precio por mercado; PPP no valida demanda.
4. Política de privacidad/retención y consentimientos concretos según jurisdicción de lanzamiento.
5. Si se integra January u otro API, revisión contractual/PHI separada; mantener el score determinista fuera de LLM/API.
