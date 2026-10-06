# UX/UI spec — GlucoPredict

**Versión QA/UX:** etapa 3 · 2026-10-03  
**Principio rector:** herramienta de cribado transparente y auditable. La interfaz explica una regla publicada; no se presenta como diagnóstico, “IA médica” ni probabilidad personal.

## B1. Posicionamiento, nombre y voz

**Nombre:** GlucoPredict (ES/EN/PT).  
**Promesa ES:** convierte 10 datos cotidianos en un score FINDRISC auditable y una siguiente acción clara en menos de 90 s.  
**Promise EN:** turns 10 everyday inputs into an auditable FINDRISC score and one clear next step in under 90 seconds.  
**Promessa PT:** transforma 10 dados cotidianos em um score FINDRISC auditável e um próximo passo claro em menos de 90 s.

**Tagline**
- ES: “Tu score de riesgo. Una siguiente acción clara.”
- EN: “Your risk score. One clear next step.”
- PT: “Seu score de risco. Um próximo passo claro.”

**Tono:** sobrio, humano, no alarmista, directo y verificable. Evitar “predice tu diabetes”, “resultado positivo/negativo”, “tu probabilidad es X%”, “riesgo garantizado”, “revertir” y lenguaje culpabilizante.

**Tres mensajes clave**
1. **Claridad:** un score publicado y una acción de seguimiento, sin jerga.
2. **Transparencia:** metodología, componentes, versión y fuentes visibles.
3. **Privacidad:** no hace falta laboratorio; respuestas de salud no se persisten por defecto antes del gate.

## B2. Arquitectura de información

La arquitectura completa, rutas, SEO localizado y flujos Mermaid están en `sitemap_flows.md`. El flujo primario es:
`Landing → Wizard (10 pasos) → Procesando → Preview → Email gate (fase 1) o Pago (fase 2) → Éxito → Informe`.

El país es **contexto de ejecución**, no una pregunta clínica adicional. Debe resolverse por mercado/URL o selector de contexto fuera del wizard; el motor normaliza perfiles desconocidos a `DEFAULT_LATAM`.

### SEO
Usar patrón `/{locale}/{country}/{use_case}`. Cada landing localizada debe declarar la evidencia del país: “verificado” solo cuando existe umbral validado para esa población; de lo contrario “preliminar”. No generar páginas programáticas que conviertan referencias históricas en promesas personales.

## B3. Especificación pantalla por pantalla

La fuente de microcopy exacta en ES/EN/PT es `copy_i18n.json`; esta sección define estructura, estado y comportamiento.

