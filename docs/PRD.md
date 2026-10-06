# PRD — GlucoPredict

## 0. Ficha y versión
- **Producto:** GlucoPredict
- **Slug:** `glucopredict`
- **PRD:** v4.0
- **Fecha:** 2026-10-03
- **Estado de fábrica:** READY_TO_BUILD tras revalidación de Etapa 3.
- **Owner técnico:** equipo constructor del MVP.
- **Fuente canónica:** este PRD + `spec/` + `ux/` + `model/` + `drive/`.
- **Modo inicial:** `MONETIZATION_MODE=validation`.
- **Nota clínica:** herramienta educativa de cribado/riesgo; no diagnostica diabetes/prediabetes, no decide tratamiento y no comunica probabilidad personal calibrada.

## 1. Resumen ejecutivo
GlucoPredict convierte un conjunto mínimo de datos conocidos por el usuario en un score FINDRISC/LA-FINDRISC auditable de 0–26, una banda histórica y una orientación sobre si conviene confirmar el riesgo con una prueba clínica. El MVP prioriza tiempo a valor inferior a 90 segundos, valor antes del gate, transparencia del modelo, localización ES/EN/PT y trazabilidad completa del cálculo.

La primera versión valida demanda, no monetización. El usuario ve gratis score, banda, gráfico, factor principal y CTA de seguridad; luego puede solicitar por email un informe completo con desglose, escenarios matemáticos del score, contexto país, metodología y resumen para consulta. Stripe existe detrás de feature flag y se activa solo tras umbrales de tracción y gates legales/QA.

## 2. Problema y evidencia
La Etapa 1 documenta una carga global relevante de diabetes no diagnosticada y poblaciones con alteraciones glucémicas, junto con un vacío entre calculadoras gratuitas de riesgo y productos metabólicos caros/continuos. La evidencia y sus fuentes permanecen en `docs/brief_estrategico.md`.

Problema de producto: una calculadora aislada entrega un número, pero no necesariamente una siguiente acción comprensible. GlucoPredict busca cerrar la distancia entre “tengo factores de riesgo” y “sé si conviene confirmar con una prueba y qué componentes de la regla explican mi score”, sin convertir el score en diagnóstico.

## 3. Mercado y segmentos
Prioridad de entrada: México → Brasil → Perú; luego Colombia y España. Segmentos iniciales:
1. B2C adultos con señales de riesgo y sin diagnóstico confirmado.
2. Laboratorios/farmacias como canal futuro de confirmación, sin condicionar consejo clínico a remuneración.
3. Aseguradoras/EPS/empleadores únicamente con screening voluntario, agregación y base legal adecuada.

Las cifras de mercado, señales de demanda y supuestos de precio son preliminares cuando así se marcan en `docs/brief_estrategico.md` y `spec/monetizacion.json`.

## 4. Persona y JTBD
**Persona principal:** adulto de mediana edad con sobrepeso/cintura elevada, antecedente familiar o inquietud tras un chequeo, sin diagnóstico confirmado y sin necesidad de CGM.

**JTBD:** “Cuando algo me hace pensar que podría estar en riesgo, quiero saber rápidamente si debería hacerme una prueba y qué factores pesan en mi score, para llegar a una consulta con una siguiente acción clara.”

## 5. Competencia
Alternativas documentadas: Diabetes UK Know Your Risk, CDC/ADA Prediabetes Risk Test, January AI, Levels, Signos y ZOE. No se compite por “tener un score”; el hueco es **risk-to-action en <90 s + score auditable + escenarios no causales + localización ES/PT + entrega de informe**. Detalle y fuentes: `docs/brief_estrategico.md`.

## 6. Propuesta de valor
**ES:** “Tu score de riesgo. Una siguiente acción clara.”
**EN:** “Your risk score. One clear next step.”
**PT:** “Seu score de risco. Um próximo passo claro.”

Principios: valor antes del gate; cálculo determinista; transparencia de umbral país; no probabilidad personal; no diagnóstico; toda sugerencia de confirmación remite a prueba clínica/profesional.

## 7. Alcance MVP, fuera de alcance y v2
**MVP:** landing localizada; wizard; motor TS; preview gratuito; gate email; lead + report request; PDF; emails Resend; `/admin`; Drive loader/cache/fallback; PostHog/Sentry; Turnstile/rate limit; CI; legal/privacy surfaces; modo Stripe apagado.

**Fuera de alcance:** diagnóstico, interpretación de CGM, recomendaciones de medicación, probabilidad personalizada, panel B2B con resultados individuales, afiliados de laboratorio activos, ML entrenado, claims causales de escenarios.

