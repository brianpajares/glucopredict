# Ingest

`ingest.py` refresca únicamente datos públicos de soporte (PPP del World Bank) y verifica disponibilidad de URLs.

El motor FINDRISC/LA-FINDRISC no necesita un dataset grande ni una descarga para calcular resultados; sus parámetros versionados están en `drive/base/base_glucopredict.xlsx`.

No hay `train.py` en v2.0 porque no se entrena un modelo ML. Si una etapa futura introduce recalibración/ML, el entrenamiento debe ser reproducible, con semilla fija, split documentado, métricas y exportación de coeficientes/ONNX.
