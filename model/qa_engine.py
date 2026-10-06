#!/usr/bin/env python3
"""
Motor QA independiente de GlucoPredict.
Construido desde model_spec.json + base_glucopredict.xlsx, sin depender de engine_reference.py.
"""
from __future__ import annotations
import json, math, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"

DISCLAIMER = (
    "Herramienta de cribado/riesgo; no diagnostica diabetes ni prediabetes. "
    "La confirmación requiere prueba clínica y profesional de salud."
)
REF_SCOPE = "historical_FINDRISC_population_reference_not_personal_probability"

def _col_index(ref: str) -> int:
    letters = "".join(c for c in ref if c.isalpha())
    n = 0
    for c in letters:
        n = n * 26 + ord(c.upper()) - 64
    return n - 1

def _xlsx_sheet_rows(path: str | Path, sheet_name: str) -> List[List[Any]]:
    """Lee valores almacenados de una hoja XLSX con stdlib (sin motor de fórmulas)."""
    path = Path(path)
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS_MAIN}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{NS_MAIN}t")))

        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels.findall(f"{PKG_REL}Relationship")}
        target = None
        for s in wb.find(f"{NS_MAIN}sheets"):
            if s.attrib.get("name") == sheet_name:
                rid = s.attrib[f"{NS_REL}id"]
                target = relmap[rid]
                break
        if target is None:
            raise KeyError(f"Hoja no encontrada: {sheet_name}")
        if not target.startswith("/"):
            target = "xl/" + target.lstrip("/")
        else:
            target = target.lstrip("/")
        xml = ET.fromstring(z.read(target))
        data = xml.find(f"{NS_MAIN}sheetData")
        rows: List[List[Any]] = []
        max_col = 0
        cells_by_row = []
        for row in data.findall(f"{NS_MAIN}row"):
            vals = {}
            for c in row.findall(f"{NS_MAIN}c"):
                idx = _col_index(c.attrib["r"])
                t = c.attrib.get("t")
                v = c.find(f"{NS_MAIN}v")
                inline = c.find(f"{NS_MAIN}is")
                val: Any = None
                if t == "inlineStr" and inline is not None:
                    val = "".join(x.text or "" for x in inline.iter(f"{NS_MAIN}t"))
                elif v is not None:
                    raw = v.text
                    if t == "s":
                        val = shared[int(raw)]
                    elif t == "b":
                        val = raw == "1"
                    elif t in ("str", "e"):
                        val = raw
                    else:
                        try:
                            num = float(raw)
                            val = int(num) if num.is_integer() else num
                        except Exception:
                            val = raw
                vals[idx] = val
                max_col = max(max_col, idx)
            cells_by_row.append(vals)
        for vals in cells_by_row:
            rows.append([vals.get(i) for i in range(max_col + 1)])
        return rows

def load_base(base_xlsx: str | Path) -> Dict[str, Any]:
    params_rows = _xlsx_sheet_rows(base_xlsx, "Parametros")
    params = {r[0]: r[1] for r in params_rows[1:] if r and r[0] is not None}

    score_rows = _xlsx_sheet_rows(base_xlsx, "Tablas_Score")
    score_headers = score_rows[0]
    bands = [dict(zip(score_headers, r)) for r in score_rows[1:] if r and r[0] is not None]

    country_rows = _xlsx_sheet_rows(base_xlsx, "Tablas_Paises")
    country_headers = country_rows[0]
    countries = {
        r[0]: dict(zip(country_headers, r))
        for r in country_rows[1:] if r and r[0] is not None
    }
    return {"params": params, "bands": bands, "countries": countries}

