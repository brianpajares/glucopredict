#!/usr/bin/env python3
"""Motor de referencia GlucoPredict v2.0 (QA fix etapa 3).

Función pública:
    calculate(inputs, base) -> outputs

`base` puede ser:
- ruta al Excel base_glucopredict.xlsx, o
- dict pre-cargado con claves "Parametros", "Tablas_Score", "Tablas_Paises".

El lector XLSX usa solo la biblioteca estándar para mantener este archivo autónomo.
"""
from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List, Mapping, Union
import math
import zipfile
import xml.etree.ElementTree as ET

VERSION = "2.0"
_NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def _col_idx(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha()).upper()
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def _read_xlsx_sheet(path: Union[str, Path], sheet_name: str) -> List[Dict[str, Any]]:
    path = str(path)
    with zipfile.ZipFile(path) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{{{_NS_MAIN}}}si"):
                texts = [t.text or "" for t in si.iter(f"{{{_NS_MAIN}}}t")]
                shared.append("".join(texts))

        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        relmap = {
            r.attrib["Id"]: r.attrib["Target"]
            for r in rels.findall(f"{{{_NS_PKG_REL}}}Relationship")
        }
        target = None
        for s in wb.find(f"{{{_NS_MAIN}}}sheets"):
            if s.attrib.get("name") == sheet_name:
                rid = s.attrib[f"{{{_NS_REL}}}id"]
                target = relmap[rid]
                break
        if target is None:
            raise KeyError(f"Hoja no encontrada: {sheet_name}")
        if target.startswith("/"):
            sheet_file = target.lstrip("/")
        else:
            sheet_file = "xl/" + target.replace("../", "")
        root = ET.fromstring(zf.read(sheet_file))
        rows = []
        for row in root.findall(f".//{{{_NS_MAIN}}}row"):
            cells = {}
            max_idx = -1
            for c in row.findall(f"{{{_NS_MAIN}}}c"):
                idx = _col_idx(c.attrib["r"])
                max_idx = max(max_idx, idx)
                ctype = c.attrib.get("t")
                if ctype == "inlineStr":
                    is_node = c.find(f"{{{_NS_MAIN}}}is")
                    value = "".join((t.text or "") for t in is_node.iter(f"{{{_NS_MAIN}}}t")) if is_node is not None else ""
                else:
                    v = c.find(f"{{{_NS_MAIN}}}v")
                    raw = v.text if v is not None else None
                    if raw is None:
                        value = None
                    elif ctype == "s":
                        value = shared[int(raw)]
                    elif ctype == "b":
                        value = raw == "1"
                    elif ctype in ("str", "e"):
                        value = raw
                    else:
                        try:
                            num = float(raw)
                            value = int(num) if num.is_integer() else num
                        except Exception:
                            value = raw
                cells[idx] = value
            if max_idx >= 0:
                rows.append([cells.get(i) for i in range(max_idx + 1)])
        if not rows:
            return []
        headers = [str(x) if x is not None else "" for x in rows[0]]
        out = []
        for row in rows[1:]:
            rec = {}
            for i, h in enumerate(headers):
                if h:
                    rec[h] = row[i] if i < len(row) else None
            if any(v not in (None, "") for v in rec.values()):
                out.append(rec)
        return out


def load_base(base: Union[str, Path, Mapping[str, Any]]) -> Dict[str, Any]:
    if isinstance(base, Mapping):
        return dict(base)
    return {
        "Parametros": _read_xlsx_sheet(base, "Parametros"),
        "Tablas_Score": _read_xlsx_sheet(base, "Tablas_Score"),
        "Tablas_Paises": _read_xlsx_sheet(base, "Tablas_Paises"),
    }


def _to_bool(v: Any, name: str) -> bool:
    # Contrato estricto: inputs.schema.json exige boolean; no coercionar strings/0/1.
    if isinstance(v, bool):
        return v
    raise ValueError(f"{name} debe ser booleano")


