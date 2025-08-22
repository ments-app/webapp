/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Prefer remotePatterns (domains is still supported but deprecated)
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
