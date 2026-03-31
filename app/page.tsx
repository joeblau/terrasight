"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { PanelLeft, PanelRight } from "lucide-react"

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
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background">
      {/* Map fills entire viewport */}
      <MapContainer />
      <DataLoader />

      {/* Left sidebar: Layers + Activity Feed */}
      <aside
        className={`absolute left-2 top-2 bottom-2 z-10 w-[260px] rounded-lg border border-sidebar-border bg-sidebar backdrop-blur-sm transition-transform duration-200 ${
          leftOpen ? "translate-x-0" : "-translate-x-[calc(100%+8px)]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3">
            <h1 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Terrasight
            </h1>
            <button
              onClick={() => setLeftOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px bg-sidebar-border" />
          <div className="flex-1 overflow-y-auto">
            <LayerToggle />
            <div className="h-px bg-sidebar-border" />
            <ChangeFeed />
          </div>
        </div>
      </aside>

      {/* Right sidebar: Regional Overview / County Brief */}
      <aside
        className={`absolute right-2 top-2 bottom-2 z-10 w-[280px] rounded-lg border border-sidebar-border bg-sidebar backdrop-blur-sm transition-transform duration-200 ${
          rightOpen ? "translate-x-0" : "translate-x-[calc(100%+8px)]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-end p-2">
            <button
              onClick={() => setRightOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CountyBrief />
          </div>
        </div>
      </aside>

      {/* Toggle buttons when sidebars are collapsed */}
      {!leftOpen && (
        <button
          onClick={() => setLeftOpen(true)}
          className="absolute left-2 top-2 z-10 rounded-lg border border-sidebar-border bg-sidebar p-2 backdrop-blur-sm hover:bg-white/5"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
      {!rightOpen && (
        <button
          onClick={() => setRightOpen(true)}
          className="absolute right-2 top-2 z-10 rounded-lg border border-sidebar-border bg-sidebar p-2 backdrop-blur-sm hover:bg-white/5"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      )}

      {/* Query bar floats at bottom center */}
      <QueryBar />
    </div>
  )
}
