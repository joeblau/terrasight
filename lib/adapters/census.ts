import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"
import { COUNTY_FIPS, COUNTY_FIPS_LIST } from "@/lib/arcgis/config"

const ACS_BASE = "https://api.census.gov/data/2022/acs/acs5"

const VARIABLES = [
  "B01003_001E", // total population
  "B08201_001E", // total households
  "B08201_002E", // households with 0 vehicles
  "B01001_020E", // male 65-66
  "B01001_021E", // male 67-69
  "B01001_022E", // male 70-74
  "B01001_023E", // male 75-79
  "B01001_024E", // male 80-84
  "B01001_025E", // male 85+
  "B01001_044E", // female 65-66
  "B01001_045E", // female 67-69
  "B01001_046E", // female 70-74
  "B01001_047E", // female 75-79
  "B01001_048E", // female 80-84
  "B01001_049E", // female 85+
  "B17001_001E", // poverty universe
  "B17001_002E", // below poverty
].join(",")

export async function fetchCensusDemographics(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const features: GeoFeature[] = []

    for (const fips of COUNTY_FIPS_LIST) {
      const stateCode = fips.slice(0, 2)
      const countyCode = fips.slice(2)
      const url = `${ACS_BASE}?get=${VARIABLES}&for=county:${countyCode}&in=state:${stateCode}`

      const res = await fetch(url)
      if (!res.ok) continue

      const data = await res.json()
      if (!data || data.length < 2) continue

      const headers = data[0] as string[]
      const values = data[1] as string[]
      const row: Record<string, number> = {}
      headers.forEach((h: string, i: number) => {
        row[h] = parseInt(values[i]) || 0
      })

      const totalPop = row["B01003_001E"] || 1
      const totalHH = row["B08201_001E"] || 1
      const noVehicleHH = row["B08201_002E"] || 0
      const elderly =
        (row["B01001_020E"] || 0) +
        (row["B01001_021E"] || 0) +
        (row["B01001_022E"] || 0) +
        (row["B01001_023E"] || 0) +
        (row["B01001_024E"] || 0) +
        (row["B01001_025E"] || 0) +
        (row["B01001_044E"] || 0) +
        (row["B01001_045E"] || 0) +
        (row["B01001_046E"] || 0) +
        (row["B01001_047E"] || 0) +
        (row["B01001_048E"] || 0) +
        (row["B01001_049E"] || 0)
      const belowPoverty = row["B17001_002E"] || 0

      const pctNoVehicle = noVehicleHH / totalHH
      const pctElderly = elderly / totalPop
      const pctPoverty = belowPoverty / totalPop

      const severity: GeoFeature["properties"]["severity"] =
        pctNoVehicle > 0.1 || pctElderly > 0.25
          ? "critical"
          : pctNoVehicle > 0.07 || pctElderly > 0.2
            ? "high"
            : pctNoVehicle > 0.04 || pctElderly > 0.15
              ? "moderate"
              : "low"

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {
          id: `census-${fips}`,
          source: "census",
          name: COUNTY_FIPS[fips] + " County",
          countyFips: fips,
          severity,
          value: totalPop,
          unit: "pop",
          label: `Pop: ${totalPop.toLocaleString()}`,
          description: `${COUNTY_FIPS[fips]}: ${(pctElderly * 100).toFixed(1)}% elderly, ${(pctNoVehicle * 100).toFixed(1)}% no vehicle`,
          timestamp: new Date().toISOString(),
          totalPopulation: totalPop,
          pctNoVehicle,
          pctElderly,
          pctPoverty,
          noVehicleHouseholds: noVehicleHH,
          elderlyPopulation: elderly,
          belowPovertyPopulation: belowPoverty,
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
      error: err instanceof Error ? err.message : "Census fetch failed",
    }
  }
}

export const censusAdapter = {
  source: "census" as const,
  displayName: "Demographics",
  fetch: fetchCensusDemographics,
  refreshInterval: 0, // static data, fetch once
}
