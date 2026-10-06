# Brief estratégico — GlucoPredict

**Versión:** 1.0  
**Etapa:** 1 — Estrategia  
**Fecha:** 2 de octubre de 2026  
**Estado:** PIVOT aplicado, listo para Agente 2  
**Marca de trabajo:** GlucoPredict — dominio plausible `glucopredict.app` **no verificado**

## Resumen ejecutivo

**Veredicto: PIVOT — 87/100.** La oportunidad de mercado es fuerte y el MVP puede construirse rápido, pero la idea original debe abandonar en v1 la promesa de “predecir picos de glucosa” desde fotos/sueño/actividad sin biomarcadores. El wedge defendible es un **risk-to-action screener** basado en FINDRISC: score auditado, banda de riesgo, escenarios sobre factores modificables y conversión a una prueba confirmatoria.

**North star:** personas con score alto que completan una prueba A1C/FPG después del screening.

> Regla de seguridad y producto: GlucoPredict **no diagnostica** prediabetes ni diabetes. El cálculo lo hace código determinista o un modelo validado; un LLM solo puede redactar a partir de resultados ya calculados.

---

## 1. One-liner

Para adultos de 35–65 años con sobrepeso, antecedentes familiares o preocupación metabólica que no saben si deben hacerse una prueba, GlucoPredict predice su banda de riesgo de diabetes tipo 2 a 10 años a partir de 8 datos fáciles y entrega un score auditable, escenarios de puntos modificables y una recomendación de confirmación para que actúen antes de la consulta.

### Claim de interfaz recomendado

- ES: **“Conoce tu banda de riesgo en 90 segundos y qué factores de tu score puedes cambiar.”**
- EN: **“Know your 10-year risk band in 90 seconds—and which score factors you can change.”**
- PT-BR: **“Descubra sua faixa de risco em 90 segundos e quais fatores do seu score você pode mudar.”**

---

## 2. Dolor global con evidencia

| Dato | Cifra | Año | Región | Fuente |
|---|---:|---:|---|---|
| Adultos 20-79 con diabetes; 853 M proyectados en 2050. | 589 M | 2024 | Global | S01 — https://diabetesatlas.org/ |
| Personas con diabetes no diagnosticada. | 42.8% / ~252 M | 2024 | Global | S02 — https://www.ncbi.nlm.nih.gov/books/NBK618744/?report=printable |
| Adultos con IGT; población de alto riesgo. | ~635 M | 2024 | Global | S03 — https://diabetesatlas.org/data-by-indicator/impaired-glucose-tolerance-igt-estimates-20-79-y/people-with-igt-in-1000s/ |
| Adultos con IFG; no sumar directamente con IGT por solapamiento. | 488 M | 2024 | Global | S04 — https://diabetesatlas.org/data-by-indicator/impaired-fasting-glucose-ifg-estimates-20-79-y/people-with-ifg-in-1000s/ |
| Gasto sanitario atribuible a diabetes; +338% en 17 años. | USD 1.015 T | 2024 | Global | S05 — https://diabetesatlas.org/data-by-indicator/diabetes-related-health-expenditure/total-diabetes-related-health-expenditure-id-million/ |
| Muertes atribuibles a diabetes en adultos 20-79. | 3.4 M | 2024 | Global | S06 — https://diabetesatlas.org/ |
| Reducción relativa de incidencia con intervención intensiva de estilo de vida vs placebo. | -58% | 2002 | EE.UU.; alto riesgo | S08 — https://www.nejm.org/doi/full/10.1056/NEJMoa012512 |
| Riesgo metabólico y gasto regional. | 38.7 M IGT / USD 81 B | 2024 | Sudamérica y Centroamérica | S14 — https://diabetesatlas.org/data-by-location/region/south-and-central-america/ |

### Cuántas personas, frecuencia y coste actual

- **Escala:** 589 M de adultos de 20–79 años viven con diabetes y ~635 M tienen IGT. IGT e IFG se solapan y **no deben sumarse** para crear un “total de prediabetes”.
- **Problema oculto:** ~43% de quienes tienen diabetes no están diagnosticados. Eso convierte el screening en un problema recurrente de detección, no solo de manejo de pacientes conocidos.
- **Coste económico:** USD 1.015 T de gasto sanitario atribuible a diabetes en 2024; promedio aproximado de USD 1,760 por persona con diabetes según IDF.
- **Coste de alternativas consumer:** Levels USD 15/mes + sensor opcional ~USD 89/30 días; Signos USD 127–225/mes; ZOE USD 15.99/mes o USD 99.99/año. Un screener de bajo coste puede ocupar el top-of-funnel antes de que el usuario compre hardware o coaching.
- **Tiempo:** una calculadora de riesgo existente puede completarse en <=5 minutos (Diabetes UK). Por eso el diferencial no puede ser “calcular un número”; debe ser **cerrar el siguiente paso**: escenario modificable + prueba confirmatoria.
- **Riesgo:** ~3.4 M de muertes atribuibles a diabetes en 2024 entre 20–79 años. La app no pretende atribuir cuánto de ese riesgo se evita individualmente.

### Corrección de un claim de la idea original

No usar “~50% de los diabéticos tipo 2 son reversibles si se detectan temprano”. DiRECT encontró 46% de remisión a 1 año en una población seleccionada bajo un programa intensivo de pérdida de peso, no reversibilidad general. Para prediabetes/alto riesgo, la evidencia más sólida para el mensaje de producto es que DPP y Finnish DPS redujeron la incidencia relativa de T2D ~58% con intervención intensiva de estilo de vida.