**v2 condicionado a evidencia:** Stripe activo; recurrencia/suscripción; tracking longitudinal; integraciones con laboratorio; validación local adicional; B2B agregado.

## 8. Flujo end-to-end
```mermaid
flowchart TD
  A[Landing localizada] --> B[Wizard 10 pasos]
  B --> C[POST /api/calculate]
  C --> D[Preview gratis: score + banda + CTA]
  D --> E{MONETIZATION_MODE}
  E -->|validation| F[Gate email + consentimiento]
  F --> G[Lead + report_request]
  G --> H[Generar PDF]
  H --> I[Confirmación usuario]
  H --> J[Notificación OWNER_EMAIL según consentimiento]
  E -->|stripe| K[Checkout Stripe]
  K --> L[Webhook firmado e idempotente]
  L --> H
  G --> M[/admin embudo + reenvío]
  C --> N[Persistir versión/checksum sin analytics clínicos]
```

## 9. Historias de usuario US-xx con Gherkin
### US-01 — Como visitante, quiero entender qué hace y qué no hace la herramienta antes de empezar.
**Criterio Gherkin**
```gherkin
Scenario: US-01 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-01
  Then La landing muestra propuesta de valor, disclaimer de cribado/no diagnóstico, idiomas ES/EN/PT y CTA de inicio.
  And la prueba AT-01 debe pasar
```

### US-02 — Como usuario, quiero completar el screener en móvil con una pregunta por pantalla.
**Criterio Gherkin**
```gherkin
Scenario: US-02 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-02
  Then Wizard de 10 pasos, progreso real, back/continue, validación inline y objetivo de valor <90 s.
  And la prueba AT-02 debe pasar
```

### US-03 — Como usuario, quiero introducir unidades métricas o imperiales sin errores silenciosos.
**Criterio Gherkin**
```gherkin
Scenario: US-03 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-03
  Then La UI convierte imperial a métrico antes del motor y rechaza rangos/formatos inválidos.
  And la prueba AT-03 debe pasar
```

### US-04 — Como usuario, quiero recibir un score determinista y reproducible.
**Criterio Gherkin**
```gherkin
Scenario: US-04 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-04
  Then Portar engine_reference.py a TypeScript con paridad 100% contra spec/test_vectors.json.
  And la prueba AT-04 debe pasar
```

### US-05 — Como usuario, quiero ver score, banda y siguiente acción antes de dejar mi email.
**Criterio Gherkin**
```gherkin
Scenario: US-05 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-05
  Then Preview gratuito incluye score, risk_band, score_chart, insight y lab_cta definidos en outputs_spec.json.
  And la prueba AT-05 debe pasar
```

### US-06 — Como usuario, quiero saber si el umbral de mi país es verificado o preliminar.
**Criterio Gherkin**
```gherkin
Scenario: US-06 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-06
  Then Mostrar country_profile, followup_threshold y threshold_status con copy de limitación.
  And la prueba AT-06 debe pasar
```

### US-07 — Como usuario, quiero que las referencias históricas no se presenten como mi probabilidad personal.
**Criterio Gherkin**
```gherkin
Scenario: US-07 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-07
  Then Toda referencia porcentual usa la etiqueta de referencia histórica y está subordinada al score.
  And la prueba AT-07 debe pasar
```

### US-08 — Como usuario, quiero solicitar el informe completo por email con consentimiento explícito.
**Criterio Gherkin**
```gherkin
Scenario: US-08 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-08
  Then Gate solicita email + consent_report_delivery y crea lead/report_request idempotente.
  And la prueba AT-08 debe pasar
```

### US-09 — Como dueño, quiero recibir una notificación operativa de cada solicitud.
**Criterio Gherkin**
```gherkin
Scenario: US-09 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-09
  Then Resend envía al OWNER_EMAIL asunto '[GlucoPredict] Solicitud de informe <id>'; full payload/PDF solo cuando consent_owner_copy sea true.
  And la prueba AT-09 debe pasar
```

### US-10 — Como usuario, quiero recibir confirmación de mi solicitud de informe.
**Criterio Gherkin**
```gherkin
Scenario: US-10 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-10
  Then Resend envía confirmación localizada ES/EN/PT sin incluir datos de salud sensibles en el asunto.
  And la prueba AT-10 debe pasar
```

