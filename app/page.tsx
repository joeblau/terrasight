"use client"

import dynamic from "next/dynamic"

const MapContainer = dynamic(
  () => import("@/components/map/map-container"),
  { ssr: false }
)
const DataLoader = dynamic(
  () => import("@/components/map/data-loader"),
  { ssr: false }
)
const LayerToggle = dynamic(
  () => import("@/components/panels/layer-toggle"),
  { ssr: false }
)
const CountyBrief = dynamic(
  () => import("@/components/panels/county-brief"),
  { ssr: false }
)
const QueryBar = dynamic(
  () => import("@/components/panels/query-bar"),
  { ssr: false }
)
const ChangeFeed = dynamic(
  () => import("@/components/panels/change-feed"),
  { ssr: false }
)

export default function Page() {
  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#0B1426]">
      <MapContainer />
      <DataLoader />
      <LayerToggle />
      <CountyBrief />
      <QueryBar />
      <ChangeFeed />
    </div>
  )
}