---

## 3. Señales de demanda

| Señal | Volumen / evidencia | Tendencia | Confianza |
|---|---|---|---|
| Keyword proxy: prediabetes | ~368K/mes (proxy público, no Google Ads) | Alta demanda sostenida; tendencia exacta no verificada | Preliminar (S25) |
| Keyword proxy: type 2 diabetes | ~673K/mes (proxy público) | Alta demanda sostenida | Preliminar (S25) |
| Keyword proxy: continuous glucose monitoring | ~301K/mes (proxy público) | Interés creciente en metabolic tracking; validar por país | Preliminar (S25) |
| Keyword proxy: blood sugar monitor | ~91K/mes (proxy público) | Alta intención transaccional | Preliminar (S25) |
| Uso de calculadora gratuita | >3.55 M completaciones acumuladas | Demanda probada por auto-screening | Alta (S20) |
| Adopción app metabólica | January AI reporta 200K+ descargas | Demanda por insights device-free | Media (S21) |
| Comunidades | r/prediabetes y r/diabetes_t2: discusiones recurrentes sobre picos, A1c, CGM y qué hacer después | Dolor de interpretación y siguiente acción visible | Cualitativa (S26) |

**Nota:** los volúmenes de keywords son una señal preliminar de orden de magnitud, no un dato apto para forecast. Antes de decidir SEO programático, validar por país/idioma en Google Ads, Semrush o Ahrefs.

### Comunidades y gasto alternativo

Las conversaciones de `r/prediabetes` muestran un patrón útil para el JTBD: usuarios con A1C normal o limítrofe compran CGM, observan picos aislados y luego preguntan “¿esto significa que tengo prediabetes?”. Ese dolor de interpretación refuerza que el MVP debe **orientar a screening/confirmación**, no interpretar curvas CGM como diagnóstico.

Gasto observado en alternativas: gratuito en CDC/Diabetes UK; USD 15/mes en Levels antes de sensores; USD 127–225/mes en Signos; USD 99.99/año en ZOE. Esto deja espacio para un producto puntual de USD 5–9 equivalente PPP y para monetización B2B por derivación.

---

## 4. Competencia y hueco

| Alternativa | Precio | Modelo | Qué hace bien | Debilidad vs GlucoPredict |
|---|---|---|---|---|
| Diabetes UK – Know Your Risk | Gratis | Lead/mission-driven; partnerships/licensing en usos comerciales | Risk score de 10 años, muy usado, resultado inmediato | No centra la experiencia en escenarios cuantificados de puntos removibles ni en conversión a prueba en mercados ES/PT (S20) |
| CDC/ADA Prediabetes Risk Test | Gratis | Salud pública | Muy baja fricción; solo rasgos que el usuario conoce | Orientado a EE.UU.; identifica riesgo para hacerse prueba, pero no entrega simulador de score ni plan comercializable (S10) |
| January AI | App free limitada; API Pro USD 99/mes | Freemium B2C + API B2B | Meal scan + predicciones de glucosa sin sensor | Sus propios términos excluyen diagnóstico/decisión clínica; no sustituye un score validado de riesgo de T2D ni prueba confirmatoria (S21) |
| Levels | USD 15/mes o USD 80/año; CGM opcional ~USD 89/30 días | Suscripción + sensores/labs | Datos longitudinales, labs, comida, wearables | Mayor coste y onboarding; no está diseñado como tamizaje ultrarrápido de riesgo antes de una prueba (S22) |
| Signos | USD 127–225/mes según plazo | Suscripción CGM + coaching/weight loss | Feedback glucémico continuo | Hardware, coste alto y foco de pérdida de peso; demasiado pesado para top-of-funnel de screening (S23) |
| ZOE Plus | USD 99.99/año o USD 15.99/mes | Suscripción nutricional | Personalización de alimentación y educación | No está centrado en FINDRISC, riesgo de T2D ni derivación a prueba confirmatoria (S24) |

### Hueco

**“Evidence-based risk-to-action in under 90 seconds.”** Las calculadoras gratuitas resuelven el score; las apps metabólicas premium resuelven tracking. El hueco es conectar ambos extremos con: (1) score auditable, (2) “qué puntos puedo cambiar”, (3) escenario de score no causal, (4) CTA de confirmación bioquímica, (5) ES/PT nativo y (6) funnel de laboratorio/B2B.

---

## 5. Público, segmentos y países prioritarios

### Segmentos

**1. B2C: adultos 35–65 con señales de riesgo y sin diagnóstico confirmado**  
Tamaño: Global: hasta ~635 M con IGT como orden de magnitud; SACA: 38.7 M con IGT. No es TAM único porque IGT/IFG se solapan.  
Necesidad: Saber en <90 s si merece confirmar con A1C/FPG y qué factores modificables pesan en su score.

**2. Laboratorios/farmacias como canal de conversión**  
Tamaño: En México+Brasil+Perú hay ~11.2 M de personas con diabetes no diagnosticada (estimación por suma de IDF: 5.6+5.3+0.34 M), además de decenas de millones con IGT/IFG.  
Necesidad: Leads con intención y priorización de riesgo, sin prometer diagnóstico.