### US-11 — Como usuario, quiero abrir/descargar un PDF privado y consistente con mi resultado.
**Criterio Gherkin**
```gherkin
Scenario: US-11 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-11
  Then Generar PDF con @react-pdf/renderer conforme a ux/report_layout.md, token firmado y expiración.
  And la prueba AT-11 debe pasar
```

### US-12 — Como administrador, quiero revisar leads y el embudo sin consultar la base manualmente.
**Criterio Gherkin**
```gherkin
Scenario: US-12 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-12
  Then /admin autenticado muestra leads, estado, origen, funnel y reenvío; nunca expone service role al cliente.
  And la prueba AT-12 debe pasar
```

### US-13 — Como administrador, quiero reenviar un informe sin duplicar pedidos.
**Criterio Gherkin**
```gherkin
Scenario: US-13 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-13
  Then Acción de reenvío registra audit event y reutiliza el report_request existente.
  And la prueba AT-13 debe pasar
```

### US-14 — Como equipo de producto, quiero analytics de funnel sin respuestas clínicas.
**Criterio Gherkin**
```gherkin
Scenario: US-14 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-14
  Then Implementar spec/analytics_events.json en PostHog excluyendo email, medidas y respuestas de salud.
  And la prueba AT-14 debe pasar
```

### US-15 — Como usuario, quiero que mis datos sensibles no queden en localStorage ni logs.
**Criterio Gherkin**
```gherkin
Scenario: US-15 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-15
  Then No persistir inputs de salud en localStorage; redacción de logs/Sentry; payload cifrado en reposo cuando se persista.
  And la prueba AT-15 debe pasar
```

### US-16 — Como operador, quiero que la app lea archivos canónicos desde Google Drive y sobreviva a fallos temporales.
**Criterio Gherkin**
```gherkin
Scenario: US-16 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-16
  Then Drive loader resuelve archivos por nombre bajo /Apps/glucopredict/, verifica SHA-256, cachea 24 h y usa última versión válida si Drive falla.
  And la prueba AT-16 debe pasar
```

### US-17 — Como operador, quiero sincronizar la carpeta drive/ al folder configurado.
**Criterio Gherkin**
```gherkin
Scenario: US-17 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-17
  Then npm run drive:sync sube/actualiza drive/ en GOOGLE_DRIVE_FOLDER_ID y valida hashes.
  And la prueba AT-17 debe pasar
```

### US-18 — Como equipo, quiero activar cobro sin reescribir el flujo gratuito.
**Criterio Gherkin**
```gherkin
Scenario: US-18 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-18
  Then MONETIZATION_MODE=validation por defecto; stripe habilita Checkout detrás de feature flag conservando preview gratis.
  And la prueba AT-18 debe pasar
```

### US-19 — Como comprador, quiero que el pago se procese una sola vez aunque haya reintentos.
**Criterio Gherkin**
```gherkin
Scenario: US-19 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-19
  Then Webhook Stripe con firma verificada, idempotencia por event_id y transición de order atómica.
  And la prueba AT-19 debe pasar
```

### US-20 — Como usuario, quiero recibir el PDF automáticamente tras un pago válido.
**Criterio Gherkin**
```gherkin
Scenario: US-20 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-20
  Then En modo stripe, payment_succeeded dispara generación/entrega de PDF y copia operativa al OWNER_EMAIL conforme al consentimiento.
  And la prueba AT-20 debe pasar
```

### US-21 — Como usuario, quiero una experiencia accesible con teclado y lector de pantalla.
**Criterio Gherkin**
```gherkin
Scenario: US-21 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-21
  Then Cumplir WCAG 2.2 AA especificado: foco visible, targets >=44 px, semántica, aria-live, reduced motion y no color-only.
  And la prueba AT-21 debe pasar
```

### US-22 — Como usuario, quiero usar la app en español, inglés o portugués.
**Criterio Gherkin**
```gherkin
Scenario: US-22 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-22
  Then next-intl con rutas/locales es, en, pt y strings desde spec/copy_i18n.json.
  And la prueba AT-22 debe pasar
```

### US-23 — Como visitante, quiero páginas localizadas encontrables en buscadores.
**Criterio Gherkin**
```gherkin
Scenario: US-23 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-23
  Then Metadata, hreflang, canonical, sitemap y robots por locale; no indexar admin/reportes privados.
  And la prueba AT-23 debe pasar
```

### US-24 — Como operador, quiero protección contra abuso y bots.
**Criterio Gherkin**
```gherkin
Scenario: US-24 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-24
  Then Turnstile en gate/checkout, rate limit por IP+acción, CSRF/origin checks y límites de payload.
  And la prueba AT-24 debe pasar
```

