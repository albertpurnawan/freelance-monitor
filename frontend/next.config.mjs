/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
    return {
      beforeFiles: [
        // Proxy only selected endpoints to backend; leave others to Next API routes
        { source: "/api/clients", has: [{ type: 'header', key: 'x-retry', value: '(?<retry>.*)' }], destination: `${backendUrl}/api/clients` },
        { source: "/api/clients/:path*", destination: `${backendUrl}/api/clients/:path*` },
        { source: "/api/services", destination: `${backendUrl}/api/services` },
        { source: "/api/services/:path*", destination: `${backendUrl}/api/services/:path*` },
        { source: "/api/offers", destination: `${backendUrl}/api/offers` },
        { source: "/api/offers/:path*", destination: `${backendUrl}/api/offers/:path*` },
        { source: "/api/reports/monthly", destination: `${backendUrl}/api/reports/monthly` },
        { source: "/api/reports/monthly/:path*", destination: `${backendUrl}/api/reports/monthly/:path*` },
        { source: "/api/alerts/:path*", destination: `${backendUrl}/api/alerts/:path*` },
        { source: "/api/logs/error", destination: `${backendUrl}/api/logs/error` },
        { source: "/static/:path*", destination: `${backendUrl}/static/:path*` },
      ],
    }
  },
}

export default nextConfig
