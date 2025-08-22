import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lrgwsbslfqiwoazmitre.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ments-public.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,
    minimumCacheTTL: 60,
  },
  async headers() {
    return [
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