### US-25 — Como operador, quiero observar errores sin filtrar información de salud.
**Criterio Gherkin**
```gherkin
Scenario: US-25 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-25
  Then Sentry con beforeSend/redaction y PostHog sin valores clínicos; correlation_id no identificable.
  And la prueba AT-25 debe pasar
```

### US-26 — Como usuario, quiero solicitar acceso/exportación/eliminación cuando aplique.
**Criterio Gherkin**
```gherkin
Scenario: US-26 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-26
  Then Flujo de privacy request con export/delete, verificación de identidad proporcional y registro de cumplimiento.
  And la prueba AT-26 debe pasar
```

### US-27 — Como equipo, quiero saber cuándo activar cobro.
**Criterio Gherkin**
```gherkin
Scenario: US-27 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-27
  Then Dashboard calcula preview→email; gate de cobro exige >=30% y >=50 solicitudes en 14 días más gates legales/QA.
  And la prueba AT-27 debe pasar
```

### US-28 — Como equipo, quiero que cada despliegue bloquee regresiones del algoritmo.
**Criterio Gherkin**
```gherkin
Scenario: US-28 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-28
  Then CI ejecuta lint, typecheck, Vitest sobre test_vectors.json y Playwright E2E antes de deploy.
  And la prueba AT-28 debe pasar
```

### US-29 — Como usuario, quiero que la app responda rápido en móvil.
**Criterio Gherkin**
```gherkin
Scenario: US-29 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-29
  Then p95 de APIs de cálculo/preview <2 s sin incluir red de email/Drive cold miss; Lighthouse móvil >=90 en Performance/A11y/Best Practices/SEO en rutas públicas clave.
  And la prueba AT-29 debe pasar
```

### US-30 — Como operador, quiero despliegues reproducibles en Vercel y portables a Netlify.
**Criterio Gherkin**
```gherkin
Scenario: US-30 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-30
  Then Next.js App Router sin dependencia propietaria obligatoria; GitHub Actions y documentación de Vercel/Netlify.
  And la prueba AT-30 debe pasar
```

### US-31 — Como usuario, quiero que los escenarios se presenten como matemática del score y no causalidad.
**Criterio Gherkin**
```gherkin
Scenario: US-31 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-31
  Then Scenario UI/PDF muestra causal_claim=false y prohíbe lenguaje de reducción causal individual.
  And la prueba AT-31 debe pasar
```

### US-32 — Como responsable de producto, quiero que cualquier cambio de parámetros sea trazable.
**Criterio Gherkin**
```gherkin
Scenario: US-32 cumple su objetivo
  Given una sesión válida en el contexto aplicable
  When el usuario ejecuta el flujo asociado a FR-32
  Then Versionar model/spec/manifest; guardar model_version, drive_manifest_version y checksum usados por cálculo/informe.
  And la prueba AT-32 debe pasar
```



