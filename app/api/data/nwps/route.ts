import { NextResponse } from "next/server"

const NWPS_BASE = "https://api.water.noaa.gov/nwps/v1"

// 14-county FL bounding box
const BBOX = {
  xmin: -84,
  ymin: 25,
  xmax: -80,
  ymax: 29,
}

const GAUGE_LIST_URL = `${NWPS_BASE}/gauges?bbox.xmin=${BBOX.xmin}&bbox.ymin=${BBOX.ymin}&bbox.xmax=${BBOX.xmax}&bbox.ymax=${BBOX.ymax}&srid=EPSG_4326`

// In-memory cache: NOAA rate limits at 10 req/5min
// Cache for 5 minutes so the server makes at most 1 upstream call per interval
let cache: { data: unknown; fetchedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET() {
  const now = Date.now()

  // Return cached data if fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(now - cache.fetchedAt) },
    })
  }

  try {
    const res = await fetch(GAUGE_LIST_URL)

    if (!res.ok) {
      // If rate limited and we have stale cache, serve stale
      if (res.status === 429 && cache) {
        return NextResponse.json(cache.data, {
          headers: { "X-Cache": "STALE", "X-Cache-Age": String(now - cache.fetchedAt) },
        })
      }
      return NextResponse.json(
        { error: `NWPS API returned ${res.status}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    cache = { data, fetchedAt: now }

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    })
  } catch (err) {
    // On network error, serve stale cache if available
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { "X-Cache": "STALE", "X-Cache-Age": String(now - cache.fetchedAt) },
      })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "NWPS fetch failed" },
      { status: 502 },
    )
  }
}
