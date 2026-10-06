# Cómo funciona GlucoPredict — Model Card v2.0

**Actualizado:** 2 de octubre de 2026

## Qué hace

GlucoPredict calcula un **score de cribado de 0 a 26 puntos** a partir de ocho respuestas fáciles de obtener: edad, medidas corporales, actividad física, consumo diario de frutas/verduras, medicación para hipertensión, antecedente de glucosa alta y antecedentes familiares.

El objetivo es ayudarte a decidir si **vale la pena confirmar con una prueba clínica**, no darte un diagnóstico.

## Cómo se calcula

El motor usa la familia FINDRISC. En mercados latinoamericanos se usa una variante LA-FINDRISC para la cintura; en España se conserva la regla FINDRISC original. Cada respuesta suma una cantidad fija de puntos. El cálculo está implementado dos veces —en Python y en una hoja Excel— para que pueda auditarse.

Tu altura y peso se usan para calcular BMI/IMC. La cintura se puntúa según los cortes publicados de la variante activa. El resultado final es la suma de ocho componentes.

## Qué significa el número

La cifra principal es el **score**, no una probabilidad personalizada.

Las bandas históricas de FINDRISC se pueden usar como contexto. Los porcentajes clásicos asociados a esas bandas provienen de la población original del modelo y **no deben interpretarse como “tu probabilidad exacta”**, porque la calibración cambia por país y población.

En Perú existe una validación de 2024 en 549 trabajadores de un hospital. Para detectar disglucemia no diagnosticada, LA-FINDRISC tuvo AUROC 0.715 y el estudio seleccionó un corte ≥11 para screening (sensibilidad 78.6%, especificidad 51.7%). Esa evidencia es útil, pero no equivale a una validación nacional en población general.

## Qué tan confiable es

- El cálculo aritmético es determinista: con las mismas respuestas produce el mismo resultado.
- El motor aplica el contrato de tipos de forma estricta: no convierte silenciosamente edades decimales ni strings/0/1 en booleanos.
- Los casos de frontera se prueban automáticamente.
- El score tiene evidencia publicada, pero su discriminación es moderada cuando se usa fuera de la población original.
- Solo Perú tiene en esta versión un umbral local marcado como **verificado**; México, Brasil, Colombia y España quedan **preliminares** hasta contar con validación local alineada al outcome.

Por eso GlucoPredict muestra score, banda y orientación de seguimiento, no una certeza clínica.

## Escenarios modificables

El informe puede recalcular cuántos puntos tendría el score si una respuesta modificable cambiara (por ejemplo, actividad diaria o una categoría de BMI/cintura). Esto es un **escenario de la regla**, no una predicción causal. Para evitar divergencias en los cortes 25/30, el escenario de BMI usa el mismo BMI redondeado a 6 decimales que el scoring. “Quitar 2 puntos” no significa que el riesgo real baje una cantidad equivalente.

## De dónde salen los datos

Fuentes principales:
- PLOS ONE 2024, validación externa FINDRISC/LA-FINDRISC en Perú: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0299674
- CDC/ADA Prediabetes Risk Test (respaldo; dominio público): https://stacks.cdc.gov/view/cdc/116374
- Revisión de modelos de riesgo: https://pmc.ncbi.nlm.nih.gov/articles/PMC3225074/
- Parámetros y fuentes completas: `fuentes_datos.csv` y el Excel `base_glucopredict.xlsx`.

## Límites importantes

GlucoPredict **no diagnostica** diabetes, prediabetes ni otra enfermedad; no sustituye una consulta; no recomienda medicamentos; no sirve para urgencias; y no debe usarse para decidir tratamiento. Una persona con síntomas, embarazo, diagnóstico previo o dudas clínicas necesita orientación profesional apropiada.

Un resultado bajo tampoco descarta enfermedad. Solo una evaluación clínica y las pruebas correspondientes pueden confirmar o descartar diabetes/prediabetes.

## Licencia y revisión pendiente

La validación PLOS usada como evidencia es CC BY 4.0. La validación peruana 2018 usada para scoring (M03) también está publicada bajo CC BY 4.0. La revisión M09 es CC BY-NC 2.0 y se usa solo como referencia factual, no para reutilizar contenido en un producto comercial. El test CDC/ADA alojado en CDC Stacks está marcado Public Domain. Antes del lanzamiento comercial debe cerrarse una revisión específica sobre el uso del nombre/marca y la reproducción literal del instrumento FINDRISC/LA-FINDRISC; si no queda claro, el producto debe usar copy propio y la implementación permitida por las fuentes abiertas, o activar el respaldo con licencia clara donde corresponda.

## Copia corta de seguridad

**ES:** “Este resultado es una herramienta de cribado y no un diagnóstico. Si el score sugiere seguimiento, confirma con una prueba clínica y un profesional de salud.”  
**EN:** “This result is a screening tool, not a diagnosis. If your score suggests follow-up, confirm with an appropriate blood test and a health professional.”  
**PT-BR:** “Este resultado é uma ferramenta de triagem, não um diagnóstico. Se o score indicar acompanhamento, confirme com um exame adequado e um profissional de saúde.”