## 10. Requisitos FR-xx y NFR-xx
### Requisitos funcionales
| ID | Requisito | US | Prueba |
|---|---|---|---|
| FR-01 | La landing muestra propuesta de valor, disclaimer de cribado/no diagnóstico, idiomas ES/EN/PT y CTA de inicio. | US-01 | AT-01 |
| FR-02 | Wizard de 10 pasos, progreso real, back/continue, validación inline y objetivo de valor <90 s. | US-02 | AT-02 |
| FR-03 | La UI convierte imperial a métrico antes del motor y rechaza rangos/formatos inválidos. | US-03 | AT-03 |
| FR-04 | Portar engine_reference.py a TypeScript con paridad 100% contra spec/test_vectors.json. | US-04 | AT-04 |
| FR-05 | Preview gratuito incluye score, risk_band, score_chart, insight y lab_cta definidos en outputs_spec.json. | US-05 | AT-05 |
| FR-06 | Mostrar country_profile, followup_threshold y threshold_status con copy de limitación. | US-06 | AT-06 |
| FR-07 | Toda referencia porcentual usa la etiqueta de referencia histórica y está subordinada al score. | US-07 | AT-07 |
| FR-08 | Gate solicita email + consent_report_delivery y crea lead/report_request idempotente. | US-08 | AT-08 |
| FR-09 | Resend envía al OWNER_EMAIL asunto '[GlucoPredict] Solicitud de informe <id>'; full payload/PDF solo cuando consent_owner_copy sea true. | US-09 | AT-09 |
| FR-10 | Resend envía confirmación localizada ES/EN/PT sin incluir datos de salud sensibles en el asunto. | US-10 | AT-10 |
| FR-11 | Generar PDF con @react-pdf/renderer conforme a ux/report_layout.md, token firmado y expiración. | US-11 | AT-11 |
| FR-12 | /admin autenticado muestra leads, estado, origen, funnel y reenvío; nunca expone service role al cliente. | US-12 | AT-12 |
| FR-13 | Acción de reenvío registra audit event y reutiliza el report_request existente. | US-13 | AT-13 |
| FR-14 | Implementar spec/analytics_events.json en PostHog excluyendo email, medidas y respuestas de salud. | US-14 | AT-14 |
| FR-15 | No persistir inputs de salud en localStorage; redacción de logs/Sentry; payload cifrado en reposo cuando se persista. | US-15 | AT-15 |
| FR-16 | Drive loader resuelve archivos por nombre bajo /Apps/glucopredict/, verifica SHA-256, cachea 24 h y usa última versión válida si Drive falla. | US-16 | AT-16 |
| FR-17 | npm run drive:sync sube/actualiza drive/ en GOOGLE_DRIVE_FOLDER_ID y valida hashes. | US-17 | AT-17 |
| FR-18 | MONETIZATION_MODE=validation por defecto; stripe habilita Checkout detrás de feature flag conservando preview gratis. | US-18 | AT-18 |
| FR-19 | Webhook Stripe con firma verificada, idempotencia por event_id y transición de order atómica. | US-19 | AT-19 |
| FR-20 | En modo stripe, payment_succeeded dispara generación/entrega de PDF y copia operativa al OWNER_EMAIL conforme al consentimiento. | US-20 | AT-20 |
| FR-21 | Cumplir WCAG 2.2 AA especificado: foco visible, targets >=44 px, semántica, aria-live, reduced motion y no color-only. | US-21 | AT-21 |
| FR-22 | next-intl con rutas/locales es, en, pt y strings desde spec/copy_i18n.json. | US-22 | AT-22 |
| FR-23 | Metadata, hreflang, canonical, sitemap y robots por locale; no indexar admin/reportes privados. | US-23 | AT-23 |
| FR-24 | Turnstile en gate/checkout, rate limit por IP+acción, CSRF/origin checks y límites de payload. | US-24 | AT-24 |
| FR-25 | Sentry con beforeSend/redaction y PostHog sin valores clínicos; correlation_id no identificable. | US-25 | AT-25 |
| FR-26 | Flujo de privacy request con export/delete, verificación de identidad proporcional y registro de cumplimiento. | US-26 | AT-26 |
| FR-27 | Dashboard calcula preview→email; gate de cobro exige >=30% y >=50 solicitudes en 14 días más gates legales/QA. | US-27 | AT-27 |
| FR-28 | CI ejecuta lint, typecheck, Vitest sobre test_vectors.json y Playwright E2E antes de deploy. | US-28 | AT-28 |
| FR-29 | p95 de APIs de cálculo/preview <2 s sin incluir red de email/Drive cold miss; Lighthouse móvil >=90 en Performance/A11y/Best Practices/SEO en rutas públicas clave. | US-29 | AT-29 |
| FR-30 | Next.js App Router sin dependencia propietaria obligatoria; GitHub Actions y documentación de Vercel/Netlify. | US-30 | AT-30 |
| FR-31 | Scenario UI/PDF muestra causal_claim=false y prohíbe lenguaje de reducción causal individual. | US-31 | AT-31 |
| FR-32 | Versionar model/spec/manifest; guardar model_version, drive_manifest_version y checksum usados por cálculo/informe. | US-32 | AT-32 |

### NFR
- **NFR-01 Rendimiento:** p95 de cálculo/preview <2 s; no incluye latencia de correo ni un cold miss de Drive.
- **NFR-02 Web quality:** Lighthouse móvil >=90 en Performance, Accessibility, Best Practices y SEO para landing y flujo público representativo.
- **NFR-03 Seguridad:** secrets solo server-side; RLS activo; Turnstile; rate limit; webhook firmado; cifrado de payload sensible en reposo; redacción de logs.
- **NFR-04 Privacidad:** minimización, propósito explícito, retención configurable, export/delete, no `localStorage` clínico, analytics sin email/respuestas de salud.
- **NFR-05 Fiabilidad:** Drive cache 24 h + última versión válida; cálculo local determinista no depende de Drive en cada request.
- **NFR-06 Correctitud:** 29/29 válidos y 9/9 inválidos en paridad; cero regresiones de banda.
- **NFR-07 Coste:** motor = USD 0 por llamada; objetivo de coste variable digital en modo validation <USD 0.02 por informe excluyendo infraestructura fija. En stripe, medir fee real del procesador y bloquear precio si el margen bruto antes de CAC cae por debajo de 85%.
- **NFR-08 Observabilidad:** Sentry/PostHog con identificadores no clínicos y redacción.
- **NFR-09 Portabilidad:** GitHub + Vercel como principal; Netlify como alternativa sin cambios de dominio de negocio.
- **NFR-10 Mantenibilidad:** TypeScript `strict`, lint/typecheck, módulos puros para engine/Drive/reporting, decisiones en `DECISIONS.md` durante implementación.

