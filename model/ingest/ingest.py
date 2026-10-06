#!/usr/bin/env python3
"""
GlucoPredict source refresh / ingestion helper.

Purpose:
- Re-check source URLs used by the Stage 2 model package.
- Refresh World Bank PPP (private consumption) for pricing analysis.
- Never downloads or republishes copyrighted questionnaires.
- The risk engine itself does NOT require network access.

Usage:
  python ingest.py --out ./out
"""
from __future__ import annotations

import argparse
import csv
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

COUNTRIES = ["MEX", "BRA", "PER", "COL", "ESP", "USA"]
PPP_INDICATOR = "PA.NUS.PRVT.PP"
PPP_URL = (
    "https://api.worldbank.org/v2/country/"
    + ";".join(COUNTRIES)
    + f"/indicator/{PPP_INDICATOR}?format=json&per_page=200"
)

SOURCE_URLS = {
    "M01": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0299674",
    "M05": "https://www.cdc.gov/diabetes/widgets/risktest/about-the-test.html",
    "M06": "https://stacks.cdc.gov/view/cdc/116374",
    "M08": "https://www.health.gov.au/resources/apps-and-tools/the-australian-type-2-diabetes-risk-assessment-tool-ausdrisk",
    "M10": "https://january.ai/pricing",
    "M11": "https://january.ai/developer-terms/v1.0",
    "M12": "https://data.worldbank.org/indicator/PA.NUS.PPP",
    "M13": "https://www.paddle.com/pricing",
    "M14": "https://resend.com/pricing",
    "M15": "https://vercel.com/changelog/function-invocations-now-billed-per-unit",
    "M16": "https://data.worldbank.org/indicator/PA.NUS.PRVT.PP",
}


def fetch(url: str, timeout: int = 25) -> tuple[int, bytes, str]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GlucoPredict-build/2.0 (+source verification)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return int(getattr(r, "status", 200)), r.read(), r.headers.get("Content-Type", "")


def fetch_json(url: str) -> Any:
    status, body, _ = fetch(url)
    if status >= 400:
        raise RuntimeError(f"HTTP {status}: {url}")
    return json.loads(body.decode("utf-8"))


def latest_non_null(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_country: dict[str, dict[str, Any]] = {}
    for row in records:
        code = row.get("countryiso3code")
        if code not in COUNTRIES or row.get("value") is None:
            continue
        year = int(row["date"])
        current = by_country.get(code)
        if current is None or year > int(current["year"]):
            by_country[code] = {
                "countryiso3code": code,
                "country": row.get("country", {}).get("value"),
                "year": year,
                "value": row["value"],
                "indicator": PPP_INDICATOR,
                "source_url": PPP_URL,
                "status": "verified_at_ingest",
            }
    return sorted(by_country.values(), key=lambda x: x["countryiso3code"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./out")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    source_status = []
    for sid, url in SOURCE_URLS.items():
        try:
            status, _, content_type = fetch(url)
            source_status.append(
                {"id": sid, "url": url, "http_status": status, "content_type": content_type, "ok": status < 400}
            )
        except Exception as exc:
            source_status.append(
                {"id": sid, "url": url, "http_status": None, "content_type": None, "ok": False, "error": str(exc)}
            )
        time.sleep(0.1)

    (out / "source_status.json").write_text(
        json.dumps(source_status, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    payload = fetch_json(PPP_URL)
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        raise RuntimeError("Respuesta World Bank inesperada.")
    latest = latest_non_null(payload[1])
    expected = set(COUNTRIES)
    got = {x["countryiso3code"] for x in latest}
    if got != expected:
        raise RuntimeError(f"PPP incompleto: esperado={sorted(expected)} obtenido={sorted(got)}")
    if any(float(x["value"]) <= 0 for x in latest):
        raise RuntimeError("PPP inválido: todos los valores deben ser > 0.")

    (out / "ppp_private_consumption.json").write_text(
        json.dumps(latest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    with (out / "ppp_private_consumption.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["countryiso3code", "country", "year", "value", "indicator", "source_url", "status"],
        )
        w.writeheader()
        w.writerows(latest)

    print(f"Wrote {len(source_status)} source checks and {len(latest)} PPP country rows to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