def _validate(inputs: Dict[str, Any], spec: Dict[str, Any]) -> None:
    def finite_num(name, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            raise ValueError(f"{name}: debe ser número finito")
    ranges = {v["name"]: v.get("valid_product_range") for v in spec["variables"]}
    age_value = inputs.get("age")
    if isinstance(age_value, bool) or not isinstance(age_value, int):
        raise ValueError("age: debe ser entero")
    finite_num("age", age_value)
    bm = inputs.get("body_measurements")
    if not isinstance(bm, dict):
        raise ValueError("body_measurements: requerido")
    for key in ("height_cm", "weight_kg", "waist_cm"):
        finite_num(key, bm.get(key))
    vals = {
        "age": inputs["age"],
        "height_cm": bm["height_cm"],
        "weight_kg": bm["weight_kg"],
        "waist_cm": bm["waist_cm"],
    }
    for k, value in vals.items():
        lo, hi = ranges[k]
        if not (lo <= value <= hi):
            raise ValueError(f"{k}: fuera de rango [{lo}, {hi}]")
    if inputs.get("waist_threshold_sex") not in ("female", "male"):
        raise ValueError("waist_threshold_sex: valor inválido")
    if inputs.get("family_history") not in ("none", "second_degree", "first_degree"):
        raise ValueError("family_history: valor inválido")
    for k in ("physical_activity_30m_daily","fruit_veg_daily","antihypertensive_medication","history_high_glucose"):
        if not isinstance(inputs.get(k), bool):
            raise ValueError(f"{k}: debe ser boolean")

def calculate(inputs: Dict[str, Any], base_xlsx: str | Path, model_spec_path: str | Path) -> Dict[str, Any]:
    spec = json.loads(Path(model_spec_path).read_text(encoding="utf-8"))
    base = load_base(base_xlsx)
    _validate(inputs, spec)
    p = base["params"]

    country = inputs.get("country_code") or "DEFAULT_LATAM"
    if country not in base["countries"]:
        country = "DEFAULT_LATAM"
    profile = base["countries"][country]
    variant = profile["variant"]
    followup_threshold = int(profile["followup_threshold"])

    age = int(inputs["age"])
    bm = inputs["body_measurements"]
    h = float(bm["height_cm"])
    w = float(bm["weight_kg"])
    waist = float(bm["waist_cm"])
    sex = inputs["waist_threshold_sex"]

    raw_bmi = w / (h / 100.0) ** 2
    bmi_for_scoring = round(raw_bmi, 6)
    bmi_display = round(raw_bmi, 2)

    if age < p["age_cut_1"]: age_pts = int(p["age_pts_0"])
    elif age < p["age_cut_2"]: age_pts = int(p["age_pts_1"])
    elif age < p["age_cut_3"]: age_pts = int(p["age_pts_2"])
    else: age_pts = int(p["age_pts_3"])

    if bmi_for_scoring < p["bmi_cut_1"]: bmi_pts = int(p["bmi_pts_0"])
    elif bmi_for_scoring < p["bmi_cut_2"]: bmi_pts = int(p["bmi_pts_1"])
    else: bmi_pts = int(p["bmi_pts_2"])

    if variant == "LA_FINDRISC":
        cut = p["la_waist_m_cut"] if sex == "male" else p["la_waist_f_cut"]
        waist_pts = int(p["la_waist_pts_high"] if waist >= cut else p["la_waist_pts_low"])
    else:
        c1 = p["fi_waist_m_cut1"] if sex == "male" else p["fi_waist_f_cut1"]
        c2 = p["fi_waist_m_cut2"] if sex == "male" else p["fi_waist_f_cut2"]
        if waist < c1: waist_pts = int(p["fi_waist_pts_0"])
        elif waist < c2: waist_pts = int(p["fi_waist_pts_1"])
        else: waist_pts = int(p["fi_waist_pts_2"])

    activity_pts = 0 if inputs["physical_activity_30m_daily"] else int(p["inactive_pts"])
    diet_pts = 0 if inputs["fruit_veg_daily"] else int(p["not_daily_fv_pts"])
    bp_pts = int(p["antihypertensive_pts"]) if inputs["antihypertensive_medication"] else 0
    glucose_pts = int(p["high_glucose_history_pts"]) if inputs["history_high_glucose"] else 0
    fam = inputs["family_history"]
    family_pts = 0 if fam == "none" else int(p["family_second_degree_pts"] if fam == "second_degree" else p["family_first_degree_pts"])

    components = {
        "age": age_pts, "bmi": bmi_pts, "waist": waist_pts,
        "physical_activity": activity_pts, "fruit_veg": diet_pts,
        "antihypertensive": bp_pts, "history_high_glucose": glucose_pts,
        "family_history": family_pts,
    }
    score = sum(components.values())

    band_row = next(r for r in base["bands"] if int(r["min_score"]) <= score <= int(r["max_score"]))
    risk_band = band_row["band"]
    ref_pct = float(band_row["referencia_10y_pct"])

    # Escenario de reglas: solo palancas modificables que cambian el score, sin claim causal.
    # Cintura -> zona de 0 puntos; actividad/dieta -> 0; BMI -> siguiente corte inferior.
    removable = activity_pts + diet_pts + waist_pts
    next_bmi_threshold = None
    approx_weight = None
    bmi_reduction = 0
    if bmi_for_scoring >= float(p["bmi_cut_2"]):
        next_bmi_threshold = float(p["bmi_cut_2"]) - 0.01
        bmi_reduction = bmi_pts - int(p["bmi_pts_1"])
    elif bmi_for_scoring >= float(p["bmi_cut_1"]):
        next_bmi_threshold = float(p["bmi_cut_1"]) - 0.01
        bmi_reduction = bmi_pts - int(p["bmi_pts_0"])
    if next_bmi_threshold is not None:
        approx_weight = round(next_bmi_threshold * (h/100.0)**2, 1)
        removable += bmi_reduction

    return {
        "model_version": str(spec["model_version"]),
        "model_variant": variant,
        "country_code": country,
        "bmi": bmi_display,
        "score": int(score),
        "risk_band": risk_band,
        "reference_10y_pct": ref_pct,
        "reference_scope": REF_SCOPE,
        "followup_threshold": followup_threshold,
        "lab_followup_recommended": bool(score >= followup_threshold),
        "components": components,
        "modifiable_scenario": {
            "best_case_score_under_score_rules": int(score - removable),
            "removable_points": int(removable),
            "next_bmi_threshold": next_bmi_threshold,
            "approx_weight_kg_at_next_bmi_threshold": approx_weight,
            "causal_claim": False,
        },
        "disclaimer": DISCLAIMER,
    }

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs_json")
    ap.add_argument("--base", required=True)
    ap.add_argument("--spec", required=True)
    args = ap.parse_args()
    print(json.dumps(calculate(json.loads(Path(args.inputs_json).read_text()), args.base, args.spec), ensure_ascii=False, indent=2))
