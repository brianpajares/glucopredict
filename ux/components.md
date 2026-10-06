# Componentes UI — GlucoPredict

## Principios
El sistema debe parecer una herramienta de decisión transparente, no un “AI doctor”. Cada pantalla tiene un único CTA primario; las acciones secundarias son enlaces de baja jerarquía. En móvil, cada paso del cálculo presenta una sola decisión o medida editable.

## Botón
**Primary:** fondo `primary`, texto blanco, alto mínimo 48 px, radio 12 px. Estados: default, hover, focus visible 3 px, disabled con texto de motivo accesible. **Secondary:** solo para “Volver” o abrir metodología; nunca compite visualmente con el CTA principal.

## Inputs numéricos
Campo grande con unidad persistente a la derecha. `inputmode="decimal"` o `numeric`; etiqueta fuera del placeholder; rango visible si hay error. Altura, peso y cintura ofrecen selector métrico/imperial en UI, pero el motor recibe cm/kg. Si el BMI derivado queda <14 o >60, mostrar “Revisa valor y unidades” antes de continuar.

## Choice cards
Sí/No y categorías familiares como tarjetas de selección con radio nativo, foco visible y área táctil >=44 px. No usar switches para preguntas médicas porque un switch sugiere configuración, no respuesta.

## Barra de progreso
Texto “Paso n de 10” + `progress` nativo. No mostrar porcentaje falso del procesamiento; el procesamiento usa un estado indeterminado corto.

## Score card
Número `score/26`, banda textual y barra segmentada 0–26. El marcador lleva etiqueta visible; las bandas no usan solo color. Debajo aparece la frase “Referencia histórica; no probabilidad personal”.

## Recommendation card
Dos variantes semánticas: “conviene confirmar” o “no alcanza el umbral operativo”. Nunca “positivo/negativo”, “tienes/no tienes diabetes”, ni lenguaje de certeza. Siempre mostrar estado del umbral de país: `verificado` o `preliminar`.

## Component breakdown
Gráfico de barras horizontales, una fila por componente, orden estable por puntos descendentes y luego orden del cuestionario. Valor 0–5 al final de cada barra. No usar radar ni pie.

## Scenario card
Muestra “score actual → score de regla” y qué respuestas cambian. Encabezado obligatorio: “Escenario de la regla, no predicción causal”. Para BMI/cintura, describir el corte matemático sin prescribir un objetivo clínico.

## Paywall / email gate
Mantener visibles los títulos de las secciones bloqueadas y 1–2 líneas de contenido difuminado/placeholder estructural, no resultados clínicos inventados. Beneficio principal: “Entiende qué compone el score y llévalo a consulta”. Un CTA. En fase 1, email; en fase 2, precio localizado.

## Toasts
Solo para confirmaciones no críticas (“Enlace copiado”). Los errores de validación y seguridad deben quedar inline y anunciados por `aria-live`.

## Charts
- Score: barra segmentada 0–26.
- Componentes: barras horizontales.
- Evolución futura: línea con puntos, solo si existen mediciones reales.
- Incertidumbre: no intervalo probabilístico falso; usar texto de evidencia y estado de validación.
- Referencia histórica: tabla/bandas, nunca gauge de “probabilidad personal”.

## Estados
Vacío: explicar qué dato falta. Cargando: skeleton estable + texto de cálculo. Error: causa accionable sin borrar respuestas. Éxito: score, banda y siguiente acción. Offline: conservar respuestas localmente solo en sesión y reintentar; no persistir salud en localStorage por defecto.

## Accesibilidad
Todas las tarjetas de selección contienen controles nativos o roles correctos; foco no se elimina; orden DOM coincide con visual; `aria-describedby` enlaza ayuda/error. Contraste mínimo AA y soporte `prefers-reduced-motion`.
