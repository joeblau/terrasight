"use client"

import { useEffect, useRef } from "react"
import { useMapStore } from "@/store/map-store"
import type { DataAdapter } from "@/lib/adapters/types"

export function useDataSource(adapter: DataAdapter) {
  const { updateDataCache, activeLayers } = useMapStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isActive = activeLayers.has(adapter.source)

  useEffect(() => {
    if (!isActive) return

    const fetchData = async () => {
      const result = await adapter.fetch()
      updateDataCache(adapter.source, result)
    }

    fetchData()

    if (adapter.refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, adapter.refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [adapter, isActive, updateDataCache])
}
