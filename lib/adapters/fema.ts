import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"
import mockShelters from "@/lib/mocks/shelters.json"

// FEMA GIS ArcGIS REST service (NSS/OpenShelters)
// Data from ESF6-SS database, synced with Red Cross, refreshed every 20 min
const FEMA_SHELTERS_URL =
  "https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query"

// Filter to Florida shelters in the 14-county region
const FL_QUERY_PARAMS = new URLSearchParams({
  where: "state = 'FL'",
  outFields: "*",
  f: "json",
  resultRecordCount: "500",
})

export async function fetchFEMAShelters(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const url = `${FEMA_SHELTERS_URL}?${FL_QUERY_PARAMS}`
    const res = await fetch(url)

    if (!res.ok) {
      return useMockData("FEMA GIS returned " + res.status)
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("json")) {
      return useMockData("FEMA returned non-JSON response")
    }

    const data = await res.json()
    const esriFeatures = data?.features ?? []

    if (esriFeatures.length === 0) {
      // No FL shelters active — fall back to mock, but also try nationwide
      return fetchAllShelters()
    }

    const features = esriFeatures
      .map(mapEsriFeature)
      .filter(Boolean) as GeoFeature[]

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch (err) {
    return useMockData(
      err instanceof Error ? err.message : "FEMA fetch failed"
    )
  }
}

// If no FL shelters, fetch all shelters nationwide (there may be active ones elsewhere)
async function fetchAllShelters(): Promise<AdapterResult<GeoFeatureCollection>> {
  try {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      f: "json",
      resultRecordCount: "500",
    })
    const res = await fetch(`${FEMA_SHELTERS_URL}?${params}`)
    if (!res.ok) return useMockData("No FL shelters, nationwide query failed")

    const data = await res.json()
    const esriFeatures = data?.features ?? []

    if (esriFeatures.length === 0) {
      return useMockData("No active shelters nationwide")
    }

    const features = esriFeatures
      .map(mapEsriFeature)
      .filter(Boolean) as GeoFeature[]

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch {
    return useMockData("No active shelters")
  }
}

interface EsriFeature {
  attributes: Record<string, unknown>
  geometry: { x: number; y: number } | null
}

function mapEsriFeature(f: EsriFeature): GeoFeature | null {
  const a = f.attributes
  const g = f.geometry

  if (!g || isNaN(g.x) || isNaN(g.y)) return null

  const name = (a.shelter_name as string) ?? "Unknown Shelter"
  const status = (a.shelter_status as string) ?? "UNKNOWN"
  const evacCap = Number(a.evacuation_capacity) || 0
  const postCap = Number(a.post_impact_capacity) || 0
  const capacity = evacCap || postCap || 0
  const population = Number(a.total_population) || 0
  const ratio = capacity > 0 ? population / capacity : 0

  const severity: GeoFeature["properties"]["severity"] =
    status !== "OPEN"
      ? "low"
      : ratio > 0.9
        ? "critical"
        : ratio > 0.7
          ? "high"
          : ratio > 0.5
            ? "moderate"
            : "low"

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [g.x, g.y],
    },
    properties: {
      id: `fema-${a.shelter_id ?? a.objectid ?? crypto.randomUUID()}`,
      source: "fema",
      name,
      severity,
      value: population,
      unit: capacity > 0 ? `/ ${capacity}` : "",
      label: capacity > 0 ? `${population}/${capacity}` : status,
      description: [
        `${name}: ${status}`,
        capacity > 0 ? `${population}/${capacity} capacity` : null,
        a.city ? `${a.city}, ${a.state}` : null,
      ]
        .filter(Boolean)
        .join(". "),
      timestamp: new Date().toISOString(),
      shelterStatus: status,
      capacity,
      evacuationCapacity: evacCap,
      postImpactCapacity: postCap,
      occupancy: population,
      address: (a.address as string) ?? "",
      city: (a.city as string) ?? "",
      state: (a.state as string) ?? "",
      county: (a.county as string) ?? "",
      countyFips: "",
      zip: (a.zip as string) ?? "",
      orgName: (a.org_name as string) ?? "",
      hoursOpen: (a.hours_open as string) ?? "",
      hoursClose: (a.hours_close as string) ?? "",
    },
  }
}

function useMockData(reason: string): AdapterResult<GeoFeatureCollection> {
  const mock = mockShelters as GeoFeatureCollection
  return {
    status: "ok",
    data: {
      ...mock,
      features: mock.features.map((f) => ({
        ...f,
        properties: { ...f.properties, isMockData: true, mockReason: reason },
      })),
    },
    fetchedAt: new Date(),
  }
}

export const femaAdapter = {
  source: "fema" as const,
  displayName: "Shelters",
  fetch: fetchFEMAShelters,
  refreshInterval: 300_000, // 5 min (FEMA refreshes every 20 min)
}
