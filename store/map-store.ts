import { create } from "zustand"
import type { DataSource, GeoFeatureCollection, AdapterResult } from "@/lib/adapters/types"

interface DataCacheEntry {
  result: AdapterResult<GeoFeatureCollection>
  timestamp: number
}

interface MapState {
  selectedCounty: string | null
  activeLayers: Set<DataSource>
  dataCache: Map<DataSource, DataCacheEntry>
  queryText: string
  queryLoading: boolean

  selectCounty: (fips: string | null) => void
  toggleLayer: (source: DataSource) => void
  setLayerActive: (source: DataSource, active: boolean) => void
  updateDataCache: (source: DataSource, result: AdapterResult<GeoFeatureCollection>) => void
  setQueryText: (text: string) => void
  setQueryLoading: (loading: boolean) => void
}

const DEFAULT_LAYERS: DataSource[] = ["usgs", "fema", "nws", "census", "nhc", "radar"]

export const useMapStore = create<MapState>((set) => ({
  selectedCounty: null,
  activeLayers: new Set<DataSource>(DEFAULT_LAYERS),
  dataCache: new Map(),
  queryText: "",
  queryLoading: false,

  selectCounty: (fips) => set({ selectedCounty: fips }),

  toggleLayer: (source) =>
    set((state) => {
      const next = new Set(state.activeLayers)
      if (next.has(source)) {
        next.delete(source)
      } else {
        next.add(source)
      }
      return { activeLayers: next }
    }),

  setLayerActive: (source, active) =>
    set((state) => {
      const next = new Set(state.activeLayers)
      if (active) next.add(source)
      else next.delete(source)
      return { activeLayers: next }
    }),

  updateDataCache: (source, result) =>
    set((state) => {
      const next = new Map(state.dataCache)
      next.set(source, { result, timestamp: Date.now() })
      return { dataCache: next }
    }),

  setQueryText: (text) => set({ queryText: text }),
  setQueryLoading: (loading) => set({ queryLoading: loading }),
}))