**3. Aseguradoras, EPS y empleadores**  
Tamaño: Subconjunto laboral de la población de alto riesgo; tamaño exacto por cobertura es open issue. Punto de partida: 30.8 M con IGT en México+Brasil+Perú (10.69+17.76+2.31 M).  
Necesidad: Tamizaje poblacional barato, trazable y derivación a confirmación; dashboard agregado y privacidad.

### Persona principal

**María / Carlos, 47 años** — Adulto con sobrepeso o cintura elevada, padre/madre con T2D o chequeo reciente que le generó preocupación; no tiene diagnóstico confirmado y no usa CGM.

**Job-To-Be-Done:** Cuando algo me hace pensar que podría estar en riesgo, quiero saber rápidamente si debería hacerme una prueba y qué cambios concretos podrían mejorar mi score, para llegar a una consulta con una siguiente acción clara.

**Disparador de compra:** Justo después de ver un A1C/glucosa 'en el límite', recibir un diagnóstico de diabetes de un familiar, notar aumento de peso/cintura, o consumir contenido sobre prediabetes.

### Países, orden de entrada

| # | País | Por qué |
|---:|---|---|
| 1 | México | 13.6 M con diabetes; ~5.6 M no diagnosticada; 10.69 M IGT; mercado hispanohablante escalable. |
| 2 | Brasil | 16.62 M con diabetes y 17.76 M IGT; mayor mercado regional; requiere PT-BR. |
| 3 | Perú | 2.31 M IGT y validaciones locales de FINDRISC/LA-FINDRISC; buen país para piloto metodológico. |
| 4 | Colombia | 3.03 M adultos con diabetes en 2024; expansión natural del stack en español. |
| 5 | España | 4.66 M con diabetes, 2.98 M IGT y mayor poder adquisitivo; mayor exigencia RGPD. |

**Estrategia:** landing y producto ES para México/Perú/Colombia; PT-BR en paralelo para Brasil. España después de validar el funnel y endurecer RGPD/privacy.

---

## 6. Tres soluciones y elección

Escala 1–5. **5 es mejor** en valor, precisión, facilidad de inputs, costo de operación y viralidad. En **riesgo legal, 5 = mayor riesgo**.

| Enfoque | Valor | Precisión | Inputs | Costo op. | Viralidad | Riesgo legal |
|---|---:|---:|---:|---:|---:|---:|
| A. Risk-to-Action FINDRISC | 4 | 4 | 5 | 5 | 4 | 2 |
| B. Predicción device-free de spikes por comida | 5 | 2 | 4 | 3 | 5 | 4 |
| C. CGM/labs first | 5 | 5 | 2 | 1 | 4 | 5 |

### Elegido: A. Risk-to-Action FINDRISC

Es la mejor combinación de velocidad, trazabilidad, bajo coste y utilidad. La idea original de spikes sin sensor se mueve a v2 porque es más difícil de validar, aumenta el riesgo regulatorio y ya tiene un competidor directo fuerte (January AI). El CGM-first queda para un producto premium posterior.

---

## 7. Qué predice

**Variable objetivo:** banda de riesgo de desarrollar T2D a 10 años basada en FINDRISC.  
**Unidad:** score 0–26, banda y referencia porcentual histórica por banda.  
**Horizonte:** 10 años.  
**Granularidad:** individuo + escenarios contrafactuales de score.  
**Tipo:** puntaje de riesgo determinista; en v2, recalibración estadística por país.

### Fórmula base FINDRISC

- Edad: <45=0; 45–54=2; 55–64=3; >=65=4.
- BMI: <25=0; 25–<30=1; >=30=3.
- Cintura original: H <94=0, 94–102=3, >102=4; M <80=0, 80–88=3, >88=4.
- Actividad >=30 min/día: sí=0; no=2.
- Frutas/verduras diarias: sí=0; no=1.
- Medicación regular para hipertensión: no=0; sí=2.
- Glucosa alta previa: no=0; sí=5.
- Familiar con diabetes: ninguno=0; 2.º grado=3; 1.er grado=5.
- Bandas: 0–6 → 1%; 7–11 → 4%; 12–14 → 17%; 15–20 → 33%; 21–26 → 50%.

**Importante:** esos porcentajes son la referencia publicada del score original. En Latinoamérica, el producto debe evitar llamarlos “tu probabilidad personal” hasta recalibrar. En Perú, FINDRISC mostró AUROC ~0.69 para T2D no diagnosticada y LA-FINDRISC ~0.68 en una validación poblacional; otra validación 2024 mostró ligera ventaja de LA-FINDRISC en personal sanitario.

### Simulador de puntos modificables

Variables elegibles: BMI, cintura, actividad y frutas/verduras. El motor calcula `score_actual`, `puntos_modificables_actuales`, `score_piso_teorico` y `banda_resultante`. Para BMI, puede mostrar kg para cruzar el próximo umbral: `peso_umbral = BMI_umbral × altura_m²`.

Nunca redactar “si bajas X kg tu riesgo real pasa de 17% a 4%”. Redacción permitida: **“si tus medidas cruzaran estos umbrales, tu score FINDRISC bajaría X puntos y entraría en la banda de referencia Y.”**

### Candidatos para Agente 2