## 11. Inputs
La definición normativa está en `spec/inputs.schema.json`; no duplicar validaciones en UI, API y engine con reglas divergentes. La UI puede aceptar imperial, pero la frontera del motor es métrica. `country_code` es contexto runtime y no input visible. Copy de preguntas: `spec/copy_i18n.json`; UX: `ux/ux_spec.md`.

## 12. Modelo
La fuente normativa es `spec/model_spec.json`; implementación de referencia en `model/engine_reference.py`; QA independiente en `model/qa_engine.py`; vectores en `spec/test_vectors.json`; parámetros distribuidos desde `drive/`. Producción porta el motor a TypeScript, conserva redondeo BMI a 6 decimales para cortes y 2 para display, y guarda `model_version` + checksum. No duplicar reglas en componentes React.

## 13. Base de datos y Drive
Schema ejecutable: `spec/db_schema.sql`. Drive: `spec/drive_manifest.json` y carpeta `drive/`. La app busca por nombre bajo `GOOGLE_DRIVE_ROOT_PATH=/Apps/glucopredict/`, valida SHA-256, cachea `DRIVE_CACHE_TTL_SECONDS=86400` y conserva última versión válida. El navegador nunca llama Drive ni Supabase service-role directamente.

## 14. Outputs y niveles de acceso
Fuente normativa: `spec/outputs_spec.json`. El preview gratuito debe incluir exactamente `score`, `risk_band`, `score_chart`, `insight`, `lab_cta`. El informe completo debe incluir `component_breakdown`, `modifiable_scenarios`, `country_context`, `reference_comparison`, `action_plan_12w`, `doctor_summary`, `methodology`. Los porcentajes históricos no son probabilidad personal. Diseño de presentación: `ux/components.md`.

## 15. UX/UI
Implementar `ux/ux_spec.md`, `ux/sitemap_flows.md`, `ux/components.md`, `spec/design_tokens.json` y `spec/copy_i18n.json`. El prototipo `ux/prototype.html` es referencia visual/navegable, no motor productivo. Prioridad móvil: una pregunta por pantalla, progreso real, foco visible y score antes del gate.

## 16. Informe PDF
Layout normativo: `ux/report_layout.md`. Debe generarse server-side con `@react-pdf/renderer`, localizarse es/en/pt, contener versión del modelo, limitaciones, contexto de umbral y fuente/metodología, y usar link/token privado. No inventar secciones fuera de `spec/outputs_spec.json`.

## 17. Monetización y tracción
`MONETIZATION_MODE=validation` por defecto. Flujo: preview → “Recibe tu informe completo” → email + consentimientos → lead → confirmación usuario → notificación owner. Para respetar minimización, el email al owner incluye inputs/resultados/PDF **solo si `consent_owner_copy=true`**; si es false, notifica id/estado y enlaza al admin protegido.

Activar modo `stripe` solo si, en ventana móvil de 14 días: preview→email >=30%, al menos 50 solicitudes de informe, paridad algorítmica 100%, copy/privacidad/legal aprobados y unit economics proyecta margen bruto >=85% antes de CAC. Precios actuales son hipótesis A/B de `spec/monetizacion.json`.

## 18. Emails
**Usuario — confirmación de solicitud:** asunto localizado, sin score ni condición clínica; cuerpo confirma recepción, propósito, privacidad y link privado cuando corresponda.

**Owner:** asunto exacto `[GlucoPredict] Solicitud de informe <id>`. Con `consent_owner_copy=true`, adjuntar PDF e incluir inputs/resultados; con false, omitir payload sensible y usar `/admin`.

**Stripe:** tras webhook válido, email de entrega automática una sola vez. Todos los emails usan `RESEND_FROM_EMAIL`; `OWNER_EMAIL` nunca se expone al cliente.

