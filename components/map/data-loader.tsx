"use client"

import { useDataSource } from "@/hooks/use-data-source"
import { usgsAdapter } from "@/lib/adapters/usgs"
import { nwsAdapter } from "@/lib/adapters/nws"
import { femaAdapter } from "@/lib/adapters/fema"
import { censusAdapter } from "@/lib/adapters/census"
import { nhcAdapter } from "@/lib/adapters/nhc"

export default function DataLoader() {
  useDataSource(usgsAdapter)
  useDataSource(nwsAdapter)
  useDataSource(femaAdapter)
  useDataSource(censusAdapter)
  useDataSource(nhcAdapter)

  return null
}
