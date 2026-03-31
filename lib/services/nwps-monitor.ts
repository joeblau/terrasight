const BASE_URL = "/api/proxy/nwps"

export interface NwpsMonitorStatus {
  /** Raw status fields from the API - structure may vary */
  [key: string]: unknown
}

export async function fetchNwpsMonitorStatus(): Promise<NwpsMonitorStatus | null> {
  try {
    const res = await fetch(`${BASE_URL}/monitor`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Check if the NWPS API is responding and healthy.
 * Returns true if the monitor endpoint returns a 200.
 */
export async function checkNwpsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/monitor`)
    return res.ok
  } catch {
    return false
  }
}
