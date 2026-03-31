import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"
import { COUNTY_FIPS, COUNTY_FIPS_LIST } from "@/lib/arcgis/config"

// FEMA OpenFEMA API — Disaster Declarations Summaries
// CORS * — direct browser fetch, no proxy needed
const FEMA_DECLARATIONS_URL =
  "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"

// County centroid coordinates for rendering declarations on the map
const COUNTY_CENTROIDS: Record<string, [number, number]> = {
  "12071": [-81.86, 26.56],   // Lee
  "12015": [-82.08, 26.90],   // Charlotte
  "12021": [-81.35, 26.12],   // Collier
  "12115": [-82.36, 27.18],   // Sarasota
  "12027": [-81.81, 27.19],   // DeSoto
  "12049": [-81.81, 27.49],   // Hardee
  "12055": [-81.35, 27.34],   // Highlands
  "12043": [-81.19, 26.85],   // Glades
  "12051": [-81.14, 26.59],   // Hendry
  "12105": [-81.72, 27.95],   // Polk
  "12081": [-82.36, 27.47],   // Manatee
  "12057": [-82.36, 27.91],   // Hillsborough
  "12103": [-82.74, 27.90],   // Pinellas
  "12097": [-81.26, 28.06],   // Osceola
}

const FL_QUERY_PARAMS = new URLSearchParams({
  $filter: "state eq 'FL'",
  $orderby: "declarationDate desc",
  $top: "50",
})

interface FemaDeclaration {
  disasterNumber: number
  state: string
  declarationType: string
  declarationDate: string
  designatedArea: string
  declarationTitle: string
  incidentType: string
  fipsStateCode?: string
  fipsCountyCode?: string
  [key: string]: unknown
}

function declarationSeverity(
  declarationType: string
): GeoFeature["properties"]["severity"] {
  switch (declarationType) {
    case "DR":
      return "critical"
    case "EM":
      return "high"
    case "FM":
      return "moderate"
    default:
      return "low"
  }
}

function extractCountyFips(declaration: FemaDeclaration): string {
  if (declaration.fipsStateCode && declaration.fipsCountyCode) {
    return `${declaration.fipsStateCode}${declaration.fipsCountyCode}`
  }
  return ""
}

function mapDeclaration(d: FemaDeclaration): GeoFeature | null {
  const severity = declarationSeverity(d.declarationType)
  const countyFips = extractCountyFips(d)

  // Look up centroid for this county; skip if we don't have coordinates
  const centroid = COUNTY_CENTROIDS[countyFips]
  if (!centroid) return null

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: centroid,
    },
    properties: {
      id: `fema-decl-${d.disasterNumber}-${countyFips}`,
      source: "fema-declarations",
      name: d.declarationTitle ?? `Disaster #${d.disasterNumber}`,
      county: COUNTY_FIPS[countyFips],
      countyFips,
      severity,
      label: `${d.declarationType}-${d.disasterNumber}`,
      description: [
        `${d.declarationTitle} (${d.declarationType}-${d.disasterNumber})`,
        d.designatedArea ? `Area: ${d.designatedArea}` : null,
        d.incidentType ? `Type: ${d.incidentType}` : null,
        d.declarationDate
          ? `Declared: ${new Date(d.declarationDate).toLocaleDateString()}`
          : null,
      ]
        .filter(Boolean)
        .join(". "),
      timestamp: d.declarationDate
        ? new Date(d.declarationDate).toISOString()
        : new Date().toISOString(),
      disasterNumber: d.disasterNumber,
      declarationType: d.declarationType,
      incidentType: d.incidentType ?? "",
      designatedArea: d.designatedArea ?? "",
      state: d.state ?? "",
    },
  }
}

async function fetchFemaDeclarations(): Promise<
  AdapterResult<GeoFeatureCollection>
> {
  try {
    const url = `${FEMA_DECLARATIONS_URL}?${FL_QUERY_PARAMS}`
    const res = await fetch(url)

    if (!res.ok) {
      return {
        status: "error",
        error: `FEMA Declarations API returned ${res.status}`,
      }
    }

    const data = await res.json()
    const declarations: FemaDeclaration[] =
      data?.DisasterDeclarationsSummaries ?? []

    const features = declarations
      .map(mapDeclaration)
      .filter(Boolean) as GeoFeature[]

    return {
      status: "ok",
      data: { type: "FeatureCollection", features },
      fetchedAt: new Date(),
    }
  } catch (err) {
    return {
      status: "error",
      error:
        err instanceof Error ? err.message : "FEMA Declarations fetch failed",
    }
  }
}

export const femaDeclarationsAdapter = {
  source: "fema-declarations" as const,
  displayName: "Disaster Declarations",
  fetch: fetchFemaDeclarations,
  refreshInterval: 600_000, // 10 min
}
