"use client"

import { useState } from "react"
import { ArrowUp, Square } from "lucide-react"
import { useMapStore } from "@/store/map-store"
import { parseDeterministic } from "@/lib/ai/query-parser"
import { generateCountyBriefing, generateRankingBriefing } from "@/lib/ai/briefing-generator"
import { computeCountyRisk, computeAllCountyRisks } from "@/lib/scoring/risk"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"

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

  const handleSubmit = async () => {
    if (!input.trim() || queryLoading) return

    setQueryLoading(true)
    setError(null)
    setAnswer(null)

    try {
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
      setInput("")
    }
  }

  return (
    <>
      {/* Answer/error card */}
      {(answer || error) && (
        <div className="absolute bottom-24 left-1/2 z-10 w-full max-w-xl -translate-x-1/2 px-4">
          <div
            className={`rounded-2xl border p-3 backdrop-blur-sm ${
              error
                ? "border-ops-danger/30 bg-ops-surface"
                : "border-ops-data/20 bg-ops-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {error ? (
                  <span className="text-ops-danger">{error}</span>
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

      {/* Prompt-kit input */}
      <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-lg -translate-x-1/2 px-4">
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={queryLoading}
          onSubmit={handleSubmit}
          maxHeight={120}
          className="!border-ops-border !bg-ops-surface !shadow-lg backdrop-blur-md"
        >
          <PromptInputTextarea
            placeholder="Ask about any county..."
            className="!bg-transparent text-sm text-white placeholder:text-white/40"
          />
          <PromptInputActions className="justify-end px-2 pb-1">
            <PromptInputAction tooltip={queryLoading ? "Stop" : "Send"}>
              <Button
                size="sm"
                className={`h-8 w-8 rounded-full p-0 ${
                  queryLoading
                    ? "bg-ops-danger hover:bg-ops-danger/80"
                    : "bg-ops-alert text-background hover:bg-ops-alert/80"
                }`}
                onClick={queryLoading ? () => setQueryLoading(false) : handleSubmit}
                disabled={!input.trim() && !queryLoading}
              >
                {queryLoading ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
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
