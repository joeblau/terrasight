import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"

const NHC_CURRENT_STORMS_URL = "/api/proxy/nhc/CurrentStorms.json"

// NHC classification -> display label + severity
const CLASSIFICATIONS: Record<string, { label: string; severity: GeoFeature["properties"]["severity"] }> = {
  HU: { label: "Hurricane", severity: "critical" },
  TS: { label: "Tropical Storm", severity: "high" },
  TD: { label: "Tropical Depression", severity: "moderate" },
  STD: { label: "Subtropical Depression", severity: "moderate" },
  STS: { label: "Subtropical Storm", severity: "high" },
  PTC: { label: "Post-Tropical Cyclone", severity: "low" },
  TW: { label: "Tropical Wave", severity: "low" },
  DB: { label: "Disturbance", severity: "low" },
}

interface NHCStorm {
  id: string
  binNumber: string
  name: string
  classification: string
  intensity: string
  pressure: string
  latitude: string
  longitude: string
  latitudeNumeric: number
  longitudeNumeric: number
  movementDir: number
  movementSpeed: number
  lastUpdate: string
  publicAdvisory: { advNum: string; issuance: string; url: string } | null
  forecastTrack: { advNum: string; kmzFile: string } | null
  trackCone: { advNum: string; kmzFile: string } | null
}

export async function fetchNHCStorms(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const res = await fetch(NHC_CURRENT_STORMS_URL)
    if (!res.ok) {
      return {
        status: "ok",
        data: { type: "FeatureCollection", features: [] },
        fetchedAt: new Date(),
      }
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("json")) {
      return {
        status: "ok",
        data: { type: "FeatureCollection", features: [] },
        fetchedAt: new Date(),
      }
    }

    const data = await res.json()
    const storms: NHCStorm[] = data?.activeStorms ?? []

    if (storms.length === 0) {
      return {
        status: "ok",
        data: { type: "FeatureCollection", features: [] },
        fetchedAt: new Date(),
      }
    }

    const features: GeoFeature[] = storms
      .map((storm): GeoFeature | null => {
        const lat = storm.latitudeNumeric
        const lng = storm.longitudeNumeric

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

        const classification = CLASSIFICATIONS[storm.classification] ?? {
          label: storm.classification,
          severity: "low" as const,
        }
        const windSpeed = parseInt(storm.intensity) || 0
        const pressure = parseInt(storm.pressure) || 0

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {
            id: `nhc-${storm.id}`,
            source: "nhc",
            name: `${classification.label} ${storm.name}`,
            severity: classification.severity,
            value: windSpeed,
            unit: "kt",
            label: `${windSpeed} kt`,
            description: [
              `${classification.label} ${storm.name}: ${windSpeed} kt sustained winds`,
              pressure ? `Pressure: ${pressure} mb` : null,
              storm.movementSpeed
                ? `Moving ${storm.movementDir}° at ${storm.movementSpeed} mph`
                : null,
            ]
              .filter(Boolean)
              .join(". "),
            timestamp: storm.lastUpdate,
            classification: storm.classification,
            classificationLabel: classification.label,
            windSpeedKt: windSpeed,
            pressureMb: pressure,
            movementDir: storm.movementDir,
            movementSpeed: storm.movementSpeed,
            advisoryNumber: storm.publicAdvisory?.advNum ?? null,
            advisoryUrl: storm.publicAdvisory?.url ?? null,
            forecastTrackKmz: storm.forecastTrack?.kmzFile ?? null,
            trackConeKmz: storm.trackCone?.kmzFile ?? null,
            binNumber: storm.binNumber,
          },
        }
      })
      .filter(Boolean) as GeoFeature[]

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch {
    // No active storms is not an error condition
    return {
      status: "ok",
      data: { type: "FeatureCollection", features: [] },
      fetchedAt: new Date(),
    }
  }
}

export const nhcAdapter = {
  source: "nhc" as const,
  displayName: "Hurricane Track",
  fetch: fetchNHCStorms,
  refreshInterval: 180_000, // 3 min (NHC updates every 3h during active storms)
}
