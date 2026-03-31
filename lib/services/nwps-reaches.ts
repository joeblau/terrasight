const BASE_URL = "/api/proxy/nwps"

type NwmSeries =
  | "analysis_assimilation"
  | "short_range"
  | "medium_range"
  | "long_range"
  | "medium_range_blend"

interface ReachDetail {
  reachId: string
  name: string
  latitude: number
  longitude: number
  route: Array<{ reachId: string; streamOrder: number }>
  upstreamGauges: string[]
  downstreamGauges: string[]
}

interface StreamflowEntry {
  validTime: string
  value: number | null
}

interface ReachStreamflow {
  reachId: string
  series: string
  data: StreamflowEntry[]
}

function sanitize(val: number | undefined | null): number | null {
  if (val === undefined || val === null) return null
  if (val === -9999 || val === -999) return null
  return val
}

export async function fetchReachDetail(
  reachId: string,
): Promise<ReachDetail | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/reaches/${encodeURIComponent(reachId)}`,
    )
    if (!res.ok) return null
    const raw = await res.json()
    return {
      reachId: raw.reachId ?? reachId,
      name: raw.name ?? "",
      latitude: raw.latitude ?? 0,
      longitude: raw.longitude ?? 0,
      route: (raw.route ?? []).map((r: Record<string, unknown>) => ({
        reachId: (r.reachId as string) ?? "",
        streamOrder: Number(r.streamOrder) || 0,
      })),
      upstreamGauges: raw.upstreamGauges ?? [],
      downstreamGauges: raw.downstreamGauges ?? [],
    }
  } catch {
    return null
  }
}

export async function fetchReachStreamflow(
  reachId: string,
  series: NwmSeries = "short_range",
): Promise<ReachStreamflow | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/reaches/${encodeURIComponent(reachId)}/streamflow?series=${series}`,
    )
    if (!res.ok) return null
    const raw = await res.json()

    return {
      reachId: raw.reachId ?? reachId,
      series: raw.series ?? series,
      data: (raw.data ?? []).map((d: Record<string, unknown>) => ({
        validTime: (d.validTime as string) ?? "",
        value: sanitize(d.value as number),
      })),
    }
  } catch {
    return null
  }
}

export async function fetchReachesForGauges(
  gauges: Array<{ lid: string; reachId?: string }>,
): Promise<Map<string, ReachStreamflow>> {
  const result = new Map<string, ReachStreamflow>()
  const withReach = gauges.filter((g) => g.reachId)

  // Batch in groups of 10 to avoid overwhelming the API
  const batchSize = 10
  for (let i = 0; i < withReach.length; i += batchSize) {
    const batch = withReach.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map((g) => fetchReachStreamflow(g.reachId!)),
    )

    for (let j = 0; j < results.length; j++) {
      const r = results[j]
      if (r.status === "fulfilled" && r.value) {
        result.set(batch[j].reachId!, r.value)
      }
    }
  }

  return result
}

export type { NwmSeries, ReachDetail, StreamflowEntry, ReachStreamflow }