def _validate(inputs: Mapping[str, Any]) -> Dict[str, Any]:
    required = [
        "age", "waist_threshold_sex", "body_measurements",
        "physical_activity_30m_daily", "fruit_veg_daily",
        "antihypertensive_medication", "history_high_glucose", "family_history"
    ]
    missing = [k for k in required if k not in inputs]
    if missing:
        raise ValueError("Faltan inputs: " + ", ".join(missing))
    country = str(inputs.get("country_code", "DEFAULT_LATAM")).upper()
    age_raw = inputs["age"]
    if isinstance(age_raw, bool) or not isinstance(age_raw, int):
        raise ValueError("age debe ser entero")
    age = age_raw
    if not 18 <= age <= 80:
        raise ValueError("age fuera de rango de producto (18–80)")
    sex = str(inputs["waist_threshold_sex"]).lower()
    if sex not in ("female", "male"):
        raise ValueError("waist_threshold_sex debe ser female o male")
    bm = inputs["body_measurements"]
    if not isinstance(bm, Mapping):
        raise ValueError("body_measurements debe ser objeto")
    def _finite_number(value: Any, name: str) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{name} debe ser número finito")
        out = float(value)
        if not math.isfinite(out):
            raise ValueError(f"{name} debe ser número finito")
        return out

    height_cm = _finite_number(bm["height_cm"], "height_cm")
    weight_kg = _finite_number(bm["weight_kg"], "weight_kg")
    waist_cm = _finite_number(bm["waist_cm"], "waist_cm")
    if not 120 <= height_cm <= 220:
        raise ValueError("height_cm fuera de rango 120–220")
    if not 35 <= weight_kg <= 250:
        raise ValueError("weight_kg fuera de rango 35–250")
    if not 50 <= waist_cm <= 180:
        raise ValueError("waist_cm fuera de rango 50–180")
    fh = str(inputs["family_history"]).lower()
    if fh not in ("none", "second_degree", "first_degree"):
        raise ValueError("family_history inválido")
    return {
        "country_code": country,
        "age": age,
        "waist_threshold_sex": sex,
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "waist_cm": waist_cm,
        "physical_activity_30m_daily": _to_bool(inputs["physical_activity_30m_daily"], "physical_activity_30m_daily"),
        "fruit_veg_daily": _to_bool(inputs["fruit_veg_daily"], "fruit_veg_daily"),
        "antihypertensive_medication": _to_bool(inputs["antihypertensive_medication"], "antihypertensive_medication"),
        "history_high_glucose": _to_bool(inputs["history_high_glucose"], "history_high_glucose"),
        "family_history": fh,
    }