- FINDRISC original (Lindström & Tuomilehto 2003): fórmula publicada y auditable.
- LA-FINDRISC: adaptación de cintura para Latinoamérica; umbrales deben confirmarse por país.
- Simplified FINDRISC peruano (4 variables) como experimento de reducción de fricción, no default global.
- Recalibración logística/isotónica por país usando cohortes/datasets con outcome bioquímico, si Agente 2 identifica datos suficientes.
- January API u otro modelo device-free solo como candidato v2 para nutrición/meal response; nunca como motor diagnóstico del MVP.

**Regla LLM:** El cálculo se ejecuta en código determinista o modelo validado. Un LLM puede redactar explicaciones a partir de variables/resultados ya calculados, sin cambiar score, banda, umbrales ni recomendaciones clínicas.

---

## 8. Inputs — hipótesis

Diseñar 8 **grupos de input** que un usuario conozca o pueda medir en <2 minutos:

- Edad (años).
- Sexo usado únicamente para el umbral de cintura del score original; revisar inclusión/localización.
- Altura y peso (un solo paso de 'medidas corporales'; BMI calculado automáticamente).
- Circunferencia de cintura en cm con instrucción visual.
- Actividad física diaria >=30 min (sí/no).
- Consumo diario de frutas/verduras (sí/no).
- Uso regular de medicación para presión arterial (sí/no).
- Historia de glucosa alta y antecedente familiar de diabetes (dos respuestas en una pantalla de antecedentes).

No pedir laboratorio, sensor, genética ni instrumentos salvo cinta métrica/balanza doméstica. Para embarazo, diabetes diagnosticada, síntomas agudos o edad fuera de rango, mostrar ruta de exclusión/consulta.

---

## 9. Alcance del MVP

### IN
- Onboarding y resultado en <90 segundos.
- FINDRISC 0–26 con lógica exacta y unit tests.
- Bandas: 0–6, 7–11, 12–14, 15–20, 21–26.
- Referencia de riesgo original: 1%, 4%, 17%, 33%, 50%, etiquetada como referencia poblacional del modelo original.
- Simulador 'What can I change?': recalcula solo BMI, cintura, actividad y frutas/verduras; nunca promete causalidad.
- Kg aproximados para alcanzar el siguiente umbral de BMI (30 o 25) usando altura; no prescribe pérdida de peso.
- CTA de prueba confirmatoria (A1C/FPG) para score configurable por país; demo inicial >=12, sujeto a Agente 2.
- Email gate para informe completo; copia al dueño solo con consentimiento explícito en piloto, o evento anonimizado por defecto.
- Copy ES + EN + PT-BR y SEO básico en los tres idiomas.
- Aviso: no diagnostica prediabetes/diabetes; resultados anormales o síntomas requieren profesional/prueba.

### OUT
- Predicción de picos de glucosa desde fotos/sueño/actividad.
- Diagnóstico de prediabetes o diabetes.
- Interpretación de CGM como screening/diagnóstico.
- Dosis, cambios de medicamentos o consejos para suspender antihipertensivos.
- Planes dietarios clínicos personalizados.
- Integraciones EHR, aseguradoras o dashboards poblacionales.

### V2
- Carga de A1C/FPG/OGTT y rutas de derivación según guía local.
- Recalibración por país/sexo/edad y validación prospectiva.
- Wearables y CGM como contexto de comportamiento, no diagnóstico sin evidencia.
- Foto de comida para estimación nutricional; solo añadir predicción glucémica si se valida separadamente.
- Programa de 12 semanas con seguimiento, recordatorios y medición de cambio de score.
- Dashboard B2B agregado con privacy-by-design y umbrales configurables.

### Regla de 90 segundos

Landing → Start → 8 grupos de respuestas → preview. No cuenta email como requisito para ver el score básico. El email se pide para el informe completo en Fase 1.

---

## 10. Métricas con metas numéricas

### Producto

| Métrica | Meta |
|---|---:|
| Visita -> inicio | >=40% |
| Inicio -> vista previa | >=70% |
| Vista previa -> solicitud de informe por email | >=30% |
| Solicitud -> pago (Fase 2) | >=12% |
| Score >=12 -> clic 'Agenda tu prueba' | >=10% |
| Lead de laboratorio -> prueba confirmada (con 2 alianzas) | >=8% |

### Modelo

| Métrica | Meta |
|---|---:|
| Paridad del algoritmo con casos canónicos FINDRISC | 100% |
| Errores de banda en pruebas de frontera | 0/100 casos de QA |
| AUROC externo en mercado inicial (si se valida contra outcome bioquímico) | >=0.68; no peor que evidencia peruana publicada |
| Sensibilidad a umbral de derivación seleccionado | >=70% cuando dataset local lo permita |
| Calibración si se publica probabilidad personalizada | calibration slope 0.8–1.2 e intercepto |<=0.1|; hasta entonces, no publicar probabilidad recalibrada |

### Negocio

| Métrica | Meta |
|---|---:|
| CAC B2C blended | <=USD 3.50 por comprador en mercados LatAm tras SEO orgánico maduro |
| Ingreso B2C por comprador | USD 5–9 equivalente PPP por informe/programa inicial |
| Margen bruto por informe digital | >=85% antes de CAC |
| Ingreso por lead de laboratorio | USD 2–5, hipótesis a validar |
| B2B2C screening | USD 1–2 por persona/año, hipótesis a validar |

La métrica de modelo más importante en v1 no es “accuracy de IA”, sino **correctitud exacta del score**. La evaluación AUROC/calibración entra cuando Agente 2 disponga de outcome bioquímico.

---

