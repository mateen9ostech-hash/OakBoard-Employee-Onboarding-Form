import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone/server.js for cPanel Passenger and other
  // self-hosted Node.js deployments. Vercel can still build this project.
  output: 'standalone',
  async redirects() {
    return [
      { source: '/login', destination: '/sign-in', permanent: true },
      { source: '/fill-details', destination: '/workspace', permanent: true },
      { source: '/generate-form', destination: '/workspace', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
    ]
  },
}

export default nextConfig
