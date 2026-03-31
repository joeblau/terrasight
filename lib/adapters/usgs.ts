import { COUNTY_FIPS_LIST } from "@/lib/arcgis/config"
import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"

const USGS_IV_URL = "https://waterservices.usgs.gov/nwis/iv/"
const PARAM_GAUGE_HEIGHT = "00065"

export async function fetchUSGSGauges(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const countyCodes = COUNTY_FIPS_LIST.join(",")
    const url = `${USGS_IV_URL}?format=json&countyCd=${countyCodes}&parameterCd=${PARAM_GAUGE_HEIGHT}&siteType=ST`

    const res = await fetch(url)
    if (!res.ok) {
      return { status: "error", error: `USGS API returned ${res.status}` }
    }

    const data = await res.json()
    const timeSeries = data?.value?.timeSeries ?? []

    const features: GeoFeature[] = timeSeries
      .map((ts: Record<string, unknown>): GeoFeature | null => {
        const site = ts.sourceInfo as Record<string, unknown> | undefined
        const geo = site?.geoLocation as Record<string, unknown> | undefined
        const loc = geo?.geogLocation as Record<string, unknown> | undefined
        const values = (ts.values as Array<Record<string, unknown>>)?.[0]
        const latest = (values?.value as Array<Record<string, unknown>>)?.[0]

        if (!loc || !latest) return null

        const lat = Number(loc.latitude)
        const lng = Number(loc.longitude)
        const gaugeHeight = parseFloat(latest.value as string)

        if (isNaN(lat) || isNaN(lng) || isNaN(gaugeHeight)) return null

        const siteName = (site?.siteName as string) ?? "Unknown"
        const siteCode =
          ((site?.siteCode as Array<Record<string, unknown>>)?.[0]
            ?.value as string) ?? ""

        const floodStage = (
          site?.siteProperty as Array<Record<string, unknown>>
        )?.find((p) => (p.name as string) === "floodStageUnits")

        const severity: GeoFeature["properties"]["severity"] =
          gaugeHeight > 15
            ? "critical"
            : gaugeHeight > 12
              ? "high"
              : gaugeHeight > 8
                ? "moderate"
                : "low"

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {
            id: `usgs-${siteCode}`,
            source: "usgs",
            name: siteName,
            severity,
            value: gaugeHeight,
            unit: "ft",
            label: `${gaugeHeight.toFixed(1)} ft`,
            description: `${siteName}: ${gaugeHeight.toFixed(1)} ft gauge height`,
            timestamp: (latest.dateTime as string) ?? new Date().toISOString(),
            siteCode,
            floodStage: floodStage ? Number(floodStage.value) : undefined,
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
      error: err instanceof Error ? err.message : "USGS fetch failed",
    }
  }
}

export const usgsAdapter = {
  source: "usgs" as const,
  displayName: "River Gauges",
  fetch: fetchUSGSGauges,
  refreshInterval: 60_000,
}
