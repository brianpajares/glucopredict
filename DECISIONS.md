# DECISIONS.md

Registro que completará el LLM programador durante la implementación.

Cada entrada debe incluir: fecha, decisión, alternativas descartadas, impacto en privacidad/seguridad/modelo y archivos afectados. No modificar requisitos clínicos, thresholds, claims ni monetización sin una nueva decisión de producto respaldada por evidencia.

## 2026-10-05 — Publicación del preview de validación

- **Decisión:** Publicar el prototipo autocontenido como preview estático en Vercel mientras se implementa la aplicación de producción especificada en M0–M5. Mantener `MONETIZATION_MODE=validation`, ocultar indexación con `X-Robots-Tag`, y decir de forma visible que el email y las respuestas no se envían ni guardan.
- **Alternativas descartadas:** Presentar el prototipo como producto listo para pacientes; activar cobros o recopilar datos clínicos sin backend, privacidad/legal, derechos de instrumento y gates de QA cerrados.
- **Impacto en privacidad/seguridad/modelo:** No se activa almacenamiento, analítica ni pago; se conserva el motor y los claims del prototipo, incluyendo el aviso de que las referencias no son probabilidad personal. El estado `noindex` reduce descubrimiento orgánico durante validación.
- **Archivos afectados:** `index.html`, `README.md`, `vercel.json`, `.gitignore`.
