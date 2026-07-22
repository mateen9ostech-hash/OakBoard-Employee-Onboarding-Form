import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
