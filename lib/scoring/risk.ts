import type { GeoFeature, GeoFeatureCollection } from "@/lib/adapters/types"
import { COUNTY_FIPS } from "@/lib/arcgis/config"
import { COUNTY_POPULATIONS, MAX_COUNTY_POP } from "./thresholds"

export interface CountyRiskScore {
  fips: string
  name: string
  gaugeSeverity: number
  alertSeverity: number
  shelterPressure: number
  sviVulnerability: number
  populationWeight: number
  composite: number
  components: RiskComponent[]
}

export interface RiskComponent {
  source: string
  label: string
  value: number
  raw: string
}

interface DataSources {
  gauges?: GeoFeatureCollection
  alerts?: GeoFeatureCollection
  shelters?: GeoFeatureCollection
  demographics?: GeoFeatureCollection
}

const SEVERITY_SCORES: Record<string, number> = {
  critical: 1.0,
  high: 0.75,
  moderate: 0.5,
  low: 0.25,
}

export function computeCountyRisk(
  fips: string,
  data: DataSources
): CountyRiskScore {
  const name = COUNTY_FIPS[fips] ?? "Unknown"

  // Gauge severity: max severity of gauges in county
  const countyGauges = filterByCounty(data.gauges, fips, name)
  const gaugeSeverity =
    countyGauges.length > 0
      ? Math.max(...countyGauges.map((g) => SEVERITY_SCORES[g.properties.severity ?? "low"] ?? 0))
      : 0

  // Alert severity: max severity of alerts mentioning county
  const countyAlerts = filterAlertsByCounty(data.alerts, name)
  const alertSeverity =
    countyAlerts.length > 0
      ? Math.max(...countyAlerts.map((a) => SEVERITY_SCORES[a.properties.severity ?? "low"] ?? 0))
      : 0

  // Shelter pressure: total occupied / total capacity
  const countyShelters = filterByCounty(data.shelters, fips, name)
  const totalCap = countyShelters.reduce((s, f) => s + (Number(f.properties.capacity) || 0), 0)
  const totalOcc = countyShelters.reduce((s, f) => s + (Number(f.properties.occupancy) || 0), 0)
  const shelterPressure = totalCap > 0 ? Math.min(totalOcc / totalCap, 1) : 0

  // SVI vulnerability: from census demographics
  const demo = data.demographics?.features.find((f) => f.properties.countyFips === fips)
  const sviVulnerability = demo
    ? ((Number(demo.properties.pctElderly) || 0) +
       (Number(demo.properties.pctNoVehicle) || 0) +
       (Number(demo.properties.pctPoverty) || 0)) / 3
    : 0

  // Population weight
  const pop = COUNTY_POPULATIONS[fips] || 50000
  const populationWeight = Math.log10(pop) / Math.log10(MAX_COUNTY_POP)

  // Composite (experimental)
  const composite =
    (gaugeSeverity * 0.3 +
      alertSeverity * 0.25 +
      shelterPressure * 0.2 +
      sviVulnerability * 0.25) *
    populationWeight

  const components: RiskComponent[] = [
    {
      source: "usgs",
      label: "Gauge severity",
      value: gaugeSeverity,
      raw: `${countyGauges.length} gauge${countyGauges.length !== 1 ? "s" : ""}`,
    },
    {
      source: "nws",
      label: "Alert severity",
      value: alertSeverity,
      raw: `${countyAlerts.length} alert${countyAlerts.length !== 1 ? "s" : ""}`,
    },
    {
      source: "fema",
      label: "Shelter pressure",
      value: shelterPressure,
      raw: totalCap > 0 ? `${totalOcc}/${totalCap}` : "no shelters",
    },
    {
      source: "census",
      label: "Vulnerability",
      value: sviVulnerability,
      raw: demo
        ? `${((Number(demo.properties.pctElderly) || 0) * 100).toFixed(0)}% elderly`
        : "no data",
    },
  ]

  return {
    fips,
    name,
    gaugeSeverity,
    alertSeverity,
    shelterPressure,
    sviVulnerability,
    populationWeight,
    composite,
    components,
  }
}

export function computeAllCountyRisks(data: DataSources): CountyRiskScore[] {
  return Object.keys(COUNTY_FIPS)
    .map((fips) => computeCountyRisk(fips, data))
    .sort((a, b) => b.composite - a.composite)
}

function filterByCounty(
  collection: GeoFeatureCollection | undefined,
  fips: string,
  name: string
): GeoFeature[] {
  if (!collection) return []
  return collection.features.filter(
    (f) =>
      f.properties.countyFips === fips ||
      (f.properties.county ?? "").toLowerCase() === name.toLowerCase()
  )
}

function filterAlertsByCounty(
  collection: GeoFeatureCollection | undefined,
  name: string
): GeoFeature[] {
  if (!collection) return []
  return collection.features.filter((f) =>
    ((f.properties.areaDesc as string) ?? "").toLowerCase().includes(name.toLowerCase())
  )
}
