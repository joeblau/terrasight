"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, PanelLeft, PanelRight } from "lucide-react"
import { useMapStore } from "@/store/map-store"

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
  const selectedCounty = useMapStore((s) => s.selectedCounty)
  const selectCounty = useMapStore((s) => s.selectCounty)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "l" || e.key === "L") setLeftOpen((v) => !v)
      if (e.key === "r" || e.key === "R") setRightOpen((v) => !v)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background">
      {/* Map fills entire viewport */}
      <MapContainer />
      <DataLoader />

      {/* Left sidebar: Layers + Activity Feed */}
      <aside
        className={`absolute left-2 top-2 bottom-2 z-10 w-[260px] rounded-3xl border border-sidebar-border bg-sidebar backdrop-blur-sm transition-transform duration-200 ${
          leftOpen ? "translate-x-0" : "-translate-x-[calc(100%+8px)]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-3xl">
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
          <LayerToggle />
          <div className="h-px bg-sidebar-border" />
          <div className="flex min-h-0 flex-1 flex-col">
            <ChangeFeed />
          </div>
        </div>
      </aside>

      {/* Right sidebar: Regional Overview / County Brief */}
      <aside
        className={`absolute right-2 top-2 bottom-2 z-10 w-[280px] rounded-3xl border border-sidebar-border bg-sidebar backdrop-blur-sm transition-transform duration-200 ${
          rightOpen ? "translate-x-0" : "translate-x-[calc(100%+8px)]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between p-2">
            {selectedCounty ? (
              <button
                onClick={() => selectCounty(null)}
                className="rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
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
          className="absolute left-2 top-2 z-10 rounded-full border border-sidebar-border bg-sidebar p-2 backdrop-blur-sm hover:bg-white/5"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
      {!rightOpen && (
        <button
          onClick={() => setRightOpen(true)}
          className="absolute right-2 top-2 z-10 rounded-full border border-sidebar-border bg-sidebar p-2 backdrop-blur-sm hover:bg-white/5"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      )}

      {/* Query bar floats at bottom center */}
      <QueryBar />
    </div>
  )
}
