import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: 'https://gf-cobrar.onrender.com/api/v1',
  },
}

export default nextConfig
