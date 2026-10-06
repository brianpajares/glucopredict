# GlucoPredict

GlucoPredict is an educational risk screener based on the supplied FINDRISC / LA-FINDRISC specification. It is not a diagnosis, does not estimate an individual's calibrated probability, and does not provide treatment advice.

## Current release: validation preview

This repository contains the supplied self-contained UX prototype as `index.html` and the stage 4 product specification. The preview runs entirely in the browser. Its report email form is a demonstration: it does not transmit or persist email addresses or screening answers. Payment is intentionally disabled while demand, local validation, legal/privacy review, and instrument licensing are unresolved.

The calculation currently follows the prototype's Peru profile. The score, band, and follow-up threshold remain educational and do not replace professional assessment. Do not use the preview for people under 18, pregnancy, known diabetes, emergencies, or treatment decisions.

## Run locally

Open `index.html` in a modern browser. No build tool or server is required for this validation preview.

## Deploy

The repository is a static site and can be deployed on Vercel with the project root as the root directory and no build command. See `vercel.json` for response headers. The current preview is marked `noindex` until launch gates are completed.

## Before production

The full product brief calls for a Next.js application, server-side report delivery, privacy controls, localization QA, exact parity with `spec/test_vectors.json`, and security/operational controls. Those production features are not present in this static preview. Complete `docs/LAUNCH_CHECKLIST.md` and the acceptance gates before collecting real health data, sending reports, enabling payments, or promoting the tool as a clinical service.

Pricing figures in `spec/monetizacion.json` are hypotheses, not validated offers. Keep `MONETIZATION_MODE=validation`; do not activate checkout until the traction, margin, consent, licensing, and legal gates have been approved.