| Pantalla | Objetivo y jerarquía | Componentes / estados | Validación y confianza | Evento principal |
|---|---|---|---|---|
| Landing `/` | Entender valor y alcance en <10 s. H1 → explicación → CTA único. | Hero, trust strip, “cómo funciona” en 3 pasos, fuentes visibles, footer legal. Cargando: no aplica. Error de localización: usar locale neutral. | Aviso “no diagnóstico / no probabilidad personal”. Mostrar versión/metodología enlazable. | `landing_view`, `calculator_start` |
| Wizard `/calcular/:step` | Una decisión por pantalla móvil. | `Progress`, título, ayuda, input/choice cards, CTA Continuar, enlace Volver. Estado vacío conserva foco. | Edad entero 18–80; altura 120–220 cm; peso 35–250 kg; cintura 50–180 cm; booleanos estrictos; familia enum. BMI derivado fuera de 14–60 dispara revisión de unidades, no recalificación silenciosa. | `question_view`, `question_completed`, `validation_error` |
| Procesando `/procesando` | Comunicar que se aplica una regla, no “IA pensando”. | Skeleton estable, texto indeterminado, `aria-live`. | Si falla el motor: conservar sesión y CTA único Reintentar. | `calculation_started`, `calculation_succeeded`, `calculation_failed` |
| Preview `/resultado` | Dar valor gratuito inmediato y orientar el siguiente paso. | Score `x/26`, banda textual, barra segmentada, recomendación según umbral, sello de evidencia, 3 bloques del informe visibles pero bloqueados. | Frase obligatoria: referencia histórica ≠ probabilidad personal. Umbral del país con estado `verificado/preliminar`. | `result_view`, `report_gate_opened`, `followup_cta_clicked` |
| Gate `/informe/solicitar` | Intercambiar email por utilidad clara, no por ocultar el resultado esencial. | Beneficios, email, consentimiento separado, CTA “Enviarme el informe”. | No pedir nombre, fecha de nacimiento ni dirección. Política de privacidad junto al campo. | `email_gate_view`, `email_submitted` |
| Pago `/pago` | Fase 2: vender profundidad, no acceso a seguridad clínica básica. | Resumen de qué incluye, precio localizado, checkout, política de reembolso/soporte. | Precios MX/BR/PE permanecen `preliminar` hasta prueba A/B; no afirmar “precio validado”. | `checkout_view`, `checkout_started`, `purchase_completed` |
| Éxito `/exito` | Confirmar la acción y abrir el informe. | Confirmación, CTA único “Ver informe”. | No revelar email completo en pantalla compartida. | `success_view`, `report_opened` |
| Informe `/informe/:id` | Explicar score, componentes, escenarios y límites. | Secciones: resumen, breakdown, escenarios, contexto país, metodología, fuentes, verificación. | Escenarios = simulación matemática, no efecto causal. Históricos nunca como probabilidad personal. | `report_view`, `methodology_opened`, `report_exported` |
| Cómo funciona `/como-funciona` | Reducir desconfianza. | Fórmula BMI, tabla de puntos, límites, versiones y fuente primaria. | Fecha de revisión y licencias. | `methodology_view` |
| FAQ `/faq` | Resolver objeciones de uso/privacidad. | Acordeones accesibles. | FAQ clínica remite a profesional; sin tratamiento individual. | `faq_view` |
| Legal `/legal/*` | Consentimiento informado y transparencia. | Privacidad, términos, aviso médico, cookies. | Minimización, retención, base legal por mercado. | `legal_view` |
| Admin `/admin` | Operar versión, evidencia y funnel sin exposición innecesaria de datos. | KPIs agregados, versión, estado fuentes, errores. | RBAC, audit log, no respuestas clínicas individuales por defecto. | `admin_view` |

### Estados y microcopy operativa
- **Vacío:** instrucción concreta; nunca error rojo antes de interacción.
- **Cargando:** “Calculando tu score…” / “Calculating your score…” / “Calculando seu score…”.
- **Error de input:** explicar rango o formato y mantener el valor.
- **Error de motor:** mensaje no técnico + Reintentar; no borrar respuestas.
- **Éxito:** score + banda + siguiente acción antes de cualquier gate.
- **Perfil país preliminar:** etiqueta visible y tooltip “El umbral local aún no cuenta con validación equivalente a la disponible para Perú”.

## B4. Conversión

**Objetivo temporal:** valor central antes de 90 s. Se elimina cualquier pregunta no usada por el score. Progreso real `Paso n de 10`. En 360 px, un input/pregunta por pantalla; en 768/1280 se conserva el mismo orden para evitar una experiencia distinta.

**Defaults inteligentes:** unidad métrica según locale; no preseleccionar respuestas clínicas Sí/No. Se permiten ejemplos de formato, nunca respuestas predeterminadas que alteren el score.

**Preview de curiosidad ética:** score, banda y recomendación de seguridad son gratuitos. Se bloquean únicamente profundidad (breakdown completo, escenarios detallados, plan de conversación/12 semanas educativo). Los encabezados bloqueados siguen visibles, sin resultados inventados.

**Email gate:** beneficio: “Entiende qué compone el score y llévalo a consulta”. Consentimiento comercial separado y opcional. El email no debe ser requisito para ver el score ni la recomendación de seguimiento.

**Prueba social:** solo métricas verificables (p. ej., “método publicado” + fuentes); no usar testimonios clínicos inventados ni “X personas evitaron diabetes” sin estudio.

**CTA:** exactamente un CTA primario por pantalla. Volver, metodología y legal son secundarios textuales.

## B5. Sistema de diseño y visualización

Tokens canónicos en `design_tokens.json`; inventario de componentes en `components.md`.

