import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: 'https://gf-cobrar-production.up.railway.app/api/v1',
  },
}

export default nextConfig
