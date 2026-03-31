const BASE_URL = "/api/proxy/nwps"

export interface StageflowProductEntry {
  validTime: string
  generatedTime: string
  primary: number | null
  secondary: number | null
}

export interface StageflowProduct {
  data: StageflowProductEntry[]
}

function sanitize(val: number | undefined | null): number | null {
  if (val === undefined || val === null) return null
  if (val === -9999 || val === -999) return null
  return val
}

/**
 * Fetch stageflow data for a specific product identified by PEDTS codes.
 * PEDTS = Physical Element Data Type Source (e.g., "HGIRG" for river stage).
 *
 * This is useful when you need data for a specific physical element type
 * rather than the generic observed/forecast split.
 */
export async function fetchStageflowProduct(
  identifier: string,
  pedts: string,
): Promise<StageflowProduct | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/products/stageflow/${encodeURIComponent(identifier)}/${encodeURIComponent(pedts)}`,
    )
    if (!res.ok) return null

    const raw = await res.json()
    const data: StageflowProductEntry[] = (raw.data ?? []).map(
      (entry: Record<string, unknown>) => ({
        validTime: (entry.validTime as string) ?? "",
        generatedTime: (entry.generatedTime as string) ?? "",
        primary: sanitize(entry.primary as number),
        secondary: sanitize(entry.secondary as number),
      }),
    )

    return { data }
  } catch {
    return null
  }
}
