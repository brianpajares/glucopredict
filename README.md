# GlucoPredict

Educational FINDRISC/LA-FINDRISC risk screener. Not a diagnosis, does not estimate personal calibrated probability, and does not provide treatment advice.

## Validation preview

This repository contains the supplied self-contained UX prototype and stage 4 product specification. `index.html` runs entirely in the browser. Its report email form is demonstration-only and does not transmit or persist email addresses or screening answers. Payments remain disabled while traction, legal/privacy review, and instrument licensing are unresolved.

The preview currently uses the Peru profile. The score and follow-up threshold are educational and do not replace professional assessment. Do not use for pregnancy, people under 18, known diabetes, emergencies, or treatment decisions.

## Run and deploy

Open `index.html` in a modern browser. This is a static site. Vercel can deploy the repository root without a build command. `vercel.json` configures security headers and `noindex` until the production release gates are complete.

The full production brief calls for a server-side Next.js implementation, exact parity with `spec/test_vectors.json`, private report delivery, and security and privacy controls. These production features are not included in this static preview. Complete `docs/LAUNCH_CHECKLIST.md` and acceptance gates before collecting real health data, sending reports, enabling payments, or promoting the tool as a clinical service.

Pricing in `spec/monetizacion.json` is a set of hypotheses, not validated offers. Keep `MONETIZATION_MODE=validation` until every payment gate is approved.