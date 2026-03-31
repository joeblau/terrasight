"use client"

import { useEffect, useRef, useState } from "react"
import { useMapStore } from "@/store/map-store"
import type { GeoFeature, DataSource } from "@/lib/adapters/types"

interface FeedEvent {
  id: string
  source: DataSource
  message: string
  severity: string
  timestamp: Date
}

const SOURCE_LABELS: Record<DataSource, string> = {
  usgs: "GAUGE",
  nws: "ALERT",
  fema: "SHELTER",
  census: "DEMO",
  nhc: "STORM",
  radar: "RADAR",
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-[#FF453A]",
  high: "text-[#FF6B35]",
  moderate: "text-[#FFD60A]",
  low: "text-[#30D158]",
}

export default function ChangeFeed() {
  const { dataCache } = useMapStore()
  const [events, setEvents] = useState<FeedEvent[]>([])
  const prevDataRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const newEvents: FeedEvent[] = []

    for (const [source, entry] of dataCache) {
      if (entry.result.status !== "ok") continue

      for (const feature of entry.result.data.features) {
        const key = feature.properties.id
        const severity = feature.properties.severity ?? "low"
        const prevSeverity = prevDataRef.current.get(key)
        const currentScore = severityToNumber(severity)

        if (prevSeverity !== undefined && currentScore > prevSeverity) {
          newEvents.push({
            id: `${key}-${Date.now()}`,
            source: source as DataSource,
            message: `${feature.properties.name} escalated to ${severity}`,
            severity,
            timestamp: new Date(),
          })
        }

        prevDataRef.current.set(key, currentScore)
      }
    }

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 20))
    }
  }, [dataCache])

  // Seed initial events from current high-severity features
  useEffect(() => {
    const initial: FeedEvent[] = []
    for (const [source, entry] of dataCache) {
      if (entry.result.status !== "ok") continue
      for (const feature of entry.result.data.features) {
        if (
          feature.properties.severity === "critical" ||
          feature.properties.severity === "high"
        ) {
          initial.push({
            id: `init-${feature.properties.id}`,
            source: source as DataSource,
            message: feature.properties.description ?? feature.properties.name,
            severity: feature.properties.severity,
            timestamp: new Date(feature.properties.timestamp ?? Date.now()),
          })
        }
      }
    }
    if (initial.length > 0 && events.length === 0) {
      setEvents(initial.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataCache.size])

  if (events.length === 0) return null

  return (
    <div className="p-3">
      <h3 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Activity Feed
      </h3>
      <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
        {events.map((event) => (
          <div key={event.id} className="text-xs leading-relaxed">
            <span
              className={`font-mono font-semibold ${SEVERITY_COLORS[event.severity] ?? "text-muted-foreground"}`}
            >
              {SOURCE_LABELS[event.source]}
            </span>{" "}
            <span className="text-foreground">{event.message}</span>
            <span className="ml-1 text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function severityToNumber(severity: string): number {
  switch (severity) {
    case "critical": return 4
    case "high": return 3
    case "moderate": return 2
    case "low": return 1
    default: return 0
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
