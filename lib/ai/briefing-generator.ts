import type { CountyRiskScore } from "@/lib/scoring/risk"

export function generateCountyBriefing(score: CountyRiskScore): string {
  const lines: string[] = []

  lines.push(`${score.name} County situational briefing.`)

  // Gauges
  const gaugeComp = score.components.find((c) => c.source === "usgs")
  if (gaugeComp && gaugeComp.value > 0) {
    const urgency =
      gaugeComp.value > 0.75
        ? "critically elevated"
        : gaugeComp.value > 0.5
          ? "above flood stage"
          : "elevated"
    lines.push(`River gauges: ${gaugeComp.raw}, ${urgency}.`)
  } else {
    lines.push("River gauges: all below flood stage.")
  }

  // Alerts
  const alertComp = score.components.find((c) => c.source === "nws")
  if (alertComp && alertComp.value > 0) {
    lines.push(`Weather: ${alertComp.raw} active.`)
  } else {
    lines.push("Weather: no active alerts.")
  }

  // Shelters
  const shelterComp = score.components.find((c) => c.source === "fema")
  if (shelterComp) {
    if (score.shelterPressure > 0.8) {
      lines.push(`Shelters: ${shelterComp.raw}, near capacity.`)
    } else if (score.shelterPressure > 0) {
      lines.push(`Shelters: ${shelterComp.raw}.`)
    } else {
      lines.push("Shelters: no active shelters reported.")
    }
  }

  // Demographics
  const demoComp = score.components.find((c) => c.source === "census")
  if (demoComp && demoComp.value > 0) {
    lines.push(`Vulnerability: ${demoComp.raw}.`)
  }

  return lines.join(" ")
}

export function generateRankingBriefing(
  scores: CountyRiskScore[],
  metric: string,
  limit: number
): string {
  const top = scores.slice(0, limit)
  const lines = [`Top ${limit} counties by ${metric} risk:`]

  for (let i = 0; i < top.length; i++) {
    const s = top[i]
    const highlights = s.components
      .filter((c) => c.value > 0.25)
      .map((c) => c.raw)
      .join(", ")
    lines.push(`${i + 1}. ${s.name}: ${highlights || "low activity"}`)
  }

  return lines.join("\n")
}
