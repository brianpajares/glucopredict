# Sitemap, rutas y flujos

## Rutas públicas
- `/` Landing.
- `/calcular` shell del wizard; pasos en URL estable `/calcular/:step` para permitir volver sin perder contexto de sesión.
- `/procesando`
- `/resultado` vista previa gratuita.
- `/informe/solicitar` email gate de fase 1; `/pago` checkout de fase 2.
- `/exito`
- `/informe/:report_id`
- `/como-funciona`
- `/faq`
- `/fuentes`
- `/legal/privacidad`, `/legal/terminos`, `/legal/aviso-medico`, `/legal/cookies`
- `/admin` autenticado; QA, configuración de perfiles país, pricing, fuentes, analytics agregados.

## SEO localizado
Patrón: `/{locale}/{country}/{use_case}`. Ejemplos:
- `/es/mx/calculadora-riesgo-diabetes`
- `/es/pe/test-findrisc`
- `/pt/br/risco-diabetes-tipo-2`
- `/en/us/diabetes-risk-score`
Casos de uso permitidos: `calculadora-riesgo-diabetes`, `test-findrisc`, `debo-hacerme-prueba-diabetes`, `cintura-imc-riesgo`. No crear páginas que prometan diagnóstico o predicción glucémica personalizada.

## Flujo principal
```mermaid
flowchart TD
  A[Landing] --> B[Wizard 10 pasos]
  B --> C[Procesando]
  C --> D[Vista previa: score + banda + CTA]
  D --> E{Oferta activa}
  E -->|Fase 1| F[Email gate]
  E -->|Fase 2| G[Pago]
  F --> H[Éxito]
  G --> H
  H --> I[Informe completo]
  D --> J[CTA prueba/consulta]
  D --> K[Cómo funciona / fuentes]
```

## Flujo de seguridad
```mermaid
flowchart TD
  A[Landing / wizard] --> B{Síntomas agudos, embarazo o diabetes conocida}
  B -->|Sí / usuario lo declara fuera del modelo| C[Mensaje de alcance + orientación clínica apropiada]
  B -->|No| D[Continuar evaluación de cribado]
  D --> E{Score alcanza umbral país}
  E -->|Sí| F[Recomendar confirmación con prueba + profesional]
  E -->|No| G[Explicar que score bajo no descarta enfermedad]
```

## Flujo de errores
```mermaid
flowchart LR
  A[Input] --> B{válido}
  B -->|No| C[Error inline + conservar valor]
  C --> A
  B -->|Sí| D[Siguiente paso]
  D --> E{motor responde}
  E -->|Error| F[Mensaje genérico + retry; conservar respuestas]
  E -->|OK| G[Preview]
```

## Admin
El admin nunca muestra respuestas individuales salvo necesidad operacional autorizada. Paneles por defecto: volumen, funnel, país, estado de fuentes, versión de motor, paridad de tests, incidencias. Cualquier vista con datos identificables requiere rol explícito, auditoría y motivo.