def calculate(inputs: Mapping[str, Any], base: Union[str, Path, Mapping[str, Any]]) -> Dict[str, Any]:
    """Calcula score y salidas auditables. No diagnostica."""
    x = _validate(inputs)
    b = load_base(base)
    p = {str(r["parametro"]): float(r["valor"]) for r in b["Parametros"]}
    profiles = {str(r["country_code"]).upper(): r for r in b["Tablas_Paises"]}
    effective_country = x["country_code"] if x["country_code"] in profiles else "DEFAULT_LATAM"
    profile = profiles.get(effective_country)
    if not profile:
        raise ValueError("No existe perfil país ni DEFAULT_LATAM")
    variant = str(profile["variant"])
    threshold = int(float(profile["followup_threshold"]))

    age = x["age"]
    if age < p["age_cut_1"]:
        age_pts = int(p["age_pts_0"])
    elif age < p["age_cut_2"]:
        age_pts = int(p["age_pts_1"])
    elif age < p["age_cut_3"]:
        age_pts = int(p["age_pts_2"])
    else:
        age_pts = int(p["age_pts_3"])

    bmi = x["weight_kg"] / ((x["height_cm"] / 100.0) ** 2)
    bmi_for_scoring = round(bmi, 6)  # evita errores de frontera por coma flotante
    if bmi_for_scoring < p["bmi_cut_1"]:
        bmi_pts = int(p["bmi_pts_0"])
    elif bmi_for_scoring < p["bmi_cut_2"]:
        bmi_pts = int(p["bmi_pts_1"])
    else:
        bmi_pts = int(p["bmi_pts_2"])

    sex = x["waist_threshold_sex"]
    waist = x["waist_cm"]
    if variant == "LA_FINDRISC":
        cut = p["la_waist_m_cut"] if sex == "male" else p["la_waist_f_cut"]
        waist_pts = int(p["la_waist_pts_high"] if waist >= cut else p["la_waist_pts_low"])
    elif variant == "FINDRISC":
        if sex == "male":
            c1, c2 = p["fi_waist_m_cut1"], p["fi_waist_m_cut2"]
        else:
            c1, c2 = p["fi_waist_f_cut1"], p["fi_waist_f_cut2"]
        if waist < c1:
            waist_pts = int(p["fi_waist_pts_0"])
        elif waist < c2:
            waist_pts = int(p["fi_waist_pts_1"])
        else:
            waist_pts = int(p["fi_waist_pts_2"])
    else:
        raise ValueError(f"variant no soportada: {variant}")

    activity_pts = 0 if x["physical_activity_30m_daily"] else int(p["inactive_pts"])
    diet_pts = 0 if x["fruit_veg_daily"] else int(p["not_daily_fv_pts"])
    bp_pts = int(p["antihypertensive_pts"]) if x["antihypertensive_medication"] else 0
    glucose_pts = int(p["high_glucose_history_pts"]) if x["history_high_glucose"] else 0
    family_pts = {
        "none": 0,
        "second_degree": int(p["family_second_degree_pts"]),
        "first_degree": int(p["family_first_degree_pts"]),
    }[x["family_history"]]

    components = {
        "age": age_pts, "bmi": bmi_pts, "waist": waist_pts,
        "physical_activity": activity_pts, "fruit_veg": diet_pts,
        "antihypertensive": bp_pts, "history_high_glucose": glucose_pts,
        "family_history": family_pts,
    }
    score = int(sum(components.values()))
    if score < 0 or score > int(p["score_max"]):
        raise AssertionError("Score fuera del rango parametrizado")

    band_row = None
    for r in b["Tablas_Score"]:
        if int(float(r["min_score"])) <= score <= int(float(r["max_score"])):
            band_row = r
            break
    if band_row is None:
        raise AssertionError("No hay banda para score")

    # Escenario contrafactual: solo factores modificables del score.
    mod_components = dict(components)
    mod_components["physical_activity"] = 0
    mod_components["fruit_veg"] = 0
    # BMI: escenario al siguiente umbral inferior alcanzable, sin prescribir peso.
    target_bmi = None
    approx_weight_for_next_bmi = None
    if bmi_for_scoring >= p["bmi_cut_2"]:
        target_bmi = p["bmi_cut_2"] - 0.01
    elif bmi_for_scoring >= p["bmi_cut_1"]:
        target_bmi = p["bmi_cut_1"] - 0.01
    if target_bmi is not None:
        approx_weight_for_next_bmi = target_bmi * ((x["height_cm"]/100.0) ** 2)
        if target_bmi < p["bmi_cut_1"]:
            mod_components["bmi"] = int(p["bmi_pts_0"])
        elif target_bmi < p["bmi_cut_2"]:
            mod_components["bmi"] = int(p["bmi_pts_1"])
    # Cintura: score scenario al quedar debajo del primer umbral aplicable.
    mod_components["waist"] = 0
    best_case_score = int(sum(mod_components.values()))

    return {
        "model_version": VERSION,
        "model_variant": variant,
        "country_code": effective_country,
        "bmi": round(bmi, 2),
        "score": score,
        "risk_band": str(band_row["band"]),
        "reference_10y_pct": float(band_row["referencia_10y_pct"]),
        "reference_scope": "historical_FINDRISC_population_reference_not_personal_probability",
        "followup_threshold": threshold,
        "lab_followup_recommended": score >= threshold,
        "components": components,
        "modifiable_scenario": {
            "best_case_score_under_score_rules": best_case_score,
            "removable_points": score - best_case_score,
            "next_bmi_threshold": None if target_bmi is None else round(target_bmi, 2),
            "approx_weight_kg_at_next_bmi_threshold": None if approx_weight_for_next_bmi is None else round(approx_weight_for_next_bmi, 1),
            "causal_claim": False
        },
        "disclaimer": "Herramienta de cribado/riesgo; no diagnostica diabetes ni prediabetes. La confirmación requiere prueba clínica y profesional de salud."
    }


if __name__ == "__main__":
    import argparse, json
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("inputs_json")
    args = ap.parse_args()
    data = json.loads(Path(args.inputs_json).read_text(encoding="utf-8"))
    print(json.dumps(calculate(data, args.base), ensure_ascii=False, indent=2))
