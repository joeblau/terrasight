// Alert severity levels (NWS)
export const ALERT_LEVELS: Record<string, number> = {
  "Extreme": 4,
  "Severe": 3,
  "Moderate": 2,
  "Minor": 1,
  "Unknown": 0,
}

// County populations (2022 ACS estimates) for population weight
export const COUNTY_POPULATIONS: Record<string, number> = {
  "12071": 760822,   // Lee
  "12015": 186847,   // Charlotte
  "12021": 375752,   // Collier
  "12115": 434006,   // Sarasota
  "12027": 37250,    // DeSoto
  "12049": 26938,    // Hardee
  "12055": 101235,   // Highlands
  "12043": 13124,    // Glades
  "12051": 41472,    // Hendry
  "12105": 725046,   // Polk
  "12081": 403253,   // Manatee
  "12057": 1459762,  // Hillsborough
  "12103": 959107,   // Pinellas
  "12097": 388656,   // Osceola
}

export const MAX_COUNTY_POP = Math.max(...Object.values(COUNTY_POPULATIONS))
