"use client"

import { useEffect, useRef } from "react"
import MapView from "@arcgis/core/views/MapView"
import ArcGISMap from "@arcgis/core/Map"
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer"
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer"
import WMSLayer from "@arcgis/core/layers/WMSLayer"
import Graphic from "@arcgis/core/Graphic"
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol"
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol"
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol"
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer"
import Point from "@arcgis/core/geometry/Point"
import Polygon from "@arcgis/core/geometry/Polygon"
import PopupTemplate from "@arcgis/core/PopupTemplate"
import { initArcGIS, DARK_BASEMAP, FL_CENTER, FL_ZOOM, COUNTY_FIPS } from "@/lib/arcgis/config"
import { useMapStore } from "@/store/map-store"
import type { GeoFeature, DataSource } from "@/lib/adapters/types"

import "@arcgis/core/assets/esri/themes/dark/main.css"

// Brand colors
const ALERT_ORANGE = [255, 107, 53]
const DATA_CYAN = [0, 217, 255]
const DANGER_RED = [255, 69, 58]
const WARNING_YELLOW = [255, 214, 10]
const SUCCESS_GREEN = [48, 209, 88]
const SIGNAL_WHITE = [240, 244, 248]

const SEVERITY_COLORS: Record<string, number[]> = {
  critical: DANGER_RED,
  high: ALERT_ORANGE,
  moderate: WARNING_YELLOW,
  low: SUCCESS_GREEN,
}

function getMarkerSymbol(severity: string, size: number = 8) {
  const color = SEVERITY_COLORS[severity] ?? DATA_CYAN
  return new SimpleMarkerSymbol({
    color: [...color, 0.85],
    outline: { color: [255, 255, 255, 0.6], width: 1 },
    size,
  })
}

function getAlertFillSymbol(severity: string) {
  const color = SEVERITY_COLORS[severity] ?? DATA_CYAN
  return new SimpleFillSymbol({
    color: [...color, 0.15],
    outline: { color: [...color, 0.6], width: 1.5 },
  })
}

// Track initialization globally to survive React strict mode double-mount
let mapInitialized = false

export default function MapContainer() {
  const mapDiv = useRef<HTMLDivElement>(null)
  const viewRef = useRef<MapView | null>(null)
  const layersRef = useRef<Map<DataSource, GraphicsLayer>>(new Map())
  const radarLayerRef = useRef<WMSLayer | null>(null)

  const dataCache = useMapStore((s) => s.dataCache)
  const activeLayers = useMapStore((s) => s.activeLayers)
  const selectCounty = useMapStore((s) => s.selectCounty)

  // Initialize map (once, survives strict mode)
  useEffect(() => {
    if (!mapDiv.current || mapInitialized) return
    mapInitialized = true

    initArcGIS()

    const map = new ArcGISMap({ basemap: DARK_BASEMAP })

    // County boundaries layer
    const countyLayer = new GeoJSONLayer({
      url: "/data/counties.geojson",
      title: "County Boundaries",
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          color: [0, 0, 0, 0],
          outline: new SimpleLineSymbol({
            color: [...SIGNAL_WHITE, 0.3],
            width: 1.5,
          }),
        }),
      }),
      popupTemplate: new PopupTemplate({
        title: "{NAME} County",
        content: "FIPS: {GEOID}",
      }),
    })
    map.add(countyLayer)

    // NEXRAD radar overlay (Iowa State Mesonet WMS)
    const radarLayer = new WMSLayer({
      url: "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi",
      sublayers: [{ name: "nexrad-n0q-900913" }],
      title: "radar",
      opacity: 0.5,
      visible: true,
    })
    map.add(radarLayer)
    radarLayerRef.current = radarLayer

    // Create graphics layers for each data source
    const sources: DataSource[] = ["usgs", "fema", "nws", "census", "nhc", "fema-declarations"]
    for (const source of sources) {
      const layer = new GraphicsLayer({ title: source })
      layersRef.current.set(source, layer)
      map.add(layer)
    }

    const view = new MapView({
      container: mapDiv.current,
      map,
      center: [FL_CENTER.longitude, FL_CENTER.latitude],
      zoom: FL_ZOOM,
      ui: { components: [] },
      popup: {
        dockEnabled: false,
      },
    })

    view.when(
      () => console.log("MapView ready"),
      (err: Error) => console.error("MapView failed to load:", err)
    )

    // Handle county clicks
    view.on("click", async (event) => {
      const hitResult = await view.hitTest(event)
      const countyHit = hitResult.results.find(
        (r) => "graphic" in r && r.graphic.layer === countyLayer
      )
      if (countyHit && "graphic" in countyHit) {
        const fips = countyHit.graphic.attributes?.GEOID
        if (fips && COUNTY_FIPS[fips]) {
          useMapStore.getState().selectCounty(fips)
        }
      }
    })

    view.watch("fatalError", (error) => {
      if (error) console.error("MapView fatal error:", error)
    })

    viewRef.current = view

    // No cleanup — ArcGIS MapView doesn't survive destroy/recreate
    // The global flag prevents double initialization from React strict mode
  }, [])

  // Update layer graphics when data changes
  useEffect(() => {
    if (radarLayerRef.current) {
      radarLayerRef.current.visible = activeLayers.has("radar")
    }

    for (const [source, layer] of layersRef.current) {
      layer.visible = activeLayers.has(source)

      const entry = dataCache.get(source)
      if (!entry || entry.result.status !== "ok") continue

      const features = entry.result.data.features
      layer.removeAll()

      for (const feature of features) {
        const graphic = featureToGraphic(feature, source)
        if (graphic) layer.add(graphic)
      }
    }
  }, [dataCache, activeLayers])

  return (
    <div
      ref={mapDiv}
      className="absolute inset-0 bg-background"
    />
  )
}

function featureToGraphic(
  feature: GeoFeature,
  source: DataSource
): Graphic | null {
  const { geometry, properties } = feature
  const severity = properties.severity ?? "low"

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as number[]
    if (lng === 0 && lat === 0) return null

    return new Graphic({
      geometry: new Point({ longitude: lng, latitude: lat }),
      symbol: getMarkerSymbol(
        severity,
        source === "nhc" ? 14 : 8
      ),
      attributes: properties,
      popupTemplate: new PopupTemplate({
        title: properties.name,
        content: properties.description ?? "",
      }),
    })
  }

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    const rings =
      geometry.type === "Polygon"
        ? (geometry.coordinates as number[][][])
        : (geometry.coordinates as number[][][][]).flat()

    return new Graphic({
      geometry: new Polygon({ rings }),
      symbol: getAlertFillSymbol(severity),
      attributes: properties,
      popupTemplate: new PopupTemplate({
        title: properties.name,
        content: properties.description ?? "",
      }),
    })
  }

  return null
}
