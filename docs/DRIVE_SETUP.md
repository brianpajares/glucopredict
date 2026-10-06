# DRIVE_SETUP

## 1. Crear service account
En Google Cloud crea/elige proyecto, habilita Google Drive API y crea una service account. Genera credenciales de service account solo para entorno server/CI; no las guardes en git.

## 2. Preparar carpeta
Crea `/Apps/glucopredict/` en Drive o una carpeta equivalente y comparte la carpeta objetivo con `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`. Configura `GOOGLE_DRIVE_FOLDER_ID` con el ID y `GOOGLE_DRIVE_ROOT_PATH=/Apps/glucopredict/`.

## 3. Variables
Usa exactamente: `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_ROOT_PATH`, `DRIVE_CACHE_TTL_SECONDS`.

## 4. Runtime
El loader busca los nombres de `spec/drive_manifest.json`, descarga por nombre/ruta, calcula SHA-256 y acepta solo el hash del manifest. Cache TTL = 24 h. Si Drive falla o el hash nuevo es inválido, usar únicamente la última versión válida cacheada y registrar alerta sin payload clínico.

## 5. Sincronización
`npm run drive:sync` recorre `drive/`, crea subcarpetas faltantes, sube/actualiza archivos en `GOOGLE_DRIVE_FOLDER_ID` y valida hashes contra `spec/drive_manifest.json`. Nunca sube `.env`, logs ni datos de usuarios.

## 6. Prueba
1. Sync.
2. Carga normal y checksum PASS.
3. Simula Drive no disponible: cache PASS.
4. Simula archivo alterado: versión rechazada y last-known-good PASS.