**Dirección visual:** interfaz clínica-editorial cálida, mucho espacio en blanco, bordes sutiles, tarjetas de una sola responsabilidad. El verde azulado comunica acción, no “resultado sano”; danger/warning se reservan para mensajes semánticos y nunca codifican riesgo sin texto.

**Contraste:** pares críticos de texto/CTA fueron calculados ≥4.5:1 (AA). El foco visible usa contorno de 3 px y no depende de cambio de color.

**Tipografía:** stack nativo (`Inter` solo si ya está instalada; fallback system UI). No depender de fuentes externas en el prototipo.

**Gráficos por output**
- Score: barra segmentada 0–26, marcador + etiqueta.
- Componentes: barras horizontales con valor numérico.
- Escenarios: tarjetas/tabla `actual → escenario`; no waterfall causal.
- Histórico por banda: tabla o texto de referencia; jamás gauge de probabilidad.
- Incertidumbre: estado de evidencia y limitaciones textuales; no fabricar intervalos de confianza individuales.

## B6. Accesibilidad, responsive, rendimiento e i18n

### WCAG 2.2 AA
- Controles nativos, etiquetas persistentes, foco visible, orden lógico DOM/visual.
- Target mínimo 44×44 px; CTA principal 48 px de alto.
- Mensajes de error asociados con `aria-describedby`; resultados y errores de motor en `aria-live`.
- No depender solo de color; gráficos tienen valores y equivalentes textuales.
- `prefers-reduced-motion`: transiciones no esenciales a 0.
- Soporte zoom 200% sin pérdida funcional y reflow a 320 px.
- Idioma de documento dinámico (`lang=es/en/pt`) y etiquetas de unidad no ambiguas.

### Breakpoints
- **360 px:** una columna, un input por pantalla, CTA sticky solo si no oculta contenido.
- **768 px:** card central 640 px, resumen lateral opcional únicamente después del cálculo.
- **1280 px:** max-width 1120 px; landing puede usar dos columnas, wizard sigue focalizado (max 680 px).

### Rendimiento percibido
HTML/JS crítico ligero, sin dependencias de render inicial; reservar alto de score/gráficos para evitar CLS; cálculo local/regla <100 ms cuando sea viable. Si el backend tarda, mostrar estado indeterminado y no porcentaje falso.

### Internacionalización
- UI, SEO y avisos en ES/EN/PT.
- Medidas: UI puede capturar métrico/imperial; **motor solo métrico**. Conversión: `in × 2.54`, `lb × 0.45359237`.
- Moneda mediante `Intl.NumberFormat` y locale/país; no concatenar símbolos.
- Fechas mediante `Intl.DateTimeFormat`; no asumir orden DD/MM/YYYY.
- Decimal local se normaliza antes de enviar; el contrato del motor recibe números JSON, no strings.

## B7. Informe y confianza

Layout página a página en `report_layout.md`. El informe debe incluir: versión de motor, fecha, `verification_id`, contexto/estado del perfil país, tabla de supuestos, fuentes primarias, aviso médico y política de privacidad.

**ID de verificación:** identificador opaco que apunta a una huella de versión + inputs canonizados en servidor. No codificar respuestas clínicas, email ni otros datos personales en QR/URL.

**Aviso clínico base ES:** “GlucoPredict es una herramienta educativa de cribado. No diagnostica diabetes ni sustituye una evaluación médica. Si tienes síntomas, embarazo, diabetes conocida o una preocupación clínica, busca orientación profesional aunque el score sea bajo.”  
EN/PT exactos se mantienen en `copy_i18n.json`.

## Reglas de implementación no negociables
1. Usar el motor verificado de etapa 3; no reimplementar tablas de puntos en UI.
2. No calcular ni mostrar probabilidad personal a partir del porcentaje histórico de una banda.
3. No enviar inputs de salud a analytics; eventos solo contienen metadatos no clínicos (paso, país, versión, éxito/error).
4. No persistir respuestas clínicas en `localStorage` por defecto.
5. Tratar `preliminar` como estado visible al usuario, no solo metadata interna.
6. Cualquier cambio a cortes, puntos o umbral exige nuevos vectores de prueba y revisión de fuentes.
