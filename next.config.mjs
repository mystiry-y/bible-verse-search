/** @type {import('next').NextConfig} */
const nextConfig = {
  // Best practice: Enable strict build checks for TypeScript and ESLint.
  // Kept `unoptimized: true` as your package.json targets GitHub Pages.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