## 11. Modelo de negocio

**Gratis:** Score, banda, explicación de factores, un escenario modificable, plan básico y CTA a prueba confirmatoria.

**Pago:** Informe completo + plan conductual de 12 semanas no clínico, metas semanales, recordatorios y resumen para llevar al médico. Suscripción solo si el seguimiento demuestra recurrencia.

### Precio hipotético por país

| País | Precio test | Lógica |
|---|---:|---|
| Estados Unidos | USD 9 | Ancla de referencia del concepto original. |
| México | MXN 99 | Precio psicológico PPP; hipótesis, no conversión FX. |
| Brasil | BRL 29.90 | PPP y benchmark de apps; test A/B. |
| Perú | PEN 19.90 | PPP; test A/B con laboratorios. |
| Colombia | COP 24,900 | PPP y redondeo local; hipótesis. |
| España | EUR 7.99 | Menor que una mensualidad wellness; hipótesis. |

### Upsells
- Derivación a laboratorio: USD 2–5 por lead cualificado o revenue share, sujeto a regulación local.
- Re-evaluación a 12 semanas y comparación de score.
- Family pack / 3 evaluaciones a precio bundle.
- B2B dashboard agregado para empleador/aseguradora sin exponer resultados individuales sin base legal/consentimiento.

### Canales
- SEO programático: diabetes risk calculator, prediabetes test, FINDRISC, waist/BMI risk, localized ES/PT.
- Comunidades: r/prediabetes, foros y grupos metabólicos con contenido educativo, no diagnóstico.
- Creadores de salud metabólica con CTA a screening y confirmación.
- Farmacias y laboratorios con QR en campañas de A1C/FPG.
- Aseguradoras/EPS/empleadores: campañas de screening voluntario.

### Fases
- Fase 1 VALIDACIÓN: vista previa gratis; usuario deja email para informe completo. En piloto, cualquier copia identificable al dueño exige consentimiento explícito; default recomendado = analytics desidentificados.
- Fase 2 COBRO: pago antes del informe/programa completo; conservar resultado gratuito y CTA de prueba.
- Fase 3 B2B2C: laboratorios y pagadores con dashboard agregado y acuerdos de tratamiento de datos.

**Gancho viral:** Tarjeta compartible 'I can remove X FINDRISC points' / 'Posso reduzir X pontos do meu score' sin mostrar peso, cintura, historial ni porcentaje clínico.

---

## 12. Riesgos y mitigación

| Riesgo | Nivel | Por qué importa | Mitigación |
|---|---|---|---|
| Regulatorio / medical-device claim | Alto | Decir 'diagnostica prediabetes' o 'predice glucosa' puede sacar el producto de wellness y activar regulación de software médico según jurisdicción. | MVP = evaluación de riesgo publicada + derivación a prueba; claims clínicos revisados país por país; no diagnóstico, tratamiento ni predicción de glucosa. |
| Validez externa y calibración | Alto | FINDRISC se calibró originalmente en Finlandia; cintura y desempeño cambian por población. En Perú AUROC ~0.69. | Mostrar score/banda como herramienta de screening; umbrales configurables; LA-FINDRISC/country validation; no probabilidad personalizada hasta recalibrar. |
| Causalidad del simulador | Alto | Quitar puntos al modificar BMI/cintura/actividad no prueba que una persona reduzca exactamente su riesgo de 17% a 4%. | Etiqueta 'score scenario'; separar reducción de puntos de evidencia causal; citar DPP/DPS para beneficios de estilo de vida en alto riesgo, sin prometer magnitud individual. |
| Privacidad de datos de salud | Alto | La app procesa datos sensibles de salud en UE, México, Brasil, Perú y otros mercados. | Minimización, consentimiento explícito cuando corresponda, cifrado, retención corta, export/delete, separación de identidad y respuestas, DPA con proveedores. |
| Falsa tranquilidad / alarma | Medio-Alto | Un score bajo no descarta disglucemia y uno alto no diagnostica. | Mensajes obligatorios, rutas de prueba confirmatoria, flags para síntomas/embarazo/diabetes conocida y exclusión del flujo de wellness. |
| Propiedad intelectual / licencia de FINDRISC | Medio | El instrumento tiene atribución/copyright; uso comercial y traducciones deben revisarse. | Agente 2/4 deben confirmar derecho de implementación y textos exactos; mantener trazabilidad a paper y considerar score alternativo si la licencia lo exige. |
| Dependencia de partners | Medio | Economía B2B depende de laboratorios, tracking de citas y acuerdos por país. | MVP funciona sin partner; CTA externo al inicio; medir leads y luego integrar booking. |
| Competencia | Medio | Hay calculadoras gratuitas y apps metabólicas con CGM/AI. | Hueco = risk-to-action en <90 s, score contrafactual auditable, localización ES/PT y derivación a prueba. |

### Guardia clínica mínima

ADA 2026 reconoce el uso de calculadoras de riesgo validadas para screening de riesgo, pero el diagnóstico de prediabetes/diabetes depende de A1C o glucosa plasmática. También indica evidencia insuficiente para CGM como herramienta de screening/diagnóstico. El MVP se alinea con esa frontera: **orientar → confirmar → actuar con profesional**.

---

## 13. Scorecard 0–100 y veredicto

