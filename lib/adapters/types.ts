export type AdapterResult<T> =
  | { status: "ok"; data: T; fetchedAt: Date }
  | { status: "error"; error: string; staleData?: T; staleSince?: Date }

export interface GeoFeature {
  type: "Feature"
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon" | "LineString"
    coordinates: number[] | number[][] | number[][][] | number[][][][]
  }
  properties: {
    id: string
    source: DataSource
    name: string
    county?: string
    countyFips?: string
    severity?: "low" | "moderate" | "high" | "critical"
    value?: number
    unit?: string
    label?: string
    description?: string
    timestamp?: string
    [key: string]: unknown
  }
}

export interface GeoFeatureCollection {
  type: "FeatureCollection"
  features: GeoFeature[]
}

export type DataSource =
  | "usgs"
  | "fema"
  | "nws"
  | "census"
  | "nhc"
  | "radar"

export interface DataAdapter<T = GeoFeatureCollection> {
  source: DataSource
  displayName: string
  fetch(): Promise<AdapterResult<T>>
  refreshInterval: number // ms
}
