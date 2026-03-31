import type {
  AdapterResult,
  GeoFeatureCollection,
  GeoFeature,
} from "./types"

// Server-side cached endpoint — avoids NOAA 10 req/5min rate limit
const GAUGES_URL = "/api/data/nwps"

interface NwpsGauge {
  lid: string
  name: string
  latitude: number
  longitude: number
  state: string
  county: string
  status?: {
    forecast?: {
      primary?: number
      primaryUnit?: string
      floodCategory?: string
      validTime?: string
    }
    observed?: {
      primary?: number
      primaryUnit?: string
      floodCategory?: string
      validTime?: string
    }
  }
  flood?: {
    categories?: {
      action?: { stage?: number }
      minor?: { stage?: number }
      moderate?: { stage?: number }
      major?: { stage?: number }
    }
  }
}

const FLOOD_CATEGORY_SEVERITY: Record<string, number> = {
  major_flooding: 4,
  moderate_flooding: 3,
  minor_flooding: 2,
  action: 1,
  no_flooding: 0,
}

const SEVERITY_LEVELS: GeoFeature["properties"]["severity"][] = [
  "low",
  "low",
  "moderate",
  "high",
  "critical",
]

function sanitizeValue(val: number | undefined | null): number | null {
  if (val === undefined || val === null) return null
  if (val === -9999 || val === -999) return null
  return val
}

function floodCategoryToSeverityRank(category: string | undefined): number {
  if (!category) return 0
  return FLOOD_CATEGORY_SEVERITY[category] ?? 0
}

function severityFromRank(
  rank: number,
): GeoFeature["properties"]["severity"] {
  return SEVERITY_LEVELS[Math.min(rank, SEVERITY_LEVELS.length - 1)]
}

function determineSeverity(
  observedCategory: string | undefined,
  forecastCategory: string | undefined,
): GeoFeature["properties"]["severity"] {
  const obsRank = floodCategoryToSeverityRank(observedCategory)
  const fctRank = floodCategoryToSeverityRank(forecastCategory)
  return severityFromRank(Math.max(obsRank, fctRank))
}

export async function fetchNwpsForecasts(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    // Fetch from server-side cached endpoint (caches NOAA response for 5 min)
    const listRes = await fetch(GAUGES_URL)
    if (!listRes.ok) {
      return {
        status: "error",
        error: `NWPS gauge list API returned ${listRes.status}`,
      }
    }

    const listData = await listRes.json()
    const gauges: NwpsGauge[] = listData?.gauges ?? listData ?? []

    const features: GeoFeature[] = []

    for (const gauge of gauges) {
      const lat = gauge.latitude
      const lng = gauge.longitude
      if (lat === undefined || lng === undefined) continue

      const observedFloodCategory = gauge.status?.observed?.floodCategory ?? ""
      const forecastFloodCategory = gauge.status?.forecast?.floodCategory ?? ""

      // Skip gauges with no meaningful data
      const hasObserved = observedFloodCategory && observedFloodCategory !== "obs_not_current"
      const hasForecast = forecastFloodCategory && forecastFloodCategory !== "fcst_not_current"
      if (!hasObserved && !hasForecast) continue

      const observedStage = sanitizeValue(gauge.status?.observed?.primary)
      const forecastStage = sanitizeValue(gauge.status?.forecast?.primary)
      const observedTime = gauge.status?.observed?.validTime ?? ""
      const forecastTime = gauge.status?.forecast?.validTime ?? ""

      const severity = determineSeverity(observedFloodCategory, forecastFloodCategory)

      // Label from status readings
      let label: string
      if (observedStage !== null && forecastStage !== null) {
        label = `${observedStage.toFixed(1)} ft (fcst ${forecastStage.toFixed(1)} ft)`
      } else if (observedStage !== null) {
        label = `${observedStage.toFixed(1)} ft`
      } else if (forecastStage !== null) {
        label = `${forecastStage.toFixed(1)} ft (forecast)`
      } else {
        label = severity !== "low" ? forecastFloodCategory || observedFloodCategory : "Active"
      }

      const hydrographUrl = `https://water.noaa.gov/gauges/${gauge.lid}`

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: {
          id: `nwps-${gauge.lid}`,
          source: "nwps",
          name: gauge.name ?? gauge.lid,
          county: gauge.county,
          severity,
          value: forecastStage ?? observedStage ?? undefined,
          unit: "ft",
          label,
          description:
            observedStage !== null
              ? `${gauge.name}: observed ${observedStage.toFixed(1)} ft, forecast ${forecastStage !== null ? forecastStage.toFixed(1) : "N/A"} ft`
              : `${gauge.name}: forecast ${forecastStage !== null ? forecastStage.toFixed(1) : "N/A"} ft`,
          timestamp: observedTime || forecastTime || new Date().toISOString(),
          lid: gauge.lid,
          observedStage,
          observedTime,
          observedFloodCategory,
          forecastPeakStage: forecastStage,
          forecastPeakTime: forecastTime,
          forecastFloodCategory,
          trend: "unknown",
          hydrographUrl,
          floodCategory: forecastFloodCategory || observedFloodCategory,
          actionStage: sanitizeValue(gauge.flood?.categories?.action?.stage),
          minorStage: sanitizeValue(gauge.flood?.categories?.minor?.stage),
          moderateStage: sanitizeValue(gauge.flood?.categories?.moderate?.stage),
          majorStage: sanitizeValue(gauge.flood?.categories?.major?.stage),
        },
      })
    }

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "NWPS fetch failed",
    }
  }
}

export const nwpsAdapter = {
  source: "nwps" as const,
  displayName: "River Forecasts",
  fetch: fetchNwpsForecasts,
  refreshInterval: 300_000,
}
