# Correo (Resend): de cero a "Delivered"

Resumen de lo que costó descubrir en PivotWorth, aplicado a GlucoPredict. El código ya normaliza las variables y devuelve un `ref:` corto cuando algo falla.

## 1. Variables (Production **y** Preview, luego Redeploy)

| Variable | Valor correcto | Error típico |
|---|---|---|
| `RESEND_API_KEY` | `re_…` sin comillas | Solo en Production y se prueba en Preview → `email_not_configured_RESEND_API_KEY_missing` |
| `RESEND_FROM_EMAIL` | `GlucoPredict <info@tudominio.com>` | Comillas pegadas → 422 `from` (el código las limpia, pero evítalas) |
| `OWNER_EMAIL` | **solo** `info@tudominio.com` | Texto de una tabla pegado → 422 `to` (el código extrae la dirección) |

## 2. Dominio y DNS

1. https://resend.com/domains → **Add Domain** → dominio raíz.
2. Mira dónde está tu DNS (nameservers en https://lookup.icann.org) y crea los registros **copiando cada valor con el botón de copiar de Resend** (nunca desde una guía: la clave DKIM debe ir completa):

| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGf…` (clave completa) |
| MX | `send` | `feedback-smtp.<región>.amazonses.com` (prioridad 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

3. En el campo nombre escribe solo `send` / `resend._domainkey` (el panel añade el dominio).
4. **No toques** los MX/SPF del dominio raíz (buzón de empresa).
5. **Verify DNS Records** y espera a **Verified** (5–60 min).

## 3. Diagnóstico en 2 minutos

1. `https://<tu-app>/api/health` → `integrations.email`, `resend_api_key` (`missing | placeholder | unexpected_format | ok`), `email_from_domain`, `build.commit`.
2. El `ref:` que muestra la app (tabla de abajo).
3. https://resend.com/logs → status y mensaje exacto del último `POST /emails`.

| `ref` | Causa | Solución |
|---|---|---|
| `email_not_configured_RESEND_API_KEY_*` | La variable no existe en **ese** despliegue | Production + Preview y Redeploy |
| `resend_401_*` | API key inválida | Crea otra y pégala sin comillas |
| `resend_403_validation_error` | Dominio sin verificar o `from` de otro dominio | DNS + Verify |
| `resend_422_validation_error_from` / `_to` | Formato del remitente / destinatario | Solo la dirección, sin texto extra |
| `resend_429_*` | Límite del plan | Esperar o subir de plan |
| `resend_network_error` | Red del proveedor | Reintentar; el cron reintenta las entregas pagadas |

## 4. Qué correos envía la app

| Correo | Destinatario | Adjunto | Asunto |
|---|---|---|---|
| Vista previa (modo `paypal`) | usuario | PDF borroso | "Tu vista previa de GlucoPredict está lista" |
| Informe completo (modo `validation` o tras pagar) | usuario | PDF completo | "Tu informe completo de GlucoPredict" |
| Solicitud | `OWNER_EMAIL` | PDF completo **solo si el usuario autorizó la copia** | `[GlucoPredict] Solicitud de informe <id>` |
| Venta | `OWNER_EMAIL` / `GLUCOPREDICT_ADMIN_EMAIL` | PDF completo solo con autorización | `GlucoPredict \| VENTA CONFIRMADA US$9 \| <ID> \| ENTREGADO [\| SANDBOX]` |

Los asuntos al usuario nunca incluyen score ni condición clínica (AT-10). El primer correo puede ir a spam: márcalo "No es spam" y añade el remitente a la lista de permitidos.