## 19. Arquitectura y stack
- Next.js App Router + TypeScript strict.
- Tailwind + shadcn/ui.
- Route Handlers como API.
- Motor TypeScript portado de Python; FastAPI solo si aparece una dependencia Python imprescindible (no existe hoy).
- Supabase Postgres con RLS.
- Google Drive API con service account + checksum/cache/fallback.
- Resend; `@react-pdf/renderer`; `next-intl`; PostHog; Sentry; Turnstile.
- Vitest + Playwright; GitHub Actions.
- Stripe detrás de `MONETIZATION_MODE`.
- Vercel principal; Netlify alternativa.

## 20. API (OpenAPI 3.1)
Contrato completo en `spec/openapi.yaml`. Endpoints mínimos: health, calculate, report-request, report privado, admin leads/reenvío, Stripe checkout y webhook. El API valida JSON estrictamente, usa correlation IDs, limita payloads y nunca acepta campos adicionales en inputs clínicos.

## 21. Modelo de datos con RLS
`spec/db_schema.sql` define `leads`, `calculations`, `report_requests`, `orders`, `webhook_events`, `privacy_requests`, `audit_events` y `rate_limits`. RLS está habilitado y no existen políticas de acceso directo anónimo/autenticado a datos de salud; Route Handlers usan `SUPABASE_SERVICE_ROLE_KEY` únicamente en servidor tras controles de autorización.

## 22. Seguridad, privacidad y legal
Controles obligatorios: minimización; consentimiento separado para entrega y copia al owner; cifrado en tránsito; cifrado de payload sensible en reposo con `HEALTH_DATA_ENCRYPTION_KEY`; retención corta/configurable; export/delete; DPA con proveedores; no venta/compartición secundaria por defecto; logs redactados; incident response.

Baseline legal a revisar con counsel antes de producción: GDPR (Regulation EU 2016/679, EUR-Lex), CCPA/CPRA y regulaciones CPPA vigentes, LGPD Lei 13.709/2018 (Planalto), Ley peruana 29733 y su Reglamento aprobado por D.S. 016-2024-JUS. Este PRD implementa capacidades técnicas comunes; no sustituye análisis jurídico por jurisdicción ni clasificación regulatoria sanitaria.

Gate adicional: confirmar derechos de uso comercial del instrumento/nombre FINDRISC/LA-FINDRISC antes de lanzamiento; mantener fallback CDC/ADA documentado si la revisión lo exige.

## 23. Accesibilidad e i18n
Objetivo WCAG 2.2 AA. ES, EN, PT desde primera versión con `next-intl`. Nunca usar color como único canal; focus ring; labels/fieldset; mensajes de error asociados; `aria-live` para procesamiento/resultado; `prefers-reduced-motion`; targets >=44 px; PDF con estructura legible. Fechas/números/unidades se formatean por locale.

## 24. Analítica y KPIs
Taxonomía: `spec/analytics_events.json`. Prohibido enviar email o respuestas clínicas a PostHog. KPIs:
- visita→inicio >=40%;
- inicio→preview >=70%;
- preview→email >=30%;
- >=50 solicitudes en 14 días como gate de monetización;
- score en umbral→CTA prueba >=10%;
- report_request→report_view;
- tiempo a preview y errores por pregunta;
- coste variable por informe;
- error rate y p95.

## 25. SEO y adquisición
Landing por idioma/mercado, metodología visible, páginas educativas centradas en “risk calculator / test de riesgo / FINDRISC / prediabetes” sin claims diagnósticos. Implementar sitemap, hreflang, canonical y structured metadata prudente. No indexar `/admin`, links de reporte ni endpoints. Plan operativo de 14 días: `docs/TRACTION_PLAN.md`.

## 26. Plan de pruebas
Capas:
1. Unit: motor TS, normalización, Drive checksums, token signing, feature flags.
2. Contract: OpenAPI + JSON Schema.
3. Paridad: `spec/test_vectors.json`.
4. Integration: Supabase, Resend sandbox, Drive fixture/cache, Stripe test mode.
5. E2E Playwright: es/en/pt, móvil, validation/stripe, admin, privacidad.
6. A11y: axe + teclado.
7. Performance: Lighthouse CI + carga de calculate.
8. Security: rate limit, Turnstile, webhook signature, authz, log redaction.

Detalle verificable: `docs/ACCEPTANCE_TESTS.md`.

## 27. Despliegue y operación
GitHub Actions en PR: install → lint → typecheck → unit/parity → build → Playwright. Main despliega a Vercel Preview/Production según rama. Configurar dominio, DNS, Resend SPF/DKIM/DMARC, Supabase, Drive service account, PostHog, Sentry y Turnstile. `npm run drive:sync` antes de release de parámetros. Runbook: `docs/DRIVE_SETUP.md` y checklist: `docs/LAUNCH_CHECKLIST.md`.

