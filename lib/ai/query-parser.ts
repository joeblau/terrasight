import { COUNTY_FIPS } from "@/lib/arcgis/config"

export type SpatialQuery =
  | { type: "county-summary"; countyFips: string }
  | { type: "risk-ranking"; metric: "flood" | "shelter" | "combined"; limit: number }
  | { type: "nearby"; featureType: "shelter" | "gauge"; center: [number, number]; radiusKm: number }
  | { type: "threshold-check"; metric: string; operator: ">" | "<"; value: number }
  | { type: "freeform"; prompt: string }

// Deterministic parsing for common patterns (no LLM needed)
export function parseDeterministic(query: string): SpatialQuery | null {
  const q = query.toLowerCase().trim()

  // County name match: "summarize lee county", "tell me about collier"
  for (const [fips, name] of Object.entries(COUNTY_FIPS)) {
    if (q.includes(name.toLowerCase())) {
      if (
        q.includes("summar") ||
        q.includes("brief") ||
        q.includes("tell me about") ||
        q.includes("show me") ||
        q.includes("what about") ||
        q.includes("status")
      ) {
        return { type: "county-summary", countyFips: fips }
      }
    }
  }

  // Risk ranking: "highest risk", "worst counties", "most dangerous"
  if (
    q.includes("highest risk") ||
    q.includes("worst") ||
    q.includes("most dangerous") ||
    q.includes("rank")
  ) {
    const metric = q.includes("flood") || q.includes("gauge")
      ? "flood" as const
      : q.includes("shelter")
        ? "shelter" as const
        : "combined" as const
    return { type: "risk-ranking", metric, limit: 5 }
  }

  // Shelter queries
  if (q.includes("shelter") && (q.includes("near") || q.includes("close"))) {
    return { type: "risk-ranking", metric: "shelter", limit: 10 }
  }

  // Gauge queries
  if (
    q.includes("gauge") &&
    (q.includes("rising") || q.includes("above") || q.includes("flood"))
  ) {
    return {
      type: "threshold-check",
      metric: "gauge_severity",
      operator: ">",
      value: 0.5,
    }
  }

  // "which counties" pattern
  if (q.includes("which count")) {
    if (q.includes("shelter") || q.includes("capaci")) {
      return { type: "risk-ranking", metric: "shelter", limit: 14 }
    }
    if (q.includes("flood") || q.includes("risk")) {
      return { type: "risk-ranking", metric: "combined", limit: 14 }
    }
  }

  return null
}
