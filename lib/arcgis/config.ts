import esriConfig from "@arcgis/core/config"

export function initArcGIS() {
  const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
  if (apiKey) {
    esriConfig.apiKey = apiKey
  }
  // Serve assets from public/arcgis-assets (symlinked from node_modules)
  esriConfig.assetsPath = "/arcgis-assets"
}

export const DARK_BASEMAP = "dark-gray-vector"

export const FL_CENTER = { longitude: -82.5, latitude: 27.5 }
export const FL_ZOOM = 7

export const COUNTY_FIPS: Record<string, string> = {
  "12071": "Lee",
  "12015": "Charlotte",
  "12021": "Collier",
  "12115": "Sarasota",
  "12027": "DeSoto",
  "12049": "Hardee",
  "12055": "Highlands",
  "12043": "Glades",
  "12051": "Hendry",
  "12105": "Polk",
  "12081": "Manatee",
  "12057": "Hillsborough",
  "12103": "Pinellas",
  "12097": "Osceola",
}

export const COUNTY_FIPS_LIST = Object.keys(COUNTY_FIPS)
export const COUNTY_CODES = COUNTY_FIPS_LIST.map((f) => f.slice(2))
