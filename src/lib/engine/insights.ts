import { COMPONENT_KEYS, type ComponentKey, type Components } from "./types";

/** Factor con más puntos; desempate por orden estable del cuestionario (outputs_spec: insight). */
export function topComponent(components: Components): ComponentKey | null {
  let best: ComponentKey | null = null;
  let bestPts = 0;
  for (const key of COMPONENT_KEYS) {
    if (components[key] > bestPts) {
      best = key;
      bestPts = components[key];
    }
  }
  return best;
}

/** Orden de visualización: puntos descendentes y luego orden del cuestionario (components.md). */
export function orderedComponents(components: Components): ComponentKey[] {
  return [...COMPONENT_KEYS].sort(
    (a, b) => components[b] - components[a] || COMPONENT_KEYS.indexOf(a) - COMPONENT_KEYS.indexOf(b),
  );
}
