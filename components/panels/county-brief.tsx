"use client"

import { useMemo } from "react"
import { useMapStore } from "@/store/map-store"
import { COUNTY_FIPS } from "@/lib/arcgis/config"
import { computeAllCountyRisks } from "@/lib/scoring/risk"
import type { GeoFeature, DataSource } from "@/lib/adapters/types"

export default function CountyBrief() {
  const { selectedCounty, dataCache } = useMapStore()

  if (!selectedCounty) {
    return <RegionalOverview />
  }

  const countyName = COUNTY_FIPS[selectedCounty] ?? "Unknown"

  // Gather ALL features from each source (not filtered by county yet)
  const allGauges = getAllFeatures(dataCache, "usgs")
  const allShelters = getAllFeatures(dataCache, "fema")
  const allAlerts = getAllFeatures(dataCache, "nws")
  const allDemographics = getAllFeatures(dataCache, "census")

  // Filter by county name (check description, name, areaDesc, county, countyFips)
  const gauges = filterByCountyName(allGauges, countyName, selectedCounty)
  const shelters = filterByCountyName(allShelters, countyName, selectedCounty)
  const alerts = allAlerts.filter(
    (f) => ((f.properties.areaDesc as string) ?? "").toLowerCase().includes(countyName.toLowerCase())
  )
  const demographics = allDemographics.filter(
    (f) => f.properties.countyFips === selectedCounty
  )

  const aboveFlood = gauges.filter(
    (g) => g.properties.severity === "high" || g.properties.severity === "critical"
  )
  const totalShelterCap = shelters.reduce(
    (sum, s) => sum + (Number(s.properties.capacity) || 0),
    0
  )
  const totalShelterOcc = shelters.reduce(
    (sum, s) => sum + (Number(s.properties.occupancy) || 0),
    0
  )

  const demo = demographics[0]?.properties
  const pctElderly = demo ? ((demo.pctElderly as number) * 100).toFixed(1) : "?"
  const pctNoVehicle = demo ? ((demo.pctNoVehicle as number) * 100).toFixed(1) : "?"

  // Compute overall status
  const hasIssues = aboveFlood.length > 0 || alerts.length > 0 || (totalShelterCap > 0 && totalShelterOcc / totalShelterCap > 0.8)
  const statusLabel = hasIssues ? "Active Incidents" : "Normal"
  const statusDotColor = hasIssues ? "#FF6B35" : "#30D158"

  return (
    <div className="absolute right-4 top-4 z-10 w-[280px] space-y-2">
      {/* Header */}
      <div className="rounded-lg border border-white/10 bg-[#0B1426]/90 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasIssues && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statusDotColor }}
              />
            )}
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wide">
              {countyName}
            </h2>
          </div>
          <button
            onClick={() => useMapStore.getState().selectCounty(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Regional Overview
          </button>
        </div>
        <p className="mt-1 text-xs font-medium" style={{ color: statusDotColor }}>{statusLabel}</p>
      </div>

      {/* Gauge Brief */}
      <BriefCard
        title="River Gauges"
        severity={aboveFlood.length > 0 ? "high" : "low"}
      >
        {gauges.length === 0 ? (
          <p className="text-muted-foreground">No gauge data in this county.</p>
        ) : (
          <p>
            {aboveFlood.length} of {gauges.length} gauges above flood stage.
            {aboveFlood.length > 0 &&
              ` ${aboveFlood[0].properties.name} at ${aboveFlood[0].properties.value?.toFixed(1)} ft.`}
          </p>
        )}
      </BriefCard>

      {/* Shelter Brief */}
      <BriefCard
        title="Shelters"
        severity={
          totalShelterCap > 0 && totalShelterOcc / totalShelterCap > 0.8
            ? "high"
            : "low"
        }
      >
        {shelters.length === 0 ? (
          <p className="text-muted-foreground">No active shelters.</p>
        ) : (
          <p>
            {shelters.length} shelter{shelters.length !== 1 ? "s" : ""} active.{" "}
            {totalShelterOcc}/{totalShelterCap} total capacity.
          </p>
        )}
      </BriefCard>

      {/* Alert Brief */}
      <BriefCard
        title="Weather Alerts"
        severity={alerts.length > 0 ? (alerts[0].properties.severity ?? "moderate") : "low"}
      >
        {alerts.length === 0 ? (
          <p className="text-muted-foreground">No active alerts.</p>
        ) : (
          <p>
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}.{" "}
            {alerts[0].properties.name}.
          </p>
        )}
      </BriefCard>

      {/* Demographics Brief */}
      <BriefCard title="Vulnerability" severity={demo?.severity ?? "low"}>
        {!demo ? (
          <p className="text-muted-foreground">No demographic data.</p>
        ) : (
          <p>
            {pctElderly}% elderly, {pctNoVehicle}% no vehicle access.{" "}
            {Number(demo.totalPopulation).toLocaleString()} total population.
          </p>
        )}
      </BriefCard>

      {/* Experimental Score */}
      <div className="rounded-lg border border-white/5 bg-[#2A3441]/60 px-3 py-2 text-xs text-muted-foreground">
        Composite risk indicators shown above are experimental and uncalibrated.
        Use source data for operational decisions.
      </div>
    </div>
  )
}

