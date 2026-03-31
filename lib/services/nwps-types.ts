export interface NwpsGaugeDetail {
  lid: string
  usgsId: string
  reachId: string
  name: string
  description: string
  county: string
  state: { abbreviation: string; name: string }
  rfc: { abbreviation: string; name: string }
  wfo: { abbreviation: string; name: string }
  timeZone: string
  latitude: number
  longitude: number
  pedts: { observed: string; forecast: string }
  status: {
    observed: NwpsStatusReading
    forecast: NwpsStatusReading
  }
  flood: NwpsFloodData
  images: NwpsImages
  dataAttribution: NwpsAttribution[]
  inService: { enabled: boolean; message: string }
  lowThreshold: { units: string; value: number }
  datums: NwpsDatums
}

export interface NwpsStatusReading {
  primary: number
  primaryUnit: string
  secondary: number
  secondaryUnit: string
  floodCategory: string
  validTime: string
}

export interface NwpsFloodData {
  stageUnits: string
  flowUnits: string
  categories: {
    action: { stage: number; flow: number } | null
    minor: { stage: number; flow: number } | null
    moderate: { stage: number; flow: number } | null
    major: { stage: number; flow: number } | null
  }
  crests: {
    historic: NwpsCrest[]
    recent: NwpsCrest[]
  }
  lowWaters: {
    historic: NwpsLowWater[]
  }
  impacts: NwpsFloodImpact[]
}

export interface NwpsCrest {
  occurredTime: string
  stage: number
  flow: number
  preliminary: string
  olddatum: boolean
}

export interface NwpsLowWater {
  occurredTime: string
  stage: number
  flow: number
  statement: string
}

export interface NwpsFloodImpact {
  stage: number
  statement: string
}

export interface NwpsImages {
  hydrograph: { default: string; floodcat: string }
  probability: {
    weekint: { stage: string; flow: string; volume: string }
    entperiod: { stage: string; flow: string; volume: string }
    shortrange: string
  }
}

export interface NwpsAttribution {
  abbrev: string
  text: string
  title: string
  url: string
}

export interface NwpsDatums {
  vertical: { value: NwpsDatumValue[] }
  horizontal: { value: NwpsDatumValue[] }
  notes: { value: string[] }
}

export interface NwpsDatumValue {
  label: string
  abbrev: string
  description: string
  value: number
}

export interface NwpsStageflowEntry {
  validTime: string
  generatedTime: string
  primary: number | null
  secondary: number | null
}

export interface NwpsStageflowData {
  data: NwpsStageflowEntry[]
}

export interface NwpsStageflowAll {
  observed: NwpsStageflowData
  forecast: NwpsStageflowData
}

export interface NwpsRatingEntry {
  stage: number
  flow: number
}

export interface NwpsRatingCurve {
  ratings: NwpsRatingEntry[]
}

export type NwmSeries =
  | "analysis_assimilation"
  | "short_range"
  | "medium_range"
  | "long_range"
  | "medium_range_blend"

export interface NwpsReach {
  reachId: string
  name: string
  latitude: number
  longitude: number
  route: { reachId: string; streamOrder: number }[]
  upstreamGauges: string[]
  downstreamGauges: string[]
}

export interface NwpsStreamflowEntry {
  validTime: string
  value: number | null
}

export interface NwpsStreamflowData {
  reachId: string
  series: string
  data: NwpsStreamflowEntry[]
}

export interface NwpsMonitorStatus {
  [key: string]: unknown
}
