import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?area=FL"

const SEVERITY_MAP: Record<string, GeoFeature["properties"]["severity"]> = {
  Extreme: "critical",
  Severe: "critical",
  Moderate: "high",
  Minor: "moderate",
  Unknown: "low",
}

export async function fetchNWSAlerts(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const res = await fetch(NWS_ALERTS_URL, {
      headers: { "User-Agent": "Terrasight/1.0 (disaster-response-research)" },
    })
    if (!res.ok) {
      return { status: "error", error: `NWS API returned ${res.status}` }
    }

    const data = await res.json()
    const rawFeatures = data?.features ?? []

    const features: GeoFeature[] = rawFeatures
      .map((f: Record<string, unknown>): GeoFeature | null => {
        const props = f.properties as Record<string, unknown>
        const geometry = f.geometry as GeoFeature["geometry"] | null

        if (!geometry) return null

        const id = (props.id as string) ?? crypto.randomUUID()
        const event = (props.event as string) ?? "Unknown Alert"
        const severity = SEVERITY_MAP[(props.severity as string) ?? "Unknown"] ?? "low"
        const headline = (props.headline as string) ?? ""
        const description = (props.description as string) ?? ""
        const areaDesc = (props.areaDesc as string) ?? ""
        const expires = (props.expires as string) ?? ""

        return {
          type: "Feature",
          geometry,
          properties: {
            id: `nws-${id}`,
            source: "nws",
            name: event,
            severity,
            label: event,
            description: headline,
            timestamp: (props.effective as string) ?? new Date().toISOString(),
            areaDesc,
            expires,
            fullDescription: description,
          },
        }
      })
      .filter(Boolean) as GeoFeature[]

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "NWS fetch failed",
    }
  }
}

export const nwsAdapter = {
  source: "nws" as const,
  displayName: "Weather Alerts",
  fetch: fetchNWSAlerts,
  refreshInterval: 30_000,
}