## 28. Definition of Done
- Todos los FR mapeados a US y AT.
- 29/29 + 9/9 pasan en TypeScript.
- Lighthouse móvil >=90 objetivo en cuatro categorías.
- p95 calculate/preview <2 s.
- RLS activo y no hay acceso DB sensible desde browser.
- Drive checksum/cache/fallback probado.
- Gate email, PDF, emails y `/admin` E2E pasan.
- ES/EN/PT sin claves faltantes.
- Privacy/export/delete implementado.
- No marcadores de pendiente, secretos, PII real ni claims de probabilidad personal.
- `docs/final_audit.md` PASS.
- Producción solo después de gates legales/privacidad/IP.

## 29. Riesgos
| Riesgo | Nivel | Mitigación |
|---|---|---|
| Claims sanitarios/regulatorios | Alto | framing de screening; no diagnóstico/tratamiento; revisión país |
| Validez externa | Alto | status verificado/preliminar; no probabilidad personal |
| Causalidad de escenarios | Alto | `causal_claim=false`; copy explícito |
| Privacidad de salud | Alto | minimización, cifrado, RLS, consentimiento, no analytics clínico |
| IP FINDRISC | Alto pre-lanzamiento | revisión de licencia/marca; fallback CDC |
| Drive/third-party outage | Medio | caché + última versión válida |
| Spam/abuso | Medio | Turnstile + rate limit |
| Monetización prematura | Medio | modo validation + thresholds |

## 30. Supuestos
- Nombre GlucoPredict es marca de trabajo; dominio/trademark no se presume disponible.
- PE es el único perfil con umbral local marcado verificado y con limitación de muestra; otros perfiles permanecen preliminares.
- No hay ML entrenado en MVP.
- `country_code` proviene de runtime/configuración y puede ser corregido por el usuario solo si UX futura lo requiere.
- Se pueden usar proveedores descritos siempre que sus DPAs/terms y región sean aceptables en lanzamiento.
- La activación de Stripe no cambia el valor gratuito ni el CTA de seguridad.

## 31. Trazabilidad US↔FR↔test
| US | FR | Test |
|---|---|---|
| US-01 | FR-01 | AT-01 |
| US-02 | FR-02 | AT-02 |
| US-03 | FR-03 | AT-03 |
| US-04 | FR-04 | AT-04 |
| US-05 | FR-05 | AT-05 |
| US-06 | FR-06 | AT-06 |
| US-07 | FR-07 | AT-07 |
| US-08 | FR-08 | AT-08 |
| US-09 | FR-09 | AT-09 |
| US-10 | FR-10 | AT-10 |
| US-11 | FR-11 | AT-11 |
| US-12 | FR-12 | AT-12 |
| US-13 | FR-13 | AT-13 |
| US-14 | FR-14 | AT-14 |
| US-15 | FR-15 | AT-15 |
| US-16 | FR-16 | AT-16 |
| US-17 | FR-17 | AT-17 |
| US-18 | FR-18 | AT-18 |
| US-19 | FR-19 | AT-19 |
| US-20 | FR-20 | AT-20 |
| US-21 | FR-21 | AT-21 |
| US-22 | FR-22 | AT-22 |
| US-23 | FR-23 | AT-23 |
| US-24 | FR-24 | AT-24 |
| US-25 | FR-25 | AT-25 |
| US-26 | FR-26 | AT-26 |
| US-27 | FR-27 | AT-27 |
| US-28 | FR-28 | AT-28 |
| US-29 | FR-29 | AT-29 |
| US-30 | FR-30 | AT-30 |
| US-31 | FR-31 | AT-31 |
| US-32 | FR-32 | AT-32 |

## 32. Anexos
- `README_START_HERE.md`
- `BUILD_PROMPT.md`
- `AGENTS.md`, `CLAUDE.md`
- `TASKS.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/DRIVE_SETUP.md`
- `docs/LAUNCH_CHECKLIST.md`
- `docs/TRACTION_PLAN.md`
- `docs/final_audit.md`
- `spec/openapi.yaml`
- `spec/db_schema.sql`
- `spec/*.json`
- `model/*`
- `ux/*`
- `drive/*`

### Referencias normativas oficiales consultadas para baseline legal
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- California privacy: https://cppa.ca.gov/regulations/
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Perú Ley 29733: https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733
- Perú Reglamento D.S. 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus
