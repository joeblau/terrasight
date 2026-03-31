import type {
  NwpsGaugeDetail,
  NwpsStageflowAll,
  NwpsStageflowData,
  NwpsStageflowEntry,
  NwpsRatingEntry,
} from "./nwps-types"

const BASE_URL = "/api/proxy/nwps"

function sanitize(val: number | undefined | null): number | null {
  if (val === undefined || val === null) return null
  if (val === -9999 || val === -999) return null
  return val
}

function sanitizeEntry(entry: Record<string, unknown>): NwpsStageflowEntry {
  return {
    validTime: (entry.validTime as string) ?? "",
    generatedTime: (entry.generatedTime as string) ?? "",
    primary: sanitize(entry.primary as number),
    secondary: sanitize(entry.secondary as number),
  }
}

export async function fetchGaugeDetail(
  lid: string,
): Promise<NwpsGaugeDetail | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/gauges/${encodeURIComponent(lid)}`,
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchGaugeStageflow(
  lid: string,
): Promise<NwpsStageflowAll | null>
export async function fetchGaugeStageflow(
  lid: string,
  product: "observed" | "forecast",
): Promise<NwpsStageflowData | null>
export async function fetchGaugeStageflow(
  lid: string,
  product?: "observed" | "forecast",
): Promise<NwpsStageflowAll | NwpsStageflowData | null> {
  try {
    const path = product
      ? `${BASE_URL}/gauges/${encodeURIComponent(lid)}/stageflow/${product}`
      : `${BASE_URL}/gauges/${encodeURIComponent(lid)}/stageflow`

    const res = await fetch(path)
    if (!res.ok) return null
    const raw = await res.json()

    if (product) {
      // Single product response
      const data = (raw.data ?? []).map(sanitizeEntry)
      return { data }
    }

    // Combined response
    return {
      observed: { data: (raw.observed?.data ?? []).map(sanitizeEntry) },
      forecast: { data: (raw.forecast?.data ?? []).map(sanitizeEntry) },
    }
  } catch {
    return null
  }
}

export async function fetchGaugeRatings(
  lid: string,
  opts?: { limit?: number; sort?: "ASC" | "DESC"; onlyTenths?: boolean },
): Promise<NwpsRatingEntry[] | null> {
  try {
    const params = new URLSearchParams()
    if (opts?.limit) params.set("limit", String(opts.limit))
    if (opts?.sort) params.set("sort", opts.sort)
    if (opts?.onlyTenths) params.set("onlyTenths", "true")

    const qs = params.toString()
    const url = `${BASE_URL}/gauges/${encodeURIComponent(lid)}/ratings${qs ? `?${qs}` : ""}`
    const res = await fetch(url)
    if (!res.ok) return null

    const raw = await res.json()
    const ratings = (raw.ratings ?? []).map(
      (r: Record<string, unknown>) => ({
        stage: sanitize(r.stage as number) ?? 0,
        flow: sanitize(r.flow as number) ?? 0,
      }),
    )
    return ratings
  } catch {
    return null
  }
}
