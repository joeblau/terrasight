import type { AdapterResult, GeoFeatureCollection, GeoFeature } from "./types"

// FEMA OpenFEMA API — Disaster Declarations Summaries
// CORS * — direct browser fetch, no proxy needed
const FEMA_DECLARATIONS_URL =
  "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"

const FL_QUERY_PARAMS = new URLSearchParams({
  $filter: "state eq 'FL'",
  $orderby: "declarationDate desc",
  $top: "20",
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

function mapDeclaration(d: FemaDeclaration): GeoFeature {
  const severity = declarationSeverity(d.declarationType)
  const countyFips = extractCountyFips(d)

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
    properties: {
      id: `fema-decl-${d.disasterNumber}-${d.designatedArea ?? "unknown"}`,
      source: "fema-declarations",
      name: d.declarationTitle ?? `Disaster #${d.disasterNumber}`,
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
      countyFips,
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

    const features = declarations.map(mapDeclaration)

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
