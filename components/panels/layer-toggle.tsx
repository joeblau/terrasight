"use client"

import { useMapStore } from "@/store/map-store"
import type { DataSource } from "@/lib/adapters/types"

const LAYERS: { source: DataSource; name: string; icon: string }[] = [
  { source: "radar", name: "Radar", icon: "radar" },
  { source: "usgs", name: "River Gauges", icon: "droplet" },
  { source: "nws", name: "Alerts", icon: "alert-triangle" },
  { source: "fema", name: "Shelters", icon: "home" },
  { source: "census", name: "Demographics", icon: "users" },
  { source: "nhc", name: "Hurricane", icon: "cloud-lightning" },
]

export default function LayerToggle() {
  const { activeLayers, toggleLayer, dataCache } = useMapStore()

  return (
    <div className="p-3">
      <h3 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Layers
      </h3>
      <div className="space-y-1">
        {LAYERS.map(({ source, name }) => {
          const isActive = activeLayers.has(source)
          const isRadar = source === "radar"
          const entry = isRadar ? null : dataCache.get(source)
          const hasData = isRadar || entry?.result.status === "ok"
          const isStale =
            !isRadar && entry && Date.now() - entry.timestamp > 120_000
          const featureCount =
            isRadar
              ? 0
              : entry?.result.status === "ok"
                ? entry.result.data.features.length
                : 0

          return (
            <button
              key={source}
              onClick={() => toggleLayer(source)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/5"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  !isActive
                    ? "bg-muted-foreground/50"
                    : isStale
                      ? "bg-ops-warning"
                      : hasData
                        ? "bg-ops-success"
                        : "bg-ops-danger"
                }`}
              />
              <span
                className={
                  isActive ? "text-foreground" : "text-muted-foreground"
                }
              >
                {name}
              </span>
              {isActive && featureCount > 0 && (
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {featureCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
