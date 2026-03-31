/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@arcgis/core"],
  async rewrites() {
    return [
      // NHC doesn't send CORS headers — proxy through Next.js
      {
        source: "/api/proxy/nhc/:path*",
        destination: "https://www.nhc.noaa.gov/:path*",
      },
      // NWPS doesn't send CORS headers — proxy through Next.js
      {
        source: "/api/proxy/nwps/:path*",
        destination: "https://api.water.noaa.gov/nwps/v1/:path*",
      },
      // FEMA NFHL WMS doesn't send CORS headers — proxy through Next.js
      {
        source: "/api/proxy/fema-nfhl/:path*",
        destination:
          "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/:path*",
      },
    ]
  },
}

export default nextConfig
