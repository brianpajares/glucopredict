# TRACTION_PLAN — primeros 14 días

## Objetivo
Validar si el preview produce intención suficiente para solicitar el informe antes de activar cobro.

## Metas de decisión
- Visita→inicio >=40%.
- Inicio→preview >=70%.
- Preview→email >=30%.
- Al menos 50 solicitudes de informe en 14 días.
- Score en umbral→CTA de prueba >=10%.
- Cero incidentes de seguridad/claims y 100% paridad algorítmica.

Si preview→email o volumen no alcanzan el gate, iterar posicionamiento/copy/fuente de tráfico; no activar Stripe por presión de calendario.

## Días 1–3 — Instrumentación + tráfico cálido
Canales: red profesional, comunidades permitidas, testers opt-in y contenido educativo propio.
Mensaje ES: “Calcula un score de riesgo auditable en menos de 90 s y descubre si conviene confirmar con una prueba. No diagnostica.”
Mensaje EN: “Get an auditable risk score in under 90 seconds and see whether confirmation with a blood test may be worth discussing.”
Mensaje PT: “Calcule um score de risco auditável em menos de 90 s e veja se vale confirmar com um exame.”

## Días 4–7 — SEO/contenido de intención
Publicar páginas localizadas sobre calculadora de riesgo, FINDRISC, cómo medir cintura y qué significa un score de screening. CTA único al screener. No publicar claims de reversión, diagnóstico ni probabilidad personal.

## Días 8–10 — Creators/comunidades
Probar 2–3 mensajes centrados en “siguiente acción clara”, “sin sensor” y “metodología visible”. Registrar `utm_source`; no importar listas de emails ni hacer outreach masivo no consentido.

## Días 11–14 — Síntesis
Segmentar funnel por locale/country_profile/source. Revisar abandono por pregunta, errores de unidad, preview→email y report_view. Mantener un único cambio principal por experimento. Decidir: mantener validation, iterar o habilitar Stripe según gates.

## Lista de espera
Checkbox separado `consent_waitlist`; usarlo solo para comunicación de futura suscripción y permitir baja.