interface CountyStatus {
  fips: string
  name: string
  hasIssues: boolean
  gaugeCount: number
  aboveFloodCount: number
  alertCount: number
  shelterPressure: number
}

function useCountyStatuses(dataCache: ReturnType<typeof useMapStore.getState>["dataCache"]): CountyStatus[] {
  return useMemo(() => {
    const allGauges = getAllFeatures(dataCache, "usgs")
    const allAlerts = getAllFeatures(dataCache, "nws")
    const allShelters = getAllFeatures(dataCache, "fema")

    return Object.entries(COUNTY_FIPS).map(([fips, name]) => {
      const gauges = filterByCountyName(allGauges, name, fips)
      const aboveFlood = gauges.filter(
        (g) => g.properties.severity === "high" || g.properties.severity === "critical"
      )
      const alerts = allAlerts.filter(
        (f) => ((f.properties.areaDesc as string) ?? "").toLowerCase().includes(name.toLowerCase())
      )
      const shelters = filterByCountyName(allShelters, name, fips)
      const totalCap = shelters.reduce((s, f) => s + (Number(f.properties.capacity) || 0), 0)
      const totalOcc = shelters.reduce((s, f) => s + (Number(f.properties.occupancy) || 0), 0)
      const shelterPressure = totalCap > 0 ? totalOcc / totalCap : 0

      const hasIssues = aboveFlood.length > 0 || alerts.length > 0 || shelterPressure > 0.8

      return {
        fips,
        name,
        hasIssues,
        gaugeCount: gauges.length,
        aboveFloodCount: aboveFlood.length,
        alertCount: alerts.length,
        shelterPressure,
      }
    }).sort((a, b) => {
      // Sort: issues first, then by activity count
      if (a.hasIssues !== b.hasIssues) return a.hasIssues ? -1 : 1
      return (b.aboveFloodCount + b.alertCount) - (a.aboveFloodCount + a.alertCount)
    })
  }, [dataCache])
}

function RegionalOverview() {
  const { dataCache, selectCounty } = useMapStore()
  const counties = useCountyStatuses(dataCache)

  return (
    <div className="absolute right-4 top-4 z-10 w-[280px] space-y-2">
      <div className="rounded-lg border border-white/10 bg-[#0B1426]/90 p-3 backdrop-blur-sm">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">
          Regional Overview
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          14 counties ranked by activity
        </p>
      </div>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {counties.map((county) => (
          <button
            key={county.fips}
            onClick={() => selectCounty(county.fips)}
            className="w-full rounded-lg border border-white/5 bg-[#2A3441]/60 px-3 py-2 text-left backdrop-blur-sm transition-colors hover:border-[#00D9FF]/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {county.hasIssues && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: "#FF6B35" }}
                  />
                )}
                <span className="text-sm font-medium">{county.name}</span>
              </div>
              <div className="flex gap-2 text-xs">
                {county.aboveFloodCount > 0 && (
                  <span className="font-mono text-[#FF6B35]">
                    {county.aboveFloodCount} gauge{county.aboveFloodCount !== 1 ? "s" : ""}
                  </span>
                )}
                {county.alertCount > 0 && (
                  <span className="font-mono text-[#FFD60A]">
                    {county.alertCount} alert{county.alertCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function BriefCard({
  title,
  severity,
  children,
}: {
  title: string
  severity: string
  children: React.ReactNode
}) {
  const borderColor =
    severity === "critical"
      ? "border-[#FF453A]/40"
      : severity === "high"
        ? "border-[#FF6B35]/40"
        : "border-white/5"

  return (
    <div
      className={`rounded-lg border bg-[#2A3441]/60 p-3 backdrop-blur-sm ${borderColor}`}
    >
      <h3 className="mb-1 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

// Get all features from a data source
function getAllFeatures(
  dataCache: ReturnType<typeof useMapStore.getState>["dataCache"],
  source: DataSource
): GeoFeature[] {
  const entry = dataCache.get(source)
  if (!entry || entry.result.status !== "ok") return []
  return entry.result.data.features
}

// Filter features by county name — checks multiple fields since different APIs
// store county info differently (or not at all for coordinate-only sources)
function filterByCountyName(
  features: GeoFeature[],
  countyName: string,
  countyFips: string
): GeoFeature[] {
  const nameLower = countyName.toLowerCase()
  return features.filter((f) => {
    const props = f.properties
    // Direct FIPS match
    if (props.countyFips === countyFips) return true
    // County name match
    if ((props.county as string)?.toLowerCase() === nameLower) return true
    // City/state match for shelters
    if ((props.city as string)?.toLowerCase().includes(nameLower)) return true
    // Check if feature name contains county name (common for USGS gauge names)
    if (props.name?.toLowerCase().includes(nameLower)) return true
    // Check description
    if (props.description?.toLowerCase().includes(nameLower)) return true
    return false
  })
}
