# Estructura del informe PDF

Formato recomendado A4/Letter adaptable, 7 páginas máximo para el informe inicial. Pie fijo: versión del modelo, fecha de generación, `verification_id`, aviso “cribado, no diagnóstico”.

## Página 1 — Resumen
Nombre GlucoPredict, score `x/26`, banda, perfil país y estado del umbral. Una barra 0–26 con marcador. Caja de siguiente acción. No mostrar porcentaje histórico como hero.

## Página 2 — Qué compone tu score
Barras horizontales de 8 componentes con puntos exactos. Texto: “Los puntos son reglas del cuestionario, no magnitudes causales”. Destacar máximo de puntos sin lenguaje culpabilizante.

## Página 3 — Escenarios de la regla
Tabla `escenario / score resultante / puntos de diferencia / qué cambió`. Incluir actividad, fruta/verdura, cintura y BMI solo cuando el cambio modifica el score. Encabezado obligatorio: “Simulación matemática del score; no predice cuánto cambiará tu riesgo real”.

## Página 4 — Contexto del país
Modelo activo, umbral de seguimiento, estado `verificado/preliminar`, población de la evidencia y limitaciones. Para Perú: especificar que el corte ≥11 procede de 549 trabajadores hospitalarios y no es calibración nacional.

## Página 5 — Siguiente paso educativo
Qué prueba suele usarse para confirmación (A1C/FPG/OGTT como conceptos, sin ordenar una prueba individual), preguntas para llevar a consulta y señales para buscar atención apropiada. No incluir dosis, medicación o diagnóstico.

## Página 6 — Metodología y supuestos
Fórmula BMI, tabla de puntos resumida, redondeo de BMI a 6 decimales para cortes, bandas históricas, limitaciones de validez externa, regla de country fallback y versión del motor.

## Página 7 — Fuentes, privacidad y verificación
Fuentes primarias con URL/DOI, licencias relevantes, política de minimización, contacto de privacidad y QR/URL de verificación del `verification_id`. El ID debe mapear a hash de versión + inputs canonizados con sal privada del servidor; nunca codificar datos de salud en el propio QR.

## Accesibilidad y exportación
PDF etiquetado, orden de lectura correcto, texto seleccionable, alt text para gráficos y tablas equivalentes. No depender del color. El informe debe conservar moneda/unidades/fecha según locale y declarar las conversiones realizadas.
