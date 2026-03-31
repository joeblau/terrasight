"use client"

import { useState } from "react"
import { useMapStore } from "@/store/map-store"
import { parseDeterministic } from "@/lib/ai/query-parser"
import { generateCountyBriefing, generateRankingBriefing } from "@/lib/ai/briefing-generator"
import { computeCountyRisk, computeAllCountyRisks } from "@/lib/scoring/risk"

export default function QueryBar() {
  const [input, setInput] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { queryLoading, setQueryLoading, selectCounty, dataCache } =
    useMapStore()

  const getDataSources = () => {
    const get = (key: "usgs" | "nws" | "fema" | "census") => {
      const entry = dataCache.get(key)
      if (!entry) return undefined
      return entry.result.status === "ok" ? entry.result.data : undefined
    }
    return {
      gauges: get("usgs"),
      alerts: get("nws"),
      shelters: get("fema"),
      demographics: get("census"),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || queryLoading) return

    setQueryLoading(true)
    setError(null)
    setAnswer(null)

    try {
      // Try deterministic parse first
      const parsed = parseDeterministic(input)

      if (parsed) {
        const data = getDataSources()

        switch (parsed.type) {
          case "county-summary": {
            selectCounty(parsed.countyFips)
            const score = computeCountyRisk(parsed.countyFips, data)
            setAnswer(generateCountyBriefing(score))
            break
          }
          case "risk-ranking": {
            const scores = computeAllCountyRisks(data)
            setAnswer(generateRankingBriefing(scores, parsed.metric, parsed.limit))
            break
          }
          case "threshold-check": {
            const scores = computeAllCountyRisks(data)
            const matching = scores.filter((s) => {
              const comp = s.components.find((c) => c.source === "usgs")
              return comp && comp.value > parsed.value
            })
            if (matching.length > 0) {
              setAnswer(
                `${matching.length} counties with elevated gauges: ${matching.map((s) => s.name).join(", ")}`
              )
            } else {
              setAnswer("No counties currently exceed that threshold.")
            }
            break
          }
          default:
            break
        }
      } else {
        // Freeform: send to Claude API
        const data = getDataSources()
        const context = buildContext(data)

        const res = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: input, context }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? "Query failed")
        }

        const result = await res.json()
        setAnswer(result.answer)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed. Try again.")
    } finally {
      setQueryLoading(false)
    }
  }

  return (
    <>
      {/* Answer/error card */}
      {(answer || error) && (
        <div className="absolute bottom-20 left-1/2 z-10 w-full max-w-lg -translate-x-1/2">
          <div
            className={`rounded-lg border p-3 backdrop-blur-sm ${
              error
                ? "border-[#FF453A]/30 bg-[#0B1426]/90"
                : "border-[#00D9FF]/20 bg-[#0B1426]/90"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {error ? (
                  <span className="text-[#FF453A]">{error}</span>
                ) : (
                  answer
                )}
              </p>
              <button
                onClick={() => {
                  setAnswer(null)
                  setError(null)
                }}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Query input */}
      <form
        onSubmit={handleSubmit}
        className="absolute bottom-6 left-1/2 z-10 flex w-full max-w-lg -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#0B1426]/80 px-4 py-2.5 backdrop-blur-md"
      >
        <svg
          className="h-4 w-4 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about any county..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={queryLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || queryLoading}
          className="rounded-full bg-[#FF6B35] px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wider text-[#0B1426] transition-colors hover:brightness-110 disabled:opacity-40"
        >
          {queryLoading ? "..." : "Ask"}
        </button>
      </form>
    </>
  )
}

function buildContext(data: Record<string, unknown>): string {
  const lines: string[] = []

  for (const [source, collection] of Object.entries(data)) {
    if (!collection) continue
    const features = (collection as { features: Array<{ properties: Record<string, unknown> }> }).features
    if (features.length === 0) continue
    lines.push(
      `${source}: ${features.length} features. Sample: ${features
        .slice(0, 3)
        .map((f) => f.properties.description ?? f.properties.name)
        .join("; ")}`
    )
  }

  return lines.join("\n")
}
