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
    ]
  },
}

export default nextConfig
