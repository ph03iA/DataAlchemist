/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/DataAlchemist' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/DataAlchemist/' : '',
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
}

module.exports = nextConfig 