| Dimensión | Puntos | Máx. | Racional |
|---|---:|---:|---|
| Mercado | 24 | 25 | Problema global >500 M diabetes y >600 M IGT; entrada regional de decenas de millones. |
| Dolor | 19 | 20 | Alta carga no diagnosticada, mortalidad y gasto; necesidad de siguiente acción. |
| Disposición de pago | 15 | 20 | Competidores cobran USD 15–225/mes, pero el screening básico gratuito limita el precio del informe. |
| Factibilidad datos/modelo | 13 | 15 | Algoritmo publicado y validaciones; falta recalibración país por país/licencia. |
| Viralidad | 7 | 10 | Scores y 'puntos removibles' son compartibles, pero salud sensible limita sharing. |
| Rapidez MVP | 9 | 10 | Motor determinista de 8 ítems + informe; sin hardware ni ML. |
| **TOTAL** | **87** | **100** | **PIVOT** |

### Veredicto: PIVOT (aplicado)

La idea **sí sigue adelante**, pero no como predictor de glucosa device-free en v1. Se convierte en un motor de screening de riesgo + score contrafactual + derivación. El upside comercial queda en transformar un “número gratis” en una acción medible: **prueba confirmatoria realizada**.

---

## Anexo A. Copy de interfaz ES / EN / PT-BR

| Elemento | ES | EN | PT-BR |
|---|---|---|---|
| CTA hero | Conoce tu riesgo en 90 segundos | Check your risk in 90 seconds | Veja seu risco em 90 segundos |
| Resultado | Tu banda de riesgo a 10 años | Your 10-year risk band | Sua faixa de risco em 10 anos |
| Simulador | Qué puntos puedes cambiar | Which points can you change? | Quais pontos você pode mudar? |
| CTA laboratorio | Agenda una prueba confirmatoria | Book a confirmatory blood test | Agende um exame confirmatório |
| Seguridad | Esto no diagnostica prediabetes ni diabetes. | This does not diagnose prediabetes or diabetes. | Isto não diagnostica pré-diabetes nem diabetes. |
| Email gate | Envíame mi informe completo | Email me my full report | Enviar meu relatório completo por e-mail |

## Anexo B. SEO inicial ES / EN / PT-BR

**ES title:** Calculadora de riesgo de diabetes tipo 2 | GlucoPredict  
**ES meta:** Estima tu banda de riesgo en 90 segundos con un score validado y descubre qué factores de tu score son modificables. No sustituye una prueba médica.

**EN title:** Type 2 Diabetes Risk Calculator | GlucoPredict  
**EN meta:** Estimate your 10-year risk band in 90 seconds with a validated score and see which score factors you can change. Not a diagnosis.

**PT-BR title:** Calculadora de risco de diabetes tipo 2 | GlucoPredict  
**PT-BR meta:** Estime sua faixa de risco em 90 segundos com um score validado e veja quais fatores do score podem mudar. Não é diagnóstico.

## Anexo C. Decisiones y supuestos

### Decisiones
- PIVOT aplicado: de 'glucose spike predictor' a 'risk-to-action screening' no invasivo.
- Motor del MVP: cálculo determinista, no LLM.
- Promesa central: saber si conviene confirmar con prueba y ver qué puntos del score son modificables.
- Prioridad geográfica: México -> Brasil -> Perú; luego Colombia y España.
- No usar CGM para screening/diagnóstico en MVP; ADA 2026 señala evidencia insuficiente para ese uso.
- Separar explícitamente 'score scenario' de reducción causal de riesgo.
- Diseñar referral a A1C/FPG como north star para score alto, no la venta del informe.
- Localización desde v1 en español, inglés y portugués brasileño.

### Supuestos
- Se conserva el nombre GlucoPredict como marca de trabajo; glucopredict.app es solo un dominio plausible y no se verificó disponibilidad ni trademark.
- El MVP deja de prometer predicción de picos glucémicos sin sensor. Ese feature pasa a v2 solo si existe validación específica.
- La unidad de valor del MVP es score/banda FINDRISC y un simulador de score; los porcentajes 1/4/17/33/50% se etiquetan como referencia histórica del modelo original.
- El umbral demo para CTA de prueba será score >=12, pero Agente 2 debe confirmar/cambiarlo por país y caso de uso.
- Las cifras IGT e IFG no se suman para estimar personas únicas porque hay solapamiento.
- Volúmenes de keywords de S25 son proxies preliminares; deben verificarse en Google Ads/Semrush/Ahrefs antes de invertir en SEO.
- Precios B2C/B2B son hipótesis de validación, no precios de mercado establecidos.
- La copia al dueño en Fase 1 no debe contener datos de salud identificables sin consentimiento explícito; recomendado: copia desidentificada/analytics.
- El claim original '~50% reversible si se detecta temprano' se retira: la evidencia respalda prevención/retraso en alto riesgo y remisión en una proporción de pacientes bajo programas intensivos seleccionados, no reversibilidad general.

### Open issues para Agente 2/4
- Confirmar licencia/copyright de FINDRISC para uso comercial, traducciones y reproducción literal de preguntas.
- Agente 2: elegir FINDRISC vs LA-FINDRISC por país y fijar umbral de referral con evidencia local.
- Agente 2: localizar datasets con outcome A1C/FPG/OGTT para recalibración y validación externa.
- Validar disponibilidad de dominio y trademark GlucoPredict.
- Revisar regulación de software médico y publicidad sanitaria en México, Brasil, Perú, Colombia y España.
- Validar keyword volumes/trends con fuente profesional por idioma/país.
- Validar disposición a pagar y CAC con landing + email gate antes de construir plan de 12 semanas.
- Definir contrato/consentimiento para compartir lead de salud con laboratorios.
- Revisar UX para cintura: instrucción de medición consistente y posible adaptación por etnia/país.

## Fuentes

- **S01** — Adultos de 20-79 años con diabetes y proyección 2050: 589 millones en 2024; 853 millones proyectados en 2050 (1 de 9 -> 1 de 8) (2024/2050, Global). https://diabetesatlas.org/ — IDF Diabetes Atlas 11th ed.; organismo internacional; confianza: Alta.
- **S02** — Diabetes no diagnosticada: 42.8%-43%; ~252 millones de adultos con diabetes no saben que la tienen (2024, Global). https://www.ncbi.nlm.nih.gov/books/NBK618744/?report=printable — IDF Diabetes Atlas / NCBI Bookshelf; confianza: Alta.
- **S03** — Tolerancia alterada a la glucosa (IGT): 634.8 millones (~635 M), 1 de 8 adultos de 20-79 años (2024, Global). https://diabetesatlas.org/data-by-indicator/impaired-glucose-tolerance-igt-estimates-20-79-y/people-with-igt-in-1000s/ — IDF Diabetes Atlas; confianza: Alta.
- **S04** — Glucosa alterada en ayunas (IFG): 488 millones, 1 de 11 adultos de 20-79 años (2024, Global). https://diabetesatlas.org/data-by-indicator/impaired-fasting-glucose-ifg-estimates-20-79-y/people-with-ifg-in-1000s/ — IDF Diabetes Atlas; confianza: Alta.
- **S05** — Gasto sanitario atribuible a diabetes: USD 1.015 billones (trillion US); +338% en 17 años; ~12% del gasto sanitario global; USD 1,760 por persona con diabetes (2024, Global). https://diabetesatlas.org/data-by-indicator/diabetes-related-health-expenditure/total-diabetes-related-health-expenditure-id-million/ — IDF Diabetes Atlas; confianza: Alta.
- **S06** — Muertes atribuibles a diabetes: ~3.4 millones de muertes en adultos 20-79; 9.3% de las muertes globales en ese grupo etario (2024, Global). https://diabetesatlas.org/ — IDF Diabetes Atlas; confianza: Alta.
- **S07** — Carga de diabetes según OMS: 830 millones de personas vivían con diabetes en 2022; 14% de adultos >=18 (2022, Global). https://www.who.int/news-room/fact-sheets/detail/diabetes — OMS; confianza: Alta.
- **S08** — Efecto de intervención intensiva de estilo de vida en DPP: 58% menor incidencia vs placebo; NNT ~6.9 durante 3 años (2002, Estados Unidos; adultos de alto riesgo). https://www.nejm.org/doi/full/10.1056/NEJMoa012512 — Ensayo clínico aleatorizado, NEJM; confianza: Alta.
- **S09** — Finnish Diabetes Prevention Study: 58% reducción relativa del riesgo durante el ensayo; incidencia acumulada a 4 años 11% intervención vs 23% control (2001, Finlandia; personas con IGT). https://www.nejm.org/doi/abs/10.1056/NEJM200105033441801 — Ensayo clínico aleatorizado, NEJM; confianza: Alta.
- **S10** — Prediabetes en EE.UU.: ~98 millones de adultos; más de 80% no lo saben (2024, Estados Unidos). https://www.cdc.gov/prediabetes/risktest/about-the-test.html — CDC; confianza: Alta.
- **S11** — FINDRISC: bandas y riesgo de referencia a 10 años: 0-6:1%; 7-11:4%; 12-14:17%; 15-20:33%; 21-26:50% (2003 / resumen 2023, Modelo original Finlandia; aplicado en Latinoamérica). https://pmc.ncbi.nlm.nih.gov/articles/PMC10332265/ — Paper revisado por pares / PMC; confianza: Alta.
- **S12** — Validación FINDRISC en población peruana para T2D no diagnosticada: AUROC 0.69 (IC95% 0.64-0.74); corte empírico 11; sensibilidad 69%; especificidad 66.8% (2018, Perú; n=1,609). https://pmc.ncbi.nlm.nih.gov/articles/PMC6249987/ — Paper revisado por pares / Primary Care Diabetes; confianza: Alta.
- **S13** — Validación FINDRISC/LA-FINDRISC en personal sanitario peruano: AUROC 69.2% FINDRISC vs 71.5% LA-FINDRISC; para sensibilidad, cortes >=12 y >=11 respectivamente (2024, Perú; n=549). https://pubmed.ncbi.nlm.nih.gov/39110713/ — Paper revisado por pares / PLOS One; confianza: Alta.
- **S14** — Carga regional Sudamérica y Centroamérica: 35.4 M con diabetes; 38.7 M con IGT; USD 81 mil millones de gasto sanitario (2024, Sudamérica y Centroamérica (IDF SACA)). https://diabetesatlas.org/data-by-location/region/south-and-central-america/ — IDF Diabetes Atlas; confianza: Alta.
- **S15** — Brasil: diabetes e hiperglucemia intermedia: 16.62 M con diabetes; 17.76 M con IGT; 15.27 M con IFG; 31.9% de diabetes no diagnosticada (2024, Brasil). https://diabetesatlas.org/data-by-location/country/brazil/ — IDF Diabetes Atlas; confianza: Alta.
- **S16** — México: diabetes, IGT e IFG: 13.6 M con diabetes; 5.6 M con diabetes no diagnosticada; 10.69 M IGT; 11.34 M IFG (2024, México). https://www.ncbi.nlm.nih.gov/books/NBK618744/?report=printable — IDF Diabetes Atlas / NCBI Bookshelf; confianza: Alta.
- **S17** — Perú: diabetes e hiperglucemia intermedia: 1.336 M con diabetes; 2.308 M IGT; 1.989 M IFG; USD 1.881 mil millones de gasto (2024, Perú). https://diabetesatlas.org/data-by-location/country/peru/ — IDF Diabetes Atlas; confianza: Alta.
- **S18** — España: diabetes e hiperglucemia intermedia: 4.660 M con diabetes; 2.978 M IGT; 2.334 M IFG; 35.5% no diagnosticada (2024, España). https://diabetesatlas.org/data-by-location/country/spain/ — IDF Diabetes Atlas; confianza: Alta.
- **S19** — Guías ADA: screening con calculadora validada y confirmación bioquímica: Recomienda evaluación de riesgo/calculadora validada; diagnóstico requiere A1C o glucosa plasmática; evidencia insuficiente para usar CGM como screening/diagnóstico (2026, Estados Unidos / referencia clínica internacional). https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes — ADA Standards of Care; confianza: Alta.
- **S20** — Diabetes UK Know Your Risk: uso: >3.55 millones de completaciones; herramienta gratuita; <=5 minutos (2026 (consulta), Reino Unido). https://riskscore.diabetes.org.uk/ — Organización benéfica de diabetes / producto público; confianza: Alta.
- **S21** — January AI: adopción y propuesta device-free: 200,000+ descargas; predicciones de glucosa sin sensor; API Pro USD 99/mes (2026, Global/EE.UU.). https://january.ai/app — Sitio del competidor; confianza: Media.
- **S22** — Levels: precio actual: Membresía USD 15/mes o USD 80/año; sensor opcional USD 89 por envío de ~30 días (2026, EE.UU.). https://support.levels.com/article/720-levels-pricing-and-plans — Sitio del competidor; confianza: Media-Alta.
- **S23** — Signos: precio CGM: USD 127/mes (6 meses), USD 150/mes (3 meses), USD 225 (1 mes) (2026, EE.UU.). https://www.signos.com/plans — Sitio del competidor; confianza: Media-Alta.
- **S24** — ZOE Plus: precio: USD 99.99/año o USD 15.99/mes (2026, EE.UU.). https://zoe.com/en-us/faqs — Sitio del competidor; confianza: Media-Alta.
- **S25** — Proxy público de volumen de keywords metabólicas: prediabetes ~368K; type 2 diabetes ~673K; continuous glucose monitoring ~301K; blood sugar monitor ~91K (2025-2026 (proxy, fecha exacta no confirmada), Global/inglés). https://www.tubics.com/rankings/channel/UCALRKY0cF3WZBHSika8vlGQ — Proveedor SEO/YouTube; proxy no equivalente a Google Ads; confianza: Baja-Preliminar.
- **S26** — Señal cualitativa de comunidad: confusión sobre picos y CGM en prediabetes: Conversaciones recurrentes sobre picos posprandiales, A1c normal y uso de CGM (2024-2026, Global; Reddit r/prediabetes). https://www.reddit.com/r/prediabetes/ — Comunidad; evidencia cualitativa; confianza: Media-Baja.
- **S27** — FDA: frontera general wellness vs función médica: Software de bienestar no relacionado con diagnóstico, cura, mitigación, prevención o tratamiento puede quedar fuera de 'device'; claims de enfermedad requieren análisis regulatorio (2026, Estados Unidos). https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices — Regulador FDA; confianza: Alta.
- **S28** — Datos de salud como categoría especial: Los datos de salud están especialmente protegidos bajo RGPD; tratamiento sujeto a bases legales/garantías (2025, España/UE). https://www.aepd.es/areas-de-actuacion/salud/tus-derechos-en-relacion-con-tus-datos-de-salud — AEPD / regulador; confianza: Alta.
- **S29** — México: datos personales sensibles incluyen salud: La ley incluye estado de salud presente o futuro como dato personal sensible; exige consentimiento expreso en supuestos aplicables (2025 texto legal consultado, México). https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo125102.html — Texto legal oficial; confianza: Alta.
- **S30** — Brasil: LGPD: LGPD regula tratamiento de datos personales por organizaciones públicas y privadas y protege privacidad (2018-vigente, Brasil). https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd — Gobierno de Brasil; confianza: Alta.
- **S31** — Perú: Ley 29733: Ley de Protección de Datos Personales; información de salud es dato sensible (2011-vigente, Perú). https://www.gob.pe/institucion/anpd/normas-legales/2018427-29733-2011 — Gobierno de Perú / ANPD; confianza: Alta.
- **S32** — DiRECT: remisión de T2D en población seleccionada: 46% en remisión a 1 año bajo programa intensivo; 36% a 2 años; no equivale a que 50% de T2D sea 'reversible' (2018-2019, Reino Unido; T2D <6 años, BMI 27-45, sin insulina). https://pubmed.ncbi.nlm.nih.gov/29221645/ — Ensayo clínico / Lancet; confianza: Alta.